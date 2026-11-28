import { Outlet, useLocation } from 'react-router'
import { BottomBar } from './BottomBar'
import { DesktopSidebar } from './DesktopSidebar'

export function TabLayout() {
  const location = useLocation()

  return (
    <div className="min-h-screen bg-bg text-text flex flex-col lg:flex-row">
      {/* Skip Link untuk aksesibilitas navigasi papan ketik */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-fg focus:rounded-lg focus:shadow-md focus:outline-none"
      >
        Lewati ke konten
      </a>

      {/* Navigasi Desktop (layar >= 1024px) */}
      <DesktopSidebar />

      <main
        id="main-content"
        tabIndex={-1}
        className="w-full flex-1 flex flex-col focus:outline-none"
      >
        <div
          key={location.pathname}
          className="w-full flex-1 flex flex-col animate-page-fade"
        >
          <Outlet />
        </div>
      </main>

      {/* Navigasi Ponsel & Tablet (< 1024px) */}
      <BottomBar />
    </div>
  )
}
