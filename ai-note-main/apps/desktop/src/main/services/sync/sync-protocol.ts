import { createHash } from 'crypto'
import path from 'path'
import fs from 'fs/promises'
import matter from 'gray-matter'
import type { NoteManifestEntry, NoteManifest, SyncDelta, SyncConflict } from '@ai-note/shared-types'
import { logger } from '../../utils/logger'

export function computeContentHash(content: string): string {
  return 'sha256:' + createHash('sha256').update(content, 'utf-8').digest('hex')
}

export async function buildManifest(workspacePath: string): Promise<NoteManifest> {
  const manifest: NoteManifest = []
  await scanDir(workspacePath, workspacePath, manifest)
  return manifest
}

async function scanDir(
  basePath: string,
  currentPath: string,
  manifest: NoteManifest
): Promise<void> {
  let entries
  try {
    entries = await fs.readdir(currentPath, { withFileTypes: true })
  } catch {
    return
  }

  for (const entry of entries) {
    const fullPath = path.join(currentPath, entry.name)

    // Skip hidden dirs, .ai-note, node_modules
    if (entry.name.startsWith('.') || entry.name === 'node_modules') {
      continue
    }

    if (entry.isDirectory()) {
      await scanDir(basePath, fullPath, manifest)
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      try {
        const content = await fs.readFile(fullPath, 'utf-8')
        const stat = await fs.stat(fullPath)
        const relativePath = path.relative(basePath, fullPath)
        const parsed = matter(content)

        const title = (parsed.data.title as string) || path.basename(entry.name, '.md')
        const updatedAt = parsed.data.updated
          ? new Date(parsed.data.updated).getTime()
          : stat.mtimeMs

        manifest.push({
          path: relativePath,
          title,
          updatedAt,
          contentHash: computeContentHash(content),
          size: Buffer.byteLength(content, 'utf-8')
        })
      } catch (err) {
        logger.error(`Failed to read file for manifest: ${fullPath}`, err)
      }
    }
  }
}

export function computeDelta(
  localManifest: NoteManifest,
  remoteManifest: NoteManifest
): SyncDelta {
  const localMap = new Map<string, NoteManifestEntry>()
  const remoteMap = new Map<string, NoteManifestEntry>()

  for (const entry of localManifest) {
    localMap.set(entry.path, entry)
  }
  for (const entry of remoteManifest) {
    remoteMap.set(entry.path, entry)
  }

  const toSend: NoteManifestEntry[] = []
  const toReceive: NoteManifestEntry[] = []
  const conflicts: SyncConflict[] = []

  // All unique paths
  const allPaths = new Set([...localMap.keys(), ...remoteMap.keys()])

  for (const p of allPaths) {
    const local = localMap.get(p)
    const remote = remoteMap.get(p)

    if (local && !remote) {
      // Only exists locally → send to remote
      toSend.push(local)
    } else if (!local && remote) {
      // Only exists remotely → receive from remote
      toReceive.push(remote)
    } else if (local && remote) {
      // Exists on both sides
      if (local.contentHash === remote.contentHash) {
        // Already in sync
        continue
      }

      // Content differs → compare timestamps
      if (local.updatedAt > remote.updatedAt) {
        toSend.push(local)
      } else if (remote.updatedAt > local.updatedAt) {
        toReceive.push(remote)
      } else {
        // Same timestamp but different content → conflict
        conflicts.push({
          path: p,
          localEntry: local,
          remoteEntry: remote
        })
      }
    }
  }

  return { toSend, toReceive, conflicts }
}
