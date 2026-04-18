#!/usr/bin/env node
/**
 * Upload release files to Qiniu Cloud (七牛云)
 *
 * Prerequisites:
 *   Set env vars: QINIU_ACCESS_KEY, QINIU_SECRET_KEY
 *
 * Usage:
 *   node scripts/upload-release.mjs
 *   QINIU_BUCKET=my-bucket node scripts/upload-release.mjs
 */

import qiniu from 'qiniu'
import fs from 'node:fs'
import path from 'node:path'

const AK = process.env.QINIU_ACCESS_KEY
const SK = process.env.QINIU_SECRET_KEY
const BUCKET = process.env.QINIU_BUCKET || 'spring-ai'
const DIST_DIR = path.resolve('apps/desktop/dist')

if (!AK || !SK) {
  console.error('ERROR: Set QINIU_ACCESS_KEY and QINIU_SECRET_KEY env vars first.')
  console.error('  export QINIU_ACCESS_KEY="your-ak"')
  console.error('  export QINIU_SECRET_KEY="your-sk"')
  process.exit(1)
}

const mac = new qiniu.auth.digest.Mac(AK, SK)
const config = new qiniu.conf.Config()
config.zone = qiniu.zone.Zone_z0 // 华东

// File patterns to upload
const patterns = ['.yml', '.yaml', '.zip', '.dmg', '.exe', '.blockmap', '.AppImage', '.deb']

const files = fs.readdirSync(DIST_DIR).filter((f) => {
  // Only upload files matching release patterns
  return patterns.some((ext) => f.endsWith(ext))
})

if (files.length === 0) {
  console.error(`ERROR: No release files found in ${DIST_DIR}`)
  console.error('Run "pnpm dist:mac" or "pnpm dist:win" first.')
  process.exit(1)
}

// Only upload the latest version files
const ymlFile = files.find((f) => f === 'latest-mac.yml' || f === 'latest.yml')
let latestVersion = null
if (ymlFile) {
  const content = fs.readFileSync(path.join(DIST_DIR, ymlFile), 'utf-8')
  const match = content.match(/^version:\s*(.+)$/m)
  if (match) latestVersion = match[1].trim()
}

const filesToUpload = files.filter((f) => {
  // Always upload yml files
  if (f.endsWith('.yml') || f.endsWith('.yaml')) return true
  // Only upload files for the latest version
  if (latestVersion && !f.includes(latestVersion)) return false
  return true
})

console.log(`=== Uploading ${filesToUpload.length} files to Qiniu (bucket: ${BUCKET}) ===\n`)

async function uploadFile(filename) {
  const filePath = path.join(DIST_DIR, filename)
  const stat = fs.statSync(filePath)
  const sizeMB = (stat.size / (1024 * 1024)).toFixed(1)

  const putPolicy = new qiniu.rs.PutPolicy({ scope: `${BUCKET}:${filename}` }) // overwrite
  const uploadToken = putPolicy.uploadToken(mac)
  const formUploader = new qiniu.form_up.FormUploader(config)
  const putExtra = new qiniu.form_up.PutExtra()

  return new Promise((resolve, reject) => {
    console.log(`Uploading: ${filename} (${sizeMB} MB)...`)
    formUploader.putFile(uploadToken, filename, filePath, putExtra, (err, body, info) => {
      if (err) {
        console.error(`  FAILED: ${filename} - ${err.message}`)
        reject(err)
        return
      }
      if (info.statusCode === 200) {
        console.log(`  OK: ${filename}`)
        resolve(body)
      } else {
        console.error(`  FAILED: ${filename} - HTTP ${info.statusCode}`)
        reject(new Error(`HTTP ${info.statusCode}: ${JSON.stringify(body)}`))
      }
    })
  })
}

let uploaded = 0
let failed = 0

for (const file of filesToUpload) {
  try {
    await uploadFile(file)
    uploaded++
  } catch {
    failed++
  }
}

console.log(`\n=== Done! Uploaded: ${uploaded}, Failed: ${failed} ===`)
console.log('Update URL: http://releases.sspprriinngg.cn')
if (latestVersion) {
  console.log(`Version: ${latestVersion}`)
}
