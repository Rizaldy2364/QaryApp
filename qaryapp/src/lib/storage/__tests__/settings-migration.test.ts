import { describe, expect, it } from 'vitest'
import { migrateAppSettings } from '../index'

describe('migrateAppSettings', () => {
  it('mengisi default reminders { enabled: false, mode: "notification" } untuk pengaturan lama', () => {
    const legacy = {
      theme: 'dark' as const,
      arabSize: 'large' as const,
      showTranslation: false,
      showTransliteration: true,
      location: null,
    }

    const migrated = migrateAppSettings(legacy)
    expect(migrated.theme).toBe('dark')
    expect(migrated.arabSize).toBe('large')
    expect(migrated.reminders).toEqual({
      enabled: false,
      mode: 'notification',
    })
  })

  it('mempertahankan pengaturan reminders yang valid bila sudah ada', () => {
    const migrated = migrateAppSettings({
      reminders: {
        enabled: true,
        mode: 'notification-adzan',
      },
    })
    expect(migrated.reminders).toEqual({
      enabled: true,
      mode: 'notification-adzan',
    })
  })
})
