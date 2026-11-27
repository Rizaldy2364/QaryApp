import { buildApp } from './app.js'
import { loadConfig } from './config.js'
import { createDb } from './db/index.js'

async function main(): Promise<void> {
  const config = loadConfig()
  const { db } = createDb(config.databaseUrl)
  const app = await buildApp({ config, db })

  const shutdown = async (signal: string) => {
    app.log.info(`Menerima sinyal ${signal}, menutup server...`)
    await app.close()
    await db.destroy()
    process.exit(0)
  }

  process.on('SIGINT', () => void shutdown('SIGINT'))
  process.on('SIGTERM', () => void shutdown('SIGTERM'))

  try {
    await app.listen({ port: config.port, host: '0.0.0.0' })
  } catch (err) {
    app.log.error(err)
    await db.destroy()
    process.exit(1)
  }
}

void main()
