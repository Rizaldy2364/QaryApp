import { Link, useLocation } from 'react-router'
import { Home, BookOpen, CircleDot, Bookmark, User, Compass } from 'lucide-react'
import { cn } from '../../lib/utils'

// TODO: Desain resmi sidebar desktop belum ada di desain.md, implementasi ini sebagai fallback responsif
interface NavItem {
  name: string
  path: string
  icon: typeof Home
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Beranda', path: '/', icon: Home, exact: true },
  { name: "Al-Qur'an & Doa", path: '/quran-doa', icon: BookOpen },
  { name: 'Dzikir', path: '/dzikir', icon: CircleDot },
  { name: 'Tersimpan', path: '/tersimpan', icon: Bookmark },
  { name: 'Profil', path: '/profil', icon: User },
]

export function DesktopSidebar() {
  const location = useLocation()
  const pathname = location.pathname

  return (
    <aside
      aria-label="Navigasi Desktop"
      className="hidden lg:flex w-60 shrink-0 flex-col border-r border-border bg-surface px-4 py-6 sticky top-0 h-screen"
    >
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-3 mb-8">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-primary-fg shadow-sm">
          <Compass size={22} strokeWidth={2} />
        </div>
        <div>
          <span className="text-lg font-bold tracking-tight text-text">QaryApp</span>
          <span className="block text-[11px] font-medium text-text-muted leading-tight">
            Ibadah & Al-Qur'an
          </span>
        </div>
      </div>

      {/* Navigasi Utama */}
      <nav className="flex-1 space-y-1.5" aria-label="Menu navigasi samping">
        {NAV_ITEMS.map((item) => {
          const isActive = item.exact
            ? pathname === item.path
            : pathname.startsWith(item.path)
          const Icon = item.icon

          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-sm transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                isActive
                  ? 'bg-primary-soft text-primary-ink font-semibold shadow-xs'
                  : 'text-text-muted hover:text-text hover:bg-bg font-medium',
              )}
            >
              <Icon
                size={20}
                strokeWidth={isActive ? 2 : 1.75}
                className={isActive ? 'text-primary' : 'text-text-muted'}
              />
              <span>{item.name}</span>
            </Link>
          )
        })}
      </nav>

      {/* Footer Info */}
      <div className="mt-auto pt-4 border-t border-border px-3 text-xs text-text-muted">
        <p className="font-medium text-text">QaryApp v1.0.0</p>
        <p className="text-[11px] mt-0.5">Tanpa iklan & nirlaba</p>
      </div>
    </aside>
  )
}
