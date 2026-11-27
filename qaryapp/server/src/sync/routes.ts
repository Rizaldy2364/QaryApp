import type { FastifyInstance } from 'fastify'
import { sql, type Kysely } from 'kysely'
import type { AppConfig } from '../config.js'
import type { Database } from '../db/types.js'
import { createRequireAuth } from '../auth/middleware.js'
import {
  clampClientTimestamp,
  deduplicateBookmarksLww,
  deduplicateFavoritesLww,
  type BookmarkSyncInput,
  type DoaFavoriteSyncInput,
} from './merge.js'

interface SyncRoutesDeps {
  db: Kysely<Database>
  config: AppConfig
}

const MAX_SYNC_ITEMS = 500
const DOA_ID_PATTERN = '^[a-zA-Z0-9_-]+$'

export async function registerSyncRoutes(
  app: FastifyInstance,
  { db, config }: SyncRoutesDeps,
): Promise<void> {
  const requireAuth = createRequireAuth(db, config)

  app.get<{
    Querystring: {
      since?: string
    }
  }>(
    '/sync/pull',
    {
      preHandler: requireAuth,
      schema: {
        querystring: {
          type: 'object',
          additionalProperties: false,
          properties: {
            since: { type: 'string', format: 'date-time', maxLength: 64 },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.authUser!.id
      const sinceRaw = request.query.since
      let sinceDate: Date | null = null

      if (sinceRaw) {
        const parsed = new Date(sinceRaw)
        if (Number.isNaN(parsed.getTime())) {
          return reply.status(400).send({
            error: {
              code: 'INVALID_SINCE',
              message: 'Parameter since harus berupa tanggal ISO yang valid',
            },
          })
        }
        sinceDate = parsed
      }

      const serverTime = new Date()

      let bookmarksQuery = db
        .selectFrom('bookmarks')
        .select(['surah', 'ayah', 'created_at', 'updated_at', 'deleted_at'])
        .where('user_id', '=', userId)
        .orderBy('updated_at', 'asc')

      if (sinceDate) {
        bookmarksQuery = bookmarksQuery.where('updated_at', '>', sinceDate)
      }

      let favoritesQuery = db
        .selectFrom('doa_favorites')
        .select(['doa_id', 'created_at', 'updated_at', 'deleted_at'])
        .where('user_id', '=', userId)
        .orderBy('updated_at', 'asc')

      if (sinceDate) {
        favoritesQuery = favoritesQuery.where('updated_at', '>', sinceDate)
      }

      let lastReadQuery = db
        .selectFrom('last_read')
        .select(['surah', 'ayah', 'updated_at'])
        .where('user_id', '=', userId)

      if (sinceDate) {
        lastReadQuery = lastReadQuery.where('updated_at', '>', sinceDate)
      }

      const [bookmarkRows, favoriteRows, lastReadRow] = await Promise.all([
        bookmarksQuery.execute(),
        favoritesQuery.execute(),
        lastReadQuery.executeTakeFirst(),
      ])

      return reply.status(200).send({
        serverTime: serverTime.toISOString(),
        bookmarks: bookmarkRows.map((row) => ({
          surah: row.surah,
          ayah: row.ayah,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
          deleted: row.deleted_at !== null,
        })),
        favorites: favoriteRows.map((row) => ({
          doaId: row.doa_id,
          createdAt: row.created_at.toISOString(),
          updatedAt: row.updated_at.toISOString(),
          deleted: row.deleted_at !== null,
        })),
        lastRead: lastReadRow
          ? {
              surah: lastReadRow.surah,
              ayah: lastReadRow.ayah,
              updatedAt: lastReadRow.updated_at.toISOString(),
            }
          : null,
      })
    },
  )

  app.post<{
    Body: {
      bookmarks?: BookmarkSyncInput[]
      favorites?: DoaFavoriteSyncInput[]
      lastRead?: {
        surah: number
        ayah: number
        updatedAt: string
      } | null
    }
  }>(
    '/sync/push',
    {
      bodyLimit: 256 * 1024,
      preHandler: requireAuth,
      schema: {
        body: {
          type: 'object',
          additionalProperties: false,
          properties: {
            bookmarks: {
              type: 'array',
              maxItems: MAX_SYNC_ITEMS,
              items: {
                type: 'object',
                required: ['surah', 'ayah', 'updatedAt'],
                additionalProperties: false,
                properties: {
                  surah: { type: 'integer', minimum: 1, maximum: 114 },
                  ayah: { type: 'integer', minimum: 1, maximum: 286 },
                  updatedAt: { type: 'string', format: 'date-time', maxLength: 64 },
                  deleted: { type: 'boolean' },
                },
              },
            },
            favorites: {
              type: 'array',
              maxItems: MAX_SYNC_ITEMS,
              items: {
                type: 'object',
                required: ['doaId', 'updatedAt'],
                additionalProperties: false,
                properties: {
                  doaId: {
                    type: 'string',
                    minLength: 1,
                    maxLength: 100,
                    pattern: DOA_ID_PATTERN,
                  },
                  updatedAt: { type: 'string', format: 'date-time', maxLength: 64 },
                  deleted: { type: 'boolean' },
                },
              },
            },
            lastRead: {
              anyOf: [
                { type: 'null' },
                {
                  type: 'object',
                  required: ['surah', 'ayah', 'updatedAt'],
                  additionalProperties: false,
                  properties: {
                    surah: { type: 'integer', minimum: 1, maximum: 114 },
                    ayah: { type: 'integer', minimum: 1, maximum: 286 },
                    updatedAt: { type: 'string', format: 'date-time', maxLength: 64 },
                  },
                },
              ],
            },
          },
        },
      },
    },
    async (request, reply) => {
      const userId = request.authUser!.id
      const rawBookmarks = request.body.bookmarks ?? []
      const rawFavorites = request.body.favorites ?? []
      const rawLastRead = request.body.lastRead ?? null

      const totalCount =
        rawBookmarks.length + rawFavorites.length + (rawLastRead ? 1 : 0)
      if (totalCount > MAX_SYNC_ITEMS) {
        return reply.status(400).send({
          error: {
            code: 'TOO_MANY_ITEMS',
            message: `Maksimal ${MAX_SYNC_ITEMS} item per permintaan sinkronisasi`,
          },
        })
      }

      const serverTime = new Date()
      const bookmarks = deduplicateBookmarksLww(rawBookmarks, serverTime)
      const favorites = deduplicateFavoritesLww(rawFavorites, serverTime)

      await db.transaction().execute(async (trx) => {
        for (const item of bookmarks) {
          await trx
            .insertInto('bookmarks')
            .values({
              user_id: userId,
              surah: item.surah,
              ayah: item.ayah,
              created_at: item.updatedAt,
              updated_at: item.updatedAt,
              deleted_at: item.deleted ? item.updatedAt : null,
            })
            .onConflict((oc) =>
              oc
                .columns(['user_id', 'surah', 'ayah'])
                .doUpdateSet({
                  updated_at: sql`excluded.updated_at`,
                  deleted_at: sql`excluded.deleted_at`,
                })
                .where(sql<boolean>`excluded.updated_at >= bookmarks.updated_at`),
            )
            .execute()
        }

        for (const item of favorites) {
          await trx
            .insertInto('doa_favorites')
            .values({
              user_id: userId,
              doa_id: item.doaId,
              created_at: item.updatedAt,
              updated_at: item.updatedAt,
              deleted_at: item.deleted ? item.updatedAt : null,
            })
            .onConflict((oc) =>
              oc
                .columns(['user_id', 'doa_id'])
                .doUpdateSet({
                  updated_at: sql`excluded.updated_at`,
                  deleted_at: sql`excluded.deleted_at`,
                })
                .where(sql<boolean>`excluded.updated_at >= doa_favorites.updated_at`),
            )
            .execute()
        }

        if (rawLastRead) {
          const clampedLastReadTime = clampClientTimestamp(
            new Date(rawLastRead.updatedAt),
            serverTime,
          )
          await trx
            .insertInto('last_read')
            .values({
              user_id: userId,
              surah: rawLastRead.surah,
              ayah: rawLastRead.ayah,
              updated_at: clampedLastReadTime,
            })
            .onConflict((oc) =>
              oc
                .column('user_id')
                .doUpdateSet({
                  surah: sql`excluded.surah`,
                  ayah: sql`excluded.ayah`,
                  updated_at: sql`excluded.updated_at`,
                })
                .where(sql<boolean>`excluded.updated_at >= last_read.updated_at`),
            )
            .execute()
        }
      })

      return reply.status(200).send({
        serverTime: serverTime.toISOString(),
      })
    },
  )
}
