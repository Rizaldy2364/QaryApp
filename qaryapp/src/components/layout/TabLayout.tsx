import { Outlet } from 'react-router'
import { BottomBar } from './BottomBar'

export function TabLayout() {
  return (
    <div className="min-h-screen bg-bg text-text flex flex-col">
      <main className="w-full flex-1 pb-28">
        <Outlet />
      </main>
      <BottomBar />
    </div>
  )
}
