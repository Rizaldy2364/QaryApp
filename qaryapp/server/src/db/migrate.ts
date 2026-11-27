import { Migrator, type Migration, type MigrationProvider } from 'kysely'
import { loadConfig } from '../config.js'
import { createDb } from './index.js'
import * as initialSchema from './migrations/001_initial_schema.js'

const migrations: Record<string, Migration> = {
  '001_initial_schema': initialSchema,
}

class StaticMigrationProvider implements MigrationProvider {
  async getMigrations(): Promise<Record<string, Migration>> {
    return migrations
  }
}

export function createMigrator(db: ReturnType<typeof createDb>['db']): Migrator {
  return new Migrator({
    db,
    provider: new StaticMigrationProvider(),
  })
}

async function runCli(): Promise<void> {
  const direction = process.argv[2] === 'down' ? 'down' : 'up'
  const config = loadConfig()
  const { db } = createDb(config.databaseUrl)

  try {
    const migrator = createMigrator(db)
    const { error, results } =
      direction === 'down'
        ? await migrator.migrateDown()
        : await migrator.migrateToLatest()

    for (const item of results ?? []) {
      if (item.status === 'Success') {
        console.log(`[migrasi ${direction}] berhasil: ${item.migrationName}`)
      } else if (item.status === 'Error') {
        console.error(`[migrasi ${direction}] gagal: ${item.migrationName}`)
      }
    }

    if (error) {
      console.error('Galat saat menjalankan migrasi:', error)
      process.exitCode = 1
    }
  } finally {
    await db.destroy()
  }
}

const isEntrypoint =
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))

if (isEntrypoint) {
  void runCli()
}
