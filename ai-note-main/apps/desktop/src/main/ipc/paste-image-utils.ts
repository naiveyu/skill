import fs from 'fs/promises'

// Supported image extensions for drag & drop filtering
export const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp', '.avif'])

// Get next sequential paste filename in the target directory
export async function getNextPasteFilename(fullDir: string, ext: string): Promise<string> {
  let maxSeq = 0
  try {
    const files = await fs.readdir(fullDir)
    for (const f of files) {
      const match = f.match(/^paste-(\d+)\./)
      if (match) {
        const seq = parseInt(match[1], 10)
        if (seq > maxSeq) maxSeq = seq
      }
    }
  } catch {
    // Directory doesn't exist yet, start from 0
  }
  const nextSeq = String(maxSeq + 1).padStart(3, '0')
  return `paste-${nextSeq}${ext}`
}
