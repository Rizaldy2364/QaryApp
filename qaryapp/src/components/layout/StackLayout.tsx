import { Outlet, useLocation, useNavigationType } from 'react-router'

export function StackLayout() {
  const location = useLocation()
  const navigationType = useNavigationType()
  const animClass =
    navigationType === 'POP' ? 'animate-page-pop' : 'animate-page-push'

  return (
    <div className="min-h-screen overflow-x-hidden bg-bg text-text flex flex-col">
      {/* Skip Link untuk aksesibilitas navigasi papan ketik */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-fg focus:rounded-lg focus:shadow-md focus:outline-none"
      >
        Lewati ke konten
      </a>

      <main
        id="main-content"
        tabIndex={-1}
        className="w-full flex-1 pb-8 focus:outline-none"
      >
        <div key={location.pathname} className={`w-full ${animClass}`}>
          <Outlet />
        </div>
      </main>
    </div>
  )
}
