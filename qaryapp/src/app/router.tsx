import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router'
import { TabLayout } from '../components/layout/TabLayout'
import { StackLayout } from '../components/layout/StackLayout'
import { PageSkeleton } from '../components/layout/PageSkeleton'
import { ScrollToTop } from '../components/layout/ScrollToTop'
import { ErrorBoundary } from '../components/feedback/ErrorBoundary'
import { ReminderScheduler } from '../features/notifications/ReminderScheduler'

// Beranda dan NotFound dimuat langsung untuk responsivitas instan
import HomePage from '../pages/home'
import NotFoundPage from '../pages/not-found'

// Rute lainnya di-lazy-load agar tidak membebani bundel awal
const QuranDoaPage = lazy(() => import('../pages/quran-doa'))
const QiblaPage = lazy(() => import('../pages/qibla'))
const DzikirPage = lazy(() => import('../pages/dzikir'))
const BookmarksPage = lazy(() => import('../pages/bookmarks'))
const ProfilePage = lazy(() => import('../pages/profile'))
const SurahListPage = lazy(() => import('../pages/surah-list'))
const SurahDetailPage = lazy(() => import('../pages/surah-detail'))
const DoaListPage = lazy(() => import('../pages/doa-list'))
const DoaDetailPage = lazy(() => import('../pages/doa-detail'))
const LocationPage = lazy(() => import('../pages/location'))
const CountryPage = lazy(() => import('../pages/country'))
const PrayerTimesPage = lazy(() => import('../pages/prayer-times'))
const NotificationsPage = lazy(() => import('../pages/notifications'))
const DataSourcesPage = lazy(() => import('../pages/data-sources'))
const LoginPage = lazy(() => import('../pages/login'))
const RegisterPage = lazy(() => import('../pages/register'))

// Halaman dev hanya diimpor dinamis saat mode dev
const DevComponentsPage = import.meta.env.DEV
  ? lazy(() => import('../pages/dev/components'))
  : null

export function AppRouter() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <ReminderScheduler />
      <ErrorBoundary>
        <Suspense fallback={<PageSkeleton />}>
          <Routes>
          {/* Tab Routes (dengan BottomBar) */}
          <Route element={<TabLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/quran-doa" element={<QuranDoaPage />} />
            <Route path="/kiblat" element={<QiblaPage />} />
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
            <Route path="/masuk" element={<LoginPage />} />
            <Route path="/daftar" element={<RegisterPage />} />
            {import.meta.env.DEV && DevComponentsPage && (
              <Route
                path="/dev/components"
                element={<DevComponentsPage />}
              />
            )}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  </BrowserRouter>
  )
}
