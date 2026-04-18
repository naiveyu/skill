export interface GitCommit {
  sha: string
  message: string
  author: { name: string; email: string; timestamp: number }
}

export interface GitDiff {
  additions: number
  deletions: number
  hunks: DiffHunk[]
}

export interface DiffHunk {
  oldStart: number
  oldLines: number
  newStart: number
  newLines: number
  lines: string[]
}

export interface GitStatus {
  branch: string
  staged: string[]
  unstaged: string[]
  untracked: string[]
}
