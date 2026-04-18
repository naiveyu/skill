import path from 'path'
import Database from 'better-sqlite3'
import { CONFIG_DIR, DB_FILE } from '@shared/constants'
import { Tag } from '@shared/types/ipc'
import { logger } from '../utils/logger'

export class DbService {
  private db: Database.Database

  constructor(workspacePath: string) {
    const dbPath = path.join(workspacePath, CONFIG_DIR, DB_FILE)
    this.db = new Database(dbPath)

    // Enable WAL mode for better concurrent read performance
    this.db.pragma('journal_mode = WAL')

    this.createTables()
    logger.info('Database initialized at', dbPath)
  }

  private createTables(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL DEFAULT '',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        content_hash TEXT NOT NULL DEFAULT ''
      );

      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT
      );

      CREATE TABLE IF NOT EXISTS note_tags (
        note_id TEXT NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (note_id, tag_id),
        FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      );
    `)
  }

  upsertNote(
    id: string,
    title: string,
    createdAt: number,
    updatedAt: number,
    contentHash: string
  ): void {
    const stmt = this.db.prepare(`
      INSERT INTO notes (id, title, created_at, updated_at, content_hash)
      VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        title = excluded.title,
        updated_at = excluded.updated_at,
        content_hash = excluded.content_hash
    `)
    stmt.run(id, title, createdAt, updatedAt, contentHash)
  }

  deleteNote(noteId: string): void {
    const deleteNoteTags = this.db.prepare('DELETE FROM note_tags WHERE note_id = ?')
    const deleteNote = this.db.prepare('DELETE FROM notes WHERE id = ?')

    const transaction = this.db.transaction(() => {
      deleteNoteTags.run(noteId)
      deleteNote.run(noteId)
    })

    transaction()
  }

  updateNoteTags(noteId: string, tagNames: string[]): void {
    const deleteExisting = this.db.prepare('DELETE FROM note_tags WHERE note_id = ?')
    const ensureTag = this.db.prepare(`
      INSERT INTO tags (name) VALUES (?)
      ON CONFLICT(name) DO NOTHING
    `)
    const getTagId = this.db.prepare('SELECT id FROM tags WHERE name = ?')
    const insertNoteTag = this.db.prepare('INSERT INTO note_tags (note_id, tag_id) VALUES (?, ?)')

    const transaction = this.db.transaction(() => {
      deleteExisting.run(noteId)

      for (const tagName of tagNames) {
        ensureTag.run(tagName)
        const tag = getTagId.get(tagName) as { id: number } | undefined
        if (tag) {
          insertNoteTag.run(noteId, tag.id)
        }
      }
    })

    transaction()
  }

  getAllTags(): Tag[] {
    const stmt = this.db.prepare(`
      SELECT t.id, t.name, t.color, COUNT(nt.note_id) as count
      FROM tags t
      LEFT JOIN note_tags nt ON t.id = nt.tag_id
      GROUP BY t.id, t.name, t.color
      ORDER BY t.name
    `)
    return stmt.all() as Tag[]
  }

  getNotesByTag(tagName: string): string[] {
    const stmt = this.db.prepare(`
      SELECT nt.note_id
      FROM note_tags nt
      JOIN tags t ON nt.tag_id = t.id
      WHERE t.name = ?
    `)
    const rows = stmt.all(tagName) as { note_id: string }[]
    return rows.map((row) => row.note_id)
  }

  close(): void {
    this.db.close()
    logger.info('Database closed')
  }
}
