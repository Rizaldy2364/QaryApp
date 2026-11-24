import { Bell } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { EmptyState } from '../../components/feedback/EmptyState'
import { usePageTitle } from '../../lib/usePageTitle'

export function NotificationsPage() {
  usePageTitle('Notifikasi')
  return (
    <div className="pb-16">
      <Header
        title="Notifikasi"
        showBack={true}
      />

      <div className="mx-auto max-w-[720px] px-4 pt-10">
        <EmptyState
          icon={<Bell className="h-8 w-8 text-primary" />}
          title="Belum ada notifikasi"
          description="Pengingat sholat akan hadir di versi berikutnya."
        />
      </div>
    </div>
  )
}
export default NotificationsPage
