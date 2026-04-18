import type { FastifyInstance } from 'fastify'
import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { getDatabase, persist } from '../db'
import { config } from '../config'
import { logger } from '../utils/logger'

const __dirname = typeof import.meta.dirname === 'string'
  ? import.meta.dirname
  : path.dirname(new URL(import.meta.url).pathname)

const RELEASES_DIR = path.join(__dirname, '..', '..', 'data', 'releases')

function verifyAdminKey(key: string | undefined): boolean {
  return key === config.adminKey
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return 1
    if ((pa[i] || 0) < (pb[i] || 0)) return -1
  }
  return 0
}

function queryRows(db: ReturnType<typeof getDatabase>, sql: string, params?: any[]): Record<string, any>[] {
  const stmt = db.prepare(sql)
  if (params) stmt.bind(params)
  const rows: Record<string, any>[] = []
  while (stmt.step()) {
    rows.push(stmt.getAsObject())
  }
  stmt.free()
  return rows
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export async function releasesRoutes(fastify: FastifyInstance) {
  const db = getDatabase()

  // Create releases table
  db.run(`
    CREATE TABLE IF NOT EXISTS releases (
      id TEXT PRIMARY KEY,
      version TEXT NOT NULL,
      platform TEXT NOT NULL CHECK(platform IN ('darwin', 'win32', 'linux')),
      filename TEXT NOT NULL,
      original_name TEXT NOT NULL,
      file_size INTEGER NOT NULL,
      release_notes TEXT DEFAULT '',
      is_published INTEGER NOT NULL DEFAULT 0,
      download_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      published_at TEXT
    );
  `)
  db.run(`CREATE UNIQUE INDEX IF NOT EXISTS idx_releases_version_platform ON releases(version, platform);`)
  db.run(`CREATE INDEX IF NOT EXISTS idx_releases_published ON releases(is_published, platform);`)
  persist()

  // Ensure releases directory exists
  fs.mkdirSync(RELEASES_DIR, { recursive: true })

  // ========== Admin Endpoints ==========

  // Upload release (multipart)
  fastify.post('/api/admin/releases/upload', async (request, reply) => {
    const { key } = request.query as { key?: string }
    if (!verifyAdminKey(key)) {
      return reply.status(401).send({ message: 'Invalid admin key' })
    }

    const data = await request.file()
    if (!data) {
      return reply.status(400).send({ message: 'No file uploaded' })
    }

    const version = (data.fields.version as any)?.value
    const platform = (data.fields.platform as any)?.value
    const releaseNotes = (data.fields.releaseNotes as any)?.value || ''

    if (!version || !platform) {
      return reply.status(400).send({ message: 'version and platform are required' })
    }

    if (!['darwin', 'win32', 'linux'].includes(platform)) {
      return reply.status(400).send({ message: 'Invalid platform' })
    }

    // Check duplicate
    const existing = queryRows(db,
      'SELECT id FROM releases WHERE version = ? AND platform = ?',
      [version, platform]
    )
    if (existing.length > 0) {
      return reply.status(409).send({ message: `Version ${version} for ${platform} already exists` })
    }

    // Save file
    const ext = path.extname(data.filename)
    const storedFilename = `INote-${version}-${platform}${ext}`
    const filePath = path.join(RELEASES_DIR, storedFilename)

    const chunks: Buffer[] = []
    for await (const chunk of data.file) {
      chunks.push(chunk)
    }
    const fileBuffer = Buffer.concat(chunks)
    fs.writeFileSync(filePath, fileBuffer)

    const id = crypto.randomUUID()
    db.run(
      `INSERT INTO releases (id, version, platform, filename, original_name, file_size, release_notes)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, version, platform, storedFilename, data.filename, fileBuffer.length, releaseNotes]
    )
    persist()

    logger.info(`Release uploaded: ${version} ${platform} (${formatFileSize(fileBuffer.length)})`)

    return {
      success: true,
      release: { id, version, platform, filename: storedFilename, fileSize: fileBuffer.length }
    }
  })

  // List all releases (admin)
  fastify.get('/api/admin/releases', async (request, reply) => {
    const { key } = request.query as { key?: string }
    if (!verifyAdminKey(key)) {
      return reply.status(401).send({ message: 'Invalid admin key' })
    }

    const rows = queryRows(db, 'SELECT * FROM releases ORDER BY created_at DESC')
    return { releases: rows }
  })

  // Toggle publish status
  fastify.put<{ Params: { id: string } }>('/api/admin/releases/:id/publish', async (request, reply) => {
    const { key } = request.query as { key?: string }
    if (!verifyAdminKey(key)) {
      return reply.status(401).send({ message: 'Invalid admin key' })
    }

    const { id } = request.params
    const rows = queryRows(db, 'SELECT is_published FROM releases WHERE id = ?', [id])
    if (!rows.length) {
      return reply.status(404).send({ message: 'Release not found' })
    }

    const newStatus = rows[0].is_published ? 0 : 1
    if (newStatus === 1) {
      db.run('UPDATE releases SET is_published = 1, published_at = datetime(\'now\') WHERE id = ?', [id])
    } else {
      db.run('UPDATE releases SET is_published = 0, published_at = NULL WHERE id = ?', [id])
    }
    persist()

    return { success: true, is_published: newStatus }
  })

  // Delete release
  fastify.delete<{ Params: { id: string } }>('/api/admin/releases/:id', async (request, reply) => {
    const { key } = request.query as { key?: string }
    if (!verifyAdminKey(key)) {
      return reply.status(401).send({ message: 'Invalid admin key' })
    }

    const { id } = request.params
    const rows = queryRows(db, 'SELECT filename FROM releases WHERE id = ?', [id])
    if (!rows.length) {
      return reply.status(404).send({ message: 'Release not found' })
    }

    // Delete file
    const filePath = path.join(RELEASES_DIR, rows[0].filename as string)
    try { fs.unlinkSync(filePath) } catch { /* file may not exist */ }

    db.run('DELETE FROM releases WHERE id = ?', [id])
    persist()

    return { success: true }
  })

  // Update release notes
  fastify.put<{ Params: { id: string } }>('/api/admin/releases/:id/notes', async (request, reply) => {
    const { key } = request.query as { key?: string }
    if (!verifyAdminKey(key)) {
      return reply.status(401).send({ message: 'Invalid admin key' })
    }

    const { id } = request.params
    const { releaseNotes } = request.body as { releaseNotes?: string }

    const rows = queryRows(db, 'SELECT id FROM releases WHERE id = ?', [id])
    if (!rows.length) {
      return reply.status(404).send({ message: 'Release not found' })
    }

    db.run('UPDATE releases SET release_notes = ? WHERE id = ?', [releaseNotes || '', id])
    persist()

    return { success: true }
  })

  // Sync versions from CDN (parse latest-mac.yml / latest.yml)
  fastify.post('/api/admin/releases/sync', async (request, reply) => {
    const { key } = request.query as { key?: string }
    if (!verifyAdminKey(key)) {
      return reply.status(401).send({ message: 'Invalid admin key' })
    }

    const CDN_BASE = 'https://sspprriinngg.cn/releases'
    let synced = 0

    // Parse YAML files from CDN
    const ymlFiles = [
      { url: `${CDN_BASE}/latest-mac.yml`, platform: 'darwin' as const },
      { url: `${CDN_BASE}/latest.yml`, platform: 'win32' as const },
    ]

    for (const { url, platform } of ymlFiles) {
      try {
        const resp = await fetch(url, { signal: AbortSignal.timeout(10000) })
        if (!resp.ok) continue

        const text = await resp.text()
        // Simple YAML parsing for electron-builder format
        const version = text.match(/^version:\s*(.+)$/m)?.[1]?.trim()
        if (!version) continue

        // Parse files section
        const filesBlock = text.split(/^files:/m)[1]
        if (!filesBlock) continue

        // Extract each file entry
        const fileMatches = filesBlock.matchAll(/- url:\s*(.+)\n\s*sha512:.*\n\s*size:\s*(\d+)/g)
        for (const match of fileMatches) {
          const filename = match[1].trim()
          const fileSize = parseInt(match[2], 10)

          // Check if already exists
          const existing = queryRows(db,
            'SELECT id FROM releases WHERE version = ? AND platform = ?',
            [version, platform]
          )
          if (existing.length > 0) continue

          const id = crypto.randomUUID()
          db.run(
            `INSERT INTO releases (id, version, platform, filename, original_name, file_size, release_notes, is_published, download_count)
             VALUES (?, ?, ?, ?, ?, ?, '', 0, 0)`,
            [id, version, platform, filename, filename, fileSize]
          )
          synced++
          logger.info(`Synced release from CDN: ${version} ${platform} (${filename})`)
          break // Only first file per platform
        }
      } catch (err: any) {
        logger.warn(`Failed to sync from ${url}: ${err?.message}`)
      }
    }

    if (synced > 0) persist()

    const totalResult = queryRows(db, 'SELECT COUNT(*) as count FROM releases')
    const total = totalResult[0]?.count || 0

    return { success: true, synced, total }
  })

  // ========== Public Endpoints ==========

  // Check for updates
  fastify.get('/api/updates/check', async (request) => {
    const { version, platform } = request.query as { version?: string; platform?: string }
    if (!version || !platform) {
      return { hasUpdate: false }
    }

    const rows = queryRows(db,
      `SELECT version, release_notes, file_size, filename
       FROM releases
       WHERE is_published = 1 AND platform = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [platform]
    )

    if (!rows.length) return { hasUpdate: false }

    const latest = rows[0]
    if (compareVersions(latest.version as string, version) <= 0) {
      return { hasUpdate: false }
    }

    return {
      hasUpdate: true,
      version: latest.version,
      releaseNotes: latest.release_notes || '',
      fileSize: latest.file_size,
      downloadUrl: `https://sspprriinngg.cn/releases/${latest.filename}`,
    }
  })

  // Download release file
  fastify.get<{ Params: { filename: string } }>('/api/updates/download/:filename', async (request, reply) => {
    const { filename } = request.params
    const filePath = path.join(RELEASES_DIR, filename)

    if (!fs.existsSync(filePath)) {
      return reply.status(404).send({ message: 'File not found' })
    }

    // Increment download count
    db.run('UPDATE releases SET download_count = download_count + 1 WHERE filename = ?', [filename])
    persist()

    const stat = fs.statSync(filePath)
    reply.header('Content-Disposition', `attachment; filename="${filename}"`)
    reply.header('Content-Type', 'application/octet-stream')
    reply.header('Content-Length', stat.size)

    const stream = fs.createReadStream(filePath)
    return reply.send(stream)
  })
}
