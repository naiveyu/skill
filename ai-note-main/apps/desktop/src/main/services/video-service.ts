import { spawn } from 'child_process'
import os from 'os'
import path from 'path'
import { logger } from '../utils/logger'

// Electron GUI apps on macOS get a minimal PATH; add common binary locations.
function getEnhancedEnv(): NodeJS.ProcessEnv {
  const home = os.homedir()
  const extraPaths = [
    path.join(home, '.local', 'bin'),
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
    '/usr/local/bin',
    '/usr/bin',
    '/bin'
  ]
  const currentPath = process.env.PATH || ''
  const merged = [...extraPaths, currentPath].join(path.delimiter)
  return { ...process.env, PATH: merged }
}

/** Parse "HH:MM:SS.ms" string into total seconds */
function parseTimeToSeconds(timeStr: string): number {
  const parts = timeStr.split(':')
  if (parts.length !== 3) return 0
  const h = parseInt(parts[0], 10)
  const m = parseInt(parts[1], 10)
  const s = parseFloat(parts[2])
  return h * 3600 + m * 60 + s
}

/** Build output file path: {dir}/{basename}_clip_{mmss_start}-{mmss_end}.{ext} */
export function buildOutputPath(inputPath: string, startSec: number, endSec: number): string {
  const dir = path.dirname(inputPath)
  const ext = path.extname(inputPath)
  const base = path.basename(inputPath, ext)
  const fmt = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${String(m).padStart(2, '0')}${String(sec).padStart(2, '0')}`
  }
  return path.join(dir, `${base}_clip_${fmt(startSec)}-${fmt(endSec)}${ext}`)
}

export class VideoService {
  /** Check if system FFmpeg is available */
  async checkFfmpegAvailable(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const child = spawn('ffmpeg', ['-version'], {
          stdio: ['ignore', 'pipe', 'pipe'],
          shell: process.platform === 'win32',
          env: getEnhancedEnv(),
          timeout: 5000
        })
        child.on('close', (code) => resolve(code === 0))
        child.on('error', () => resolve(false))
      } catch {
        resolve(false)
      }
    })
  }

  /**
   * Trim video using FFmpeg.
   * Uses -c copy for fast lossless trim when the container supports it.
   * Progress is parsed from FFmpeg's stderr output.
   */
  async trim(
    inputPath: string,
    startSec: number,
    endSec: number,
    outputPath: string,
    onProgress: (percent: number) => void,
    onComplete: (outputPath: string) => void,
    onError: (message: string) => void
  ): Promise<void> {
    const duration = endSec - startSec
    if (duration <= 0) {
      onError('Invalid range: end must be after start')
      return
    }

    logger.info(`Video trim: ${inputPath} [${startSec}s -> ${endSec}s] -> ${outputPath}`)

    const args = [
      '-y',                         // overwrite output
      '-i', inputPath,
      '-ss', String(startSec),
      '-to', String(endSec),
      '-c', 'copy',                 // lossless, fast
      '-avoid_negative_ts', 'make_zero',
      outputPath
    ]

    const child = spawn('ffmpeg', args, {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      env: getEnhancedEnv()
    })

    let errorOutput = ''

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString()
      errorOutput += text

      // Parse progress: FFmpeg writes "time=HH:MM:SS.ms" to stderr
      const match = text.match(/time=(\d+:\d+:[\d.]+)/)
      if (match) {
        const elapsed = parseTimeToSeconds(match[1])
        const percent = Math.min(100, Math.round((elapsed / duration) * 100))
        onProgress(percent)
      }
    })

    child.on('close', (code) => {
      if (code === 0) {
        onProgress(100)
        onComplete(outputPath)
        logger.info('Video trim completed:', outputPath)
      } else {
        // Extract last meaningful error line from FFmpeg output
        const lines = errorOutput.split('\n').filter((l) => l.trim())
        const errLine = lines.slice(-3).join(' ')
        onError(`FFmpeg exited with code ${code}: ${errLine}`)
        logger.error('Video trim failed:', errLine)
      }
    })

    child.on('error', (err) => {
      onError(`Failed to start FFmpeg: ${err.message}`)
      logger.error('FFmpeg spawn error:', err)
    })
  }
}
