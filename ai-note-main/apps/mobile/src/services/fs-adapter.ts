import * as FileSystem from 'expo-file-system'

// Wraps expo-file-system to provide a Node.js fs/promises-like interface.
// This adapter enables isomorphic-git and ported desktop services to work on mobile.

export interface Stats {
  isFile(): boolean
  isDirectory(): boolean
  isSymbolicLink(): boolean
  size: number
  mtimeMs: number
  type?: string
}

async function readFile(
  filepath: string,
  options?: { encoding?: string } | string
): Promise<string | Uint8Array> {
  const encoding = typeof options === 'string' ? options : options?.encoding
  if (encoding === 'utf8' || encoding === 'utf-8' || !encoding) {
    return await FileSystem.readAsStringAsync(filepath)
  }
  // Binary read for isomorphic-git
  const base64 = await FileSystem.readAsStringAsync(filepath, {
    encoding: FileSystem.EncodingType.Base64,
  })
  const binaryString = atob(base64)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

async function writeFile(
  filepath: string,
  data: string | Uint8Array
): Promise<void> {
  if (typeof data === 'string') {
    await FileSystem.writeAsStringAsync(filepath, data)
  } else {
    // Binary write
    let binary = ''
    for (let i = 0; i < data.length; i++) {
      binary += String.fromCharCode(data[i])
    }
    const base64 = btoa(binary)
    await FileSystem.writeAsStringAsync(filepath, base64, {
      encoding: FileSystem.EncodingType.Base64,
    })
  }
}

async function unlink(filepath: string): Promise<void> {
  await FileSystem.deleteAsync(filepath, { idempotent: true })
}

async function readdir(dirpath: string): Promise<string[]> {
  return await FileSystem.readDirectoryAsync(dirpath)
}

async function mkdir(
  dirpath: string,
  options?: { recursive?: boolean }
): Promise<void> {
  const info = await FileSystem.getInfoAsync(dirpath)
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dirpath, {
      intermediates: options?.recursive ?? true,
    })
  }
}

async function stat(filepath: string): Promise<Stats> {
  const info = await FileSystem.getInfoAsync(filepath, { size: true })
  if (!info.exists) {
    const err = new Error(`ENOENT: no such file or directory, stat '${filepath}'`) as any
    err.code = 'ENOENT'
    throw err
  }
  return {
    isFile: () => !info.isDirectory,
    isDirectory: () => info.isDirectory,
    isSymbolicLink: () => false,
    size: info.size ?? 0,
    mtimeMs: info.modificationTime ? info.modificationTime * 1000 : Date.now(),
    type: info.isDirectory ? 'dir' : 'file',
  }
}

async function lstat(filepath: string): Promise<Stats> {
  return stat(filepath)
}

async function rename(oldPath: string, newPath: string): Promise<void> {
  await FileSystem.moveAsync({ from: oldPath, to: newPath })
}

async function rmdir(dirpath: string): Promise<void> {
  await FileSystem.deleteAsync(dirpath, { idempotent: true })
}

async function readlink(filepath: string): Promise<string> {
  // React Native doesn't support symlinks; return path as-is
  return filepath
}

async function symlink(): Promise<void> {
  // No-op on mobile
}

async function chmod(): Promise<void> {
  // No-op on mobile
}

// The fs adapter object, compatible with isomorphic-git's fs parameter
export const fs = {
  promises: {
    readFile,
    writeFile,
    unlink,
    readdir,
    mkdir,
    stat,
    lstat,
    rename,
    rmdir,
    readlink,
    symlink,
    chmod,
  },
}

export default fs
