import fs from 'fs/promises'
import path from 'path'

// Initial empty Excalidraw JSON
const EMPTY_DRAWING = JSON.stringify(
  {
    type: 'excalidraw',
    version: 2,
    source: 'ai-note',
    elements: [],
    appState: {
      viewBackgroundColor: 'transparent',
      gridSize: null
    },
    files: {}
  },
  null,
  2
)

// Get next sequential drawing filename in the target directory
export async function getNextDrawingFilename(fullDir: string): Promise<string> {
  let maxSeq = 0
  try {
    const files = await fs.readdir(fullDir)
    for (const f of files) {
      const match = f.match(/^drawing-(\d+)\.excalidraw$/)
      if (match) {
        const seq = parseInt(match[1], 10)
        if (seq > maxSeq) maxSeq = seq
      }
    }
  } catch {
    // Directory doesn't exist yet, start from 0
  }
  const nextSeq = String(maxSeq + 1).padStart(3, '0')
  return `drawing-${nextSeq}.excalidraw`
}

// Create a new empty drawing file, return its relative path
export async function createDrawingFile(
  workspacePath: string,
  assetsDir: string
): Promise<string> {
  const fullDir = path.join(workspacePath, assetsDir)
  await fs.mkdir(fullDir, { recursive: true })
  const fileName = await getNextDrawingFilename(fullDir)
  const fullPath = path.join(fullDir, fileName)
  await fs.writeFile(fullPath, EMPTY_DRAWING, 'utf-8')
  return path.relative(workspacePath, fullPath)
}
