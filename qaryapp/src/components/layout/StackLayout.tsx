import { Outlet } from 'react-router'

export function StackLayout() {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <main className="w-full flex-1 pb-8">
        <Outlet />
      </main>
    </div>
  )
}
