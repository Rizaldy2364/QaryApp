import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import type { Database } from './types.js'

const { Pool } = pg

export interface DbConnection {
  db: Kysely<Database>
  pool: pg.Pool
}

export function createDb(databaseUrl: string): DbConnection {
  const pool = new Pool({
    connectionString: databaseUrl,
    max: 10,
  })

  const db = new Kysely<Database>({
    dialect: new PostgresDialect({
      pool,
    }),
  })

  return { db, pool }
}
