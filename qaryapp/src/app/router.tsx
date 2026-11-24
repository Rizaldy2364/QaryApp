import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import { TabLayout } from '../components/layout/TabLayout'
import { StackLayout } from '../components/layout/StackLayout'

// Pages
import HomePage from '../pages/home'
import QuranDoaPage from '../pages/quran-doa'
import DzikirPage from '../pages/dzikir'
import BookmarksPage from '../pages/bookmarks'
import ProfilePage from '../pages/profile'
import SurahListPage from '../pages/surah-list'
import SurahDetailPage from '../pages/surah-detail'
import DoaListPage from '../pages/doa-list'
import DoaDetailPage from '../pages/doa-detail'
import LocationPage from '../pages/location'
import CountryPage from '../pages/country'
import PrayerTimesPage from '../pages/prayer-times'
import NotificationsPage from '../pages/notifications'
import DataSourcesPage from '../pages/data-sources'
import NotFoundPage from '../pages/not-found'

// Halaman dev hanya diimpor dinamis saat mode dev, sehingga benar-benar tidak ikut ke build produksi
const DevComponentsPage = import.meta.env.DEV
  ? lazy(() => import('../pages/dev/components'))
  : null

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Tab Routes (dengan BottomBar) */}
        <Route element={<TabLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/quran-doa" element={<QuranDoaPage />} />
          <Route path="/dzikir" element={<DzikirPage />} />
          <Route path="/tersimpan" element={<BookmarksPage />} />
          <Route path="/profil" element={<ProfilePage />} />
        </Route>

        {/* Stack Routes (tanpa BottomBar) */}
        <Route element={<StackLayout />}>
          <Route path="/quran" element={<SurahListPage />} />
          <Route path="/quran/:surahNumber" element={<SurahDetailPage />} />
          <Route path="/doa" element={<DoaListPage />} />
          <Route path="/doa/:doaId" element={<DoaDetailPage />} />
          <Route path="/lokasi" element={<LocationPage />} />
          <Route path="/lokasi/negara" element={<CountryPage />} />
          <Route path="/jadwal-sholat" element={<PrayerTimesPage />} />
          <Route path="/notifikasi" element={<NotificationsPage />} />
          <Route path="/profil/sumber-data" element={<DataSourcesPage />} />
          {import.meta.env.DEV && DevComponentsPage && (
            <Route
              path="/dev/components"
              element={
                <Suspense fallback={null}>
                  <DevComponentsPage />
                </Suspense>
              }
            />
          )}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
