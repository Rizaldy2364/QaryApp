import { loadConfig } from '../config.js'
import { createDb } from '../db/index.js'

const TOMBSTONE_RETENTION_DAYS = 90

async function runCleanup(): Promise<void> {
  const config = loadConfig()
  const { db } = createDb(config.databaseUrl)

  try {
    const now = new Date()
    const cutoff = new Date(
      now.getTime() - TOMBSTONE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
    )

    const deletedSessions = await db
      .deleteFrom('sessions')
      .where('expires_at', '<=', now)
      .executeTakeFirst()

    const deletedBookmarks = await db
      .deleteFrom('bookmarks')
      .where('deleted_at', 'is not', null)
      .where('deleted_at', '<', cutoff)
      .executeTakeFirst()

    const deletedFavorites = await db
      .deleteFrom('doa_favorites')
      .where('deleted_at', 'is not', null)
      .where('deleted_at', '<', cutoff)
      .executeTakeFirst()

    console.log(
      `[cleanup] Sesi kedaluwarsa dihapus: ${deletedSessions.numDeletedRows}, bookmark >90 hari dihapus: ${deletedBookmarks.numDeletedRows}, favorit >90 hari dihapus: ${deletedFavorites.numDeletedRows}`,
    )
  } finally {
    await db.destroy()
  }
}

void runCleanup()
