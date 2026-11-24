import { useEffect, useState, useCallback } from 'react'
import {
  getSettings,
  saveSettings,
  updateSettings as persistUpdateSettings,
  SETTINGS_STORAGE_KEY,
  SETTINGS_CHANGE_EVENT,
} from '../../lib/storage'
import type { AppSettings, UserLocation } from '../../types'

export function useSettings() {
  const [settings, setSettingsState] = useState<AppSettings>(() => getSettings())

  useEffect(() => {
    // Sinkronisasi antar tab melalui StorageEvent
    const handleStorage = (event: StorageEvent) => {
      if (event.key === SETTINGS_STORAGE_KEY) {
        setSettingsState(getSettings())
      }
    }

    // Sinkronisasi dalam tab yang sama melalui CustomEvent
    const handleCustomChange = (event: Event) => {
      const customEvent = event as CustomEvent<AppSettings>
      if (customEvent.detail) {
        setSettingsState(customEvent.detail)
      } else {
        setSettingsState(getSettings())
      }
    }

    window.addEventListener('storage', handleStorage)
    window.addEventListener(SETTINGS_CHANGE_EVENT, handleCustomChange)

    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(SETTINGS_CHANGE_EVENT, handleCustomChange)
    }
  }, [])

  const setSettings = useCallback((newSettings: AppSettings) => {
    saveSettings(newSettings)
    setSettingsState(newSettings)
  }, [])

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    const updated = persistUpdateSettings(partial)
    setSettingsState(updated)
    return updated
  }, [])

  const setLocation = useCallback((location: UserLocation | null) => {
    return updateSettings({ location })
  }, [updateSettings])

  return {
    settings,
    setSettings,
    updateSettings,
    setLocation,
  }
}
