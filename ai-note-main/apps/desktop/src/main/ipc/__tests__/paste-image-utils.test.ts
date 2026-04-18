import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import fs from 'fs/promises'
import path from 'path'
import os from 'os'
import { getNextPasteFilename, IMAGE_EXTENSIONS } from '../paste-image-utils'

describe('paste-image-utils', () => {
  let tmpDir: string

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'paste-img-test-'))
  })

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true })
  })

  describe('IMAGE_EXTENSIONS', () => {
    it('should include common image formats', () => {
      expect(IMAGE_EXTENSIONS.has('.png')).toBe(true)
      expect(IMAGE_EXTENSIONS.has('.jpg')).toBe(true)
      expect(IMAGE_EXTENSIONS.has('.jpeg')).toBe(true)
      expect(IMAGE_EXTENSIONS.has('.gif')).toBe(true)
      expect(IMAGE_EXTENSIONS.has('.webp')).toBe(true)
      expect(IMAGE_EXTENSIONS.has('.bmp')).toBe(true)
      expect(IMAGE_EXTENSIONS.has('.avif')).toBe(true)
    })

    it('should not include non-image formats', () => {
      expect(IMAGE_EXTENSIONS.has('.pdf')).toBe(false)
      expect(IMAGE_EXTENSIONS.has('.docx')).toBe(false)
      expect(IMAGE_EXTENSIONS.has('.txt')).toBe(false)
      expect(IMAGE_EXTENSIONS.has('.mp4')).toBe(false)
    })
  })

  describe('getNextPasteFilename', () => {
    it('should return paste-001.png for empty directory', async () => {
      const result = await getNextPasteFilename(tmpDir, '.png')
      expect(result).toBe('paste-001.png')
    })

    it('should return paste-001.png for non-existent directory', async () => {
      const nonExistent = path.join(tmpDir, 'does-not-exist')
      const result = await getNextPasteFilename(nonExistent, '.png')
      expect(result).toBe('paste-001.png')
    })

    it('should increment from existing paste files', async () => {
      // Create paste-001.png and paste-002.png
      await fs.writeFile(path.join(tmpDir, 'paste-001.png'), '')
      await fs.writeFile(path.join(tmpDir, 'paste-002.png'), '')

      const result = await getNextPasteFilename(tmpDir, '.png')
      expect(result).toBe('paste-003.png')
    })

    it('should find max across mixed extensions', async () => {
      await fs.writeFile(path.join(tmpDir, 'paste-001.png'), '')
      await fs.writeFile(path.join(tmpDir, 'paste-003.jpg'), '')
      await fs.writeFile(path.join(tmpDir, 'paste-002.webp'), '')

      const result = await getNextPasteFilename(tmpDir, '.png')
      expect(result).toBe('paste-004.png')
    })

    it('should use the provided extension', async () => {
      const result = await getNextPasteFilename(tmpDir, '.jpg')
      expect(result).toBe('paste-001.jpg')
    })

    it('should ignore non-paste files', async () => {
      await fs.writeFile(path.join(tmpDir, 'screenshot.png'), '')
      await fs.writeFile(path.join(tmpDir, 'photo.jpg'), '')
      await fs.writeFile(path.join(tmpDir, 'README.md'), '')

      const result = await getNextPasteFilename(tmpDir, '.png')
      expect(result).toBe('paste-001.png')
    })

    it('should handle high sequence numbers', async () => {
      await fs.writeFile(path.join(tmpDir, 'paste-099.png'), '')

      const result = await getNextPasteFilename(tmpDir, '.png')
      expect(result).toBe('paste-100.png')
    })

    it('should pad sequence numbers to 3 digits', async () => {
      const result = await getNextPasteFilename(tmpDir, '.png')
      expect(result).toMatch(/^paste-\d{3}\.png$/)
    })

    it('should handle sequential calls correctly', async () => {
      // Simulate multiple pastes by creating files between calls
      const r1 = await getNextPasteFilename(tmpDir, '.png')
      expect(r1).toBe('paste-001.png')
      await fs.writeFile(path.join(tmpDir, r1), '')

      const r2 = await getNextPasteFilename(tmpDir, '.png')
      expect(r2).toBe('paste-002.png')
      await fs.writeFile(path.join(tmpDir, r2), '')

      const r3 = await getNextPasteFilename(tmpDir, '.png')
      expect(r3).toBe('paste-003.png')
    })
  })
})
