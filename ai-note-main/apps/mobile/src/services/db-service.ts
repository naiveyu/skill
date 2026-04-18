import * as SQLite from 'expo-sqlite'
import { CONFIG_DIR, DB_FILE } from '@ai-note/shared-types'
import type { Tag } from '@ai-note/shared-types'

class DbService {
  private db: SQLite.SQLiteDatabase | null = null

  async initialize(workspacePath: string): Promise<void> {
    const dbPath = `${workspacePath}/${CONFIG_DIR}/${DB_FILE}`
    this.db = await SQLite.openDatabaseAsync(dbPath)

    // Create tables
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS notes (
        id TEXT PRIMARY KEY,
        title TEXT,
        created_at INTEGER,
        updated_at INTEGER,
        content_hash TEXT
      );
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
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

  async upsertNote(
    id: string,
    title: string,
    createdAt: number,
    updatedAt: number,
    contentHash: string
  ): Promise<void> {
    if (!this.db) return
    await this.db.runAsync(
      `INSERT INTO notes (id, title, created_at, updated_at, content_hash)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         title = excluded.title,
         updated_at = excluded.updated_at,
         content_hash = excluded.content_hash`,
      [id, title, createdAt, updatedAt, contentHash]
    )
  }

  async deleteNote(noteId: string): Promise<void> {
    if (!this.db) return
    await this.db.withTransactionAsync(async () => {
      await this.db!.runAsync('DELETE FROM note_tags WHERE note_id = ?', [noteId])
      await this.db!.runAsync('DELETE FROM notes WHERE id = ?', [noteId])
    })
  }

  async updateNoteTags(noteId: string, tagNames: string[]): Promise<void> {
    if (!this.db) return
    await this.db.withTransactionAsync(async () => {
      // Remove existing tags for this note
      await this.db!.runAsync('DELETE FROM note_tags WHERE note_id = ?', [noteId])

      for (const name of tagNames) {
        // Ensure tag exists
        await this.db!.runAsync(
          'INSERT OR IGNORE INTO tags (name) VALUES (?)',
          [name]
        )
        // Get tag id
        const tag = await this.db!.getFirstAsync<{ id: number }>(
          'SELECT id FROM tags WHERE name = ?',
          [name]
        )
        if (tag) {
          await this.db!.runAsync(
            'INSERT OR IGNORE INTO note_tags (note_id, tag_id) VALUES (?, ?)',
            [noteId, tag.id]
          )
        }
      }
    })
  }

  async getAllTags(): Promise<Tag[]> {
    if (!this.db) return []
    const rows = await this.db.getAllAsync<Tag>(
      `SELECT t.id, t.name, t.color, COUNT(nt.note_id) as count
       FROM tags t
       LEFT JOIN note_tags nt ON t.id = nt.tag_id
       GROUP BY t.id
       ORDER BY count DESC`
    )
    return rows
  }

  async getNotesByTag(tagName: string): Promise<string[]> {
    if (!this.db) return []
    const rows = await this.db.getAllAsync<{ note_id: string }>(
      `SELECT nt.note_id
       FROM note_tags nt
       JOIN tags t ON nt.tag_id = t.id
       WHERE t.name = ?`,
      [tagName]
    )
    return rows.map((r) => r.note_id)
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync()
      this.db = null
    }
  }
}

export const dbService = new DbService()
