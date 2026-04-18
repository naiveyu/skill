import path from 'path'
import fs from 'fs/promises'
import git from 'isomorphic-git'
import { structuredPatch } from 'diff'
import { DEFAULT_GITIGNORE } from '@shared/constants'
import { GitCommit, GitDiff, GitStatus } from '@shared/types/ipc'
import { logger } from '../utils/logger'

export class GitService {
  private workspacePath: string
  constructor(workspacePath: string) {
    this.workspacePath = workspacePath
  }

  async initialize(): Promise<void> {
    const gitDir = path.join(this.workspacePath, '.git')

    try {
      await fs.access(gitDir)
      logger.info('Existing git repository found')
    } catch {
      await git.init({ fs: { promises: fs }, dir: this.workspacePath })
      logger.info('Initialized new git repository')
    }

    // Ensure .gitignore exists
    const gitignorePath = path.join(this.workspacePath, '.gitignore')
    try {
      await fs.access(gitignorePath)
    } catch {
      await fs.writeFile(gitignorePath, DEFAULT_GITIGNORE, 'utf-8')
      logger.info('Created .gitignore')
    }
  }

  async stageFile(relativePath: string): Promise<void> {
    await git.add({
      fs: { promises: fs },
      dir: this.workspacePath,
      filepath: relativePath
    })
  }

  async commit(message: string, files?: string[]): Promise<string> {
    if (files && files.length > 0) {
      for (const file of files) {
        try {
          await fs.access(path.join(this.workspacePath, file))
          await git.add({
            fs: { promises: fs },
            dir: this.workspacePath,
            filepath: file
          })
        } catch {
          // File may have been deleted, try remove
          await git.remove({
            fs: { promises: fs },
            dir: this.workspacePath,
            filepath: file
          })
        }
      }
    } else {
      // Stage all changes
      const status = await this.getStatus()
      const allFiles = [...status.unstaged, ...status.untracked]
      for (const file of allFiles) {
        try {
          await fs.access(path.join(this.workspacePath, file))
          await git.add({
            fs: { promises: fs },
            dir: this.workspacePath,
            filepath: file
          })
        } catch {
          await git.remove({
            fs: { promises: fs },
            dir: this.workspacePath,
            filepath: file
          })
        }
      }
    }

    const sha = await git.commit({
      fs: { promises: fs },
      dir: this.workspacePath,
      message,
      author: {
        name: 'INote',
        email: 'inote@local'
      }
    })

    logger.info('Committed:', sha.slice(0, 7), message)
    return sha
  }

  async getHistory(relativePath: string, limit: number = 50): Promise<GitCommit[]> {
    try {
      const commits = await git.log({
        fs: { promises: fs },
        dir: this.workspacePath,
        filepath: relativePath || undefined,
        depth: limit
      })

      return commits.map((entry) => ({
        sha: entry.oid,
        message: entry.commit.message.trim(),
        author: {
          name: entry.commit.author.name,
          email: entry.commit.author.email,
          timestamp: entry.commit.author.timestamp
        }
      }))
    } catch (err) {
      logger.warn('Failed to get git history:', err)
      return []
    }
  }

  async getDiff(sha1: string, sha2: string, relativePath: string): Promise<GitDiff> {
    const oldContent = await this.getFileContentSafe(sha1, relativePath)
    const newContent = await this.getFileContentSafe(sha2, relativePath)

    const patch = structuredPatch(relativePath, relativePath, oldContent, newContent)

    let additions = 0
    let deletions = 0

    const hunks = patch.hunks.map((hunk) => {
      const lines = hunk.lines
      for (const line of lines) {
        if (line.startsWith('+')) additions++
        if (line.startsWith('-')) deletions++
      }
      return {
        oldStart: hunk.oldStart,
        oldLines: hunk.oldLines,
        newStart: hunk.newStart,
        newLines: hunk.newLines,
        lines: hunk.lines
      }
    })

    return { additions, deletions, hunks }
  }

  async getFileContent(sha: string, relativePath: string): Promise<string> {
    const { blob } = await git.readBlob({
      fs: { promises: fs },
      dir: this.workspacePath,
      oid: sha,
      filepath: relativePath
    })
    return new TextDecoder().decode(blob)
  }

  private async getFileContentSafe(sha: string, relativePath: string): Promise<string> {
    try {
      return await this.getFileContent(sha, relativePath)
    } catch {
      return ''
    }
  }

  async saveVersion(relativePath: string, description: string): Promise<string> {
    const fullPath = path.join(this.workspacePath, relativePath)

    // Update the 'updated' timestamp in front matter to ensure a real file change
    let content = await fs.readFile(fullPath, 'utf-8')
    const now = new Date().toISOString()
    content = content.replace(
      /(updated:\s*).+/,
      `$1${now}`
    )
    await fs.writeFile(fullPath, content, 'utf-8')

    // Stage and commit
    await git.add({
      fs: { promises: fs },
      dir: this.workspacePath,
      filepath: relativePath
    })

    const sha = await git.commit({
      fs: { promises: fs },
      dir: this.workspacePath,
      message: description,
      author: {
        name: 'INote',
        email: 'inote@local'
      }
    })

    logger.info('Saved version:', sha.slice(0, 7), description)
    return sha
  }

  async restoreFile(relativePath: string, sha: string): Promise<void> {
    const content = await this.getFileContent(sha, relativePath)
    const fullPath = path.join(this.workspacePath, relativePath)
    await fs.writeFile(fullPath, content, 'utf-8')
    logger.info('Restored file:', relativePath, 'from', sha.slice(0, 7))
  }

  async getStatus(): Promise<GitStatus> {
    const staged: string[] = []
    const unstaged: string[] = []
    const untracked: string[] = []

    const statusMatrix = await git.statusMatrix({
      fs: { promises: fs },
      dir: this.workspacePath
    })

    for (const [filepath, headStatus, workdirStatus, stageStatus] of statusMatrix) {
      // Skip .ai-note directory
      if (filepath.startsWith('.ai-note')) continue

      if (headStatus === 0 && workdirStatus === 2 && stageStatus === 0) {
        // New untracked file
        untracked.push(filepath)
      } else if (headStatus === 0 && workdirStatus === 2 && stageStatus === 2) {
        // New file staged
        staged.push(filepath)
      } else if (headStatus === 1 && workdirStatus === 2 && stageStatus === 1) {
        // Modified but not staged
        unstaged.push(filepath)
      } else if (headStatus === 1 && workdirStatus === 2 && stageStatus === 2) {
        // Modified and staged
        staged.push(filepath)
      } else if (headStatus === 1 && workdirStatus === 0 && stageStatus === 0) {
        // Deleted and staged
        staged.push(filepath)
      } else if (headStatus === 1 && workdirStatus === 0 && stageStatus === 1) {
        // Deleted but not staged
        unstaged.push(filepath)
      }
    }

    let branch = 'main'
    try {
      branch = await git.currentBranch({
        fs: { promises: fs },
        dir: this.workspacePath
      }) || 'main'
    } catch {
      // No commits yet
    }

    return { branch, staged, unstaged, untracked }
  }

  dispose(): void {
    logger.info('Git service disposed')
  }
}
