import type { Generated } from 'kysely'

export interface UsersTable {
  id: Generated<string>
  email: string
  display_name: string | null
  password_hash: string
  created_at: Generated<Date>
  updated_at: Generated<Date>
}

export interface SessionsTable {
  id: Generated<string>
  user_id: string
  token_hash: string
  created_at: Generated<Date>
  last_used_at: Generated<Date>
  expires_at: Date
}

export interface BookmarksTable {
  user_id: string
  surah: number
  ayah: number
  created_at: Generated<Date>
  updated_at: Date
  deleted_at: Date | null
}

export interface DoaFavoritesTable {
  user_id: string
  doa_id: string
  created_at: Generated<Date>
  updated_at: Date
  deleted_at: Date | null
}

export interface LastReadTable {
  user_id: string
  surah: number
  ayah: number
  updated_at: Date
}

export interface Database {
  users: UsersTable
  sessions: SessionsTable
  bookmarks: BookmarksTable
  doa_favorites: DoaFavoritesTable
  last_read: LastReadTable
}
