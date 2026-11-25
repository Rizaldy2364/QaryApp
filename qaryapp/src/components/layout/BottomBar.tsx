import { useLocation, Link } from 'react-router'
import { Home, BookOpen, Compass, Bookmark, User } from 'lucide-react'

interface NavItem {
  name: string
  path: string
  icon: typeof Home
  exact?: boolean
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Beranda', path: '/', icon: Home, exact: true },
  { name: 'Qur\'an & Doa', path: '/quran-doa', icon: BookOpen },
  { name: 'Kiblat', path: '/kiblat', icon: Compass },
  { name: 'Tersimpan', path: '/tersimpan', icon: Bookmark },
  { name: 'Profil', path: '/profil', icon: User },
]

export function BottomBar() {
  const location = useLocation()
  const pathname = location.pathname

  const activeIndex = NAV_ITEMS.findIndex((item) =>
    item.exact ? pathname === item.path : pathname.startsWith(item.path),
  )

  const activeItem = activeIndex !== -1 ? NAV_ITEMS[activeIndex] : null
  const ActiveIcon = activeItem ? activeItem.icon : null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 w-full pointer-events-none lg:hidden transform-gpu backface-hidden">
      <div className="mx-auto max-w-180 relative pointer-events-auto">
        <nav
          aria-label="Menu utama"
          className="relative h-16 w-full bg-surface border-t border-border pb-[env(safe-area-inset-bottom)]"
        >
          {activeIndex !== -1 && (
            <>
              {/* Lekukan melengkung di belakang lingkaran (lebar 84px, kedalaman 28px) */}
              <svg
                width="84"
                height="30"
                viewBox="0 0 84 30"
                fill="none"
                aria-hidden="true"
                className="absolute -top-px pointer-events-none transition-all duration-200 motion-reduce:transition-none"
                style={{
                  left: `calc(${(activeIndex + 0.5) * 20}% - 42px)`,
                }}
              >
                <path
                  d="M 0,0 C 20,0 20,28 42,28 C 64,28 64,0 84,0 L 84,-1 L 0,-1 Z"
                  fill="var(--color-bg)"
                />
                <path
                  d="M 0,0 C 20,0 20,28 42,28 C 64,28 64,0 84,0"
                  stroke="var(--color-border)"
                  strokeWidth="1"
                  fill="none"
                />
              </svg>

              {/* Lingkaran 48px melayang lebih tinggi agar berjarak rapi dari lekukan BottomBar */}
              <div
                aria-hidden="true"
                className="absolute -top-1.5 -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-primary text-primary-fg flex items-center justify-center shadow-sm pointer-events-none transition-all duration-200 motion-reduce:transition-none"
                style={{
                  left: `calc(${(activeIndex + 0.5) * 20}%)`,
                }}
              >
                {ActiveIcon && <ActiveIcon size={24} strokeWidth={1.75} />}
              </div>
            </>
          )}

          <div className="grid h-full grid-cols-5 items-center">
            {NAV_ITEMS.map((item, index) => {
              const isActive = index === activeIndex
              const Icon = item.icon

              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className="flex h-full flex-col items-center justify-end pb-2 pt-1 transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-[10px]"
                >
                  <div
                    className={`flex h-6 w-6 items-center justify-center transition-opacity duration-150 ${
                      isActive ? 'opacity-0' : 'text-text-muted hover:text-text'
                    }`}
                  >
                    <Icon size={24} strokeWidth={1.75} />
                  </div>
                  <span
                    className={`text-[11px] leading-3.5 mt-1 transition-colors ${
                      isActive
                        ? 'font-medium text-primary'
                        : 'font-normal text-text-muted'
                    }`}
                  >
                    {item.name}
                  </span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
