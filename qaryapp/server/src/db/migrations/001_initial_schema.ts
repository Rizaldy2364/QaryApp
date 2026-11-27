import { Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('users')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn('email', 'text', (col) => col.notNull().unique())
    .addColumn('display_name', 'text')
    .addColumn('password_hash', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .execute()

  await db.schema
    .createTable('sessions')
    .addColumn('id', 'uuid', (col) =>
      col.primaryKey().defaultTo(sql`gen_random_uuid()`),
    )
    .addColumn('user_id', 'uuid', (col) =>
      col.notNull().references('users.id').onDelete('cascade'),
    )
    .addColumn('token_hash', 'text', (col) => col.notNull().unique())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('last_used_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('expires_at', 'timestamptz', (col) => col.notNull())
    .execute()

  await db.schema
    .createIndex('sessions_user_id_idx')
    .on('sessions')
    .column('user_id')
    .execute()

  await db.schema
    .createIndex('sessions_expires_at_idx')
    .on('sessions')
    .column('expires_at')
    .execute()

  await db.schema
    .createTable('bookmarks')
    .addColumn('user_id', 'uuid', (col) =>
      col.notNull().references('users.id').onDelete('cascade'),
    )
    .addColumn('surah', 'integer', (col) =>
      col.notNull().check(sql`surah >= 1 AND surah <= 114`),
    )
    .addColumn('ayah', 'integer', (col) =>
      col.notNull().check(sql`ayah >= 1 AND ayah <= 286`),
    )
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull())
    .addColumn('deleted_at', 'timestamptz')
    .addPrimaryKeyConstraint('bookmarks_pk', ['user_id', 'surah', 'ayah'])
    .execute()

  await db.schema
    .createIndex('bookmarks_user_updated_idx')
    .on('bookmarks')
    .columns(['user_id', 'updated_at'])
    .execute()

  await db.schema
    .createTable('doa_favorites')
    .addColumn('user_id', 'uuid', (col) =>
      col.notNull().references('users.id').onDelete('cascade'),
    )
    .addColumn('doa_id', 'text', (col) => col.notNull())
    .addColumn('created_at', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`now()`),
    )
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull())
    .addColumn('deleted_at', 'timestamptz')
    .addPrimaryKeyConstraint('doa_favorites_pk', ['user_id', 'doa_id'])
    .execute()

  await db.schema
    .createIndex('doa_favorites_user_updated_idx')
    .on('doa_favorites')
    .columns(['user_id', 'updated_at'])
    .execute()

  await db.schema
    .createTable('last_read')
    .addColumn('user_id', 'uuid', (col) =>
      col.primaryKey().references('users.id').onDelete('cascade'),
    )
    .addColumn('surah', 'integer', (col) =>
      col.notNull().check(sql`surah >= 1 AND surah <= 114`),
    )
    .addColumn('ayah', 'integer', (col) =>
      col.notNull().check(sql`ayah >= 1 AND ayah <= 286`),
    )
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull())
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  await db.schema.dropTable('last_read').ifExists().execute()
  await db.schema.dropTable('doa_favorites').ifExists().execute()
  await db.schema.dropTable('bookmarks').ifExists().execute()
  await db.schema.dropTable('sessions').ifExists().execute()
  await db.schema.dropTable('users').ifExists().execute()
}
