import { useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { Bell, BookOpen, ChevronRight, Moon, Settings2, Sun, Sunrise, Sunset } from 'lucide-react'
import { Header } from '../../components/layout/Header'
import { EmptyState } from '../../components/feedback/EmptyState'
import { Skeleton } from '../../components/feedback/Skeleton'
import { Card } from '../../components/ui/Card'
import { groupNotificationsByDay } from '../../features/notifications/inbox'
import { useNotifications } from '../../features/notifications/useNotifications'
import { usePageTitle } from '../../lib/usePageTitle'
import type { NotificationEntry } from '../../types'

function NotificationIcon({ item }: { item: NotificationEntry }) {
  if (item.type === 'renungan') {
    return <BookOpen className="h-5 w-5" />
  }
  if (item.type === 'dzikir-pagi') {
    return <Sun className="h-5 w-5" />
  }
  if (item.type === 'dzikir-petang') {
    return <Moon className="h-5 w-5" />
  }

  switch (item.ref?.prayerName) {
    case 'subuh':
      return <Sunrise className="h-5 w-5" />
    case 'maghrib':
      return <Sunset className="h-5 w-5" />
    case 'isya':
      return <Moon className="h-5 w-5" />
    default:
      return <Sun className="h-5 w-5" />
  }
}

export function NotificationsPage() {
  usePageTitle('Notifikasi')
  const navigate = useNavigate()
  const { notifications, unreadCount, isLoading, timezone, markAsRead, markAllAsRead } =
    useNotifications()

  const grouped = useMemo(
    () => groupNotificationsByDay(notifications, new Date(), timezone),
    [notifications, timezone],
  )

  const handleRowClick = async (item: NotificationEntry) => {
    if (!item.readAt) {
      await markAsRead(item.id)
    }
    navigate(item.targetRoute)
  }

  return (
    <div className="pb-16">
      <Header title="Notifikasi" showBack={true} />

      <div className="mx-auto max-w-[720px] px-4 pt-4 space-y-6">
        {isLoading ? (
          <div className="space-y-3" role="status" aria-label="Memuat notifikasi">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
            <Skeleton className="h-20 w-full rounded-xl" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="pt-6 space-y-6">
            <EmptyState
              icon={<Bell className="h-8 w-8 text-primary" />}
              title="Belum ada notifikasi"
              description="Pengingat waktu sholat, dzikir, dan renungan harian akan tampil di sini."
            />

            <Link
              to="/jadwal-sholat#pengingat"
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
            >
              <Card interactive className="flex min-h-[56px] items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
                    <Settings2 className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-text">Atur pengingat sholat</span>
                </div>
                <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
              </Card>
            </Link>
          </div>
        ) : (
          <>
            {unreadCount > 0 && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void markAllAsRead()}
                  className="min-h-[44px] px-2 text-xs font-medium text-primary-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-lg cursor-pointer"
                >
                  Tandai semua dibaca
                </button>
              </div>
            )}

            {grouped.map((group) => (
              <section key={group.label} aria-label={group.label} className="space-y-2.5">
                <h2 className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  {group.label}
                </h2>

                <Card className="divide-y divide-border p-0 overflow-hidden">
                  {group.items.map((item) => {
                    const isUnread = item.readAt === null
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => void handleRowClick(item)}
                        className="flex w-full min-h-[64px] items-start gap-3.5 p-4 text-left transition-colors hover:bg-primary-soft/20 active:bg-primary-soft/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
                          <NotificationIcon item={item} />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className={`text-sm truncate text-text ${
                                  isUnread ? 'font-semibold' : 'font-medium'
                                }`}
                              >
                                {item.title}
                              </span>
                              {isUnread && (
                                <span
                                  aria-label="Belum dibaca"
                                  className="h-2 w-2 shrink-0 rounded-full bg-primary"
                                />
                              )}
                            </div>
                            <span className="shrink-0 font-mono text-xs text-text-muted">
                              {item.timeLabel}
                            </span>
                          </div>

                          <p className="mt-1 text-xs leading-relaxed text-text-muted">
                            {item.description}
                          </p>
                        </div>
                      </button>
                    )
                  })}
                </Card>
              </section>
            ))}

            <Link
              to="/jadwal-sholat#pengingat"
              className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
            >
              <Card interactive className="flex min-h-[56px] items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary-ink">
                    <Settings2 className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-medium text-text">Atur pengingat sholat</span>
                </div>
                <ChevronRight className="h-5 w-5 text-text-muted shrink-0" />
              </Card>
            </Link>
          </>
        )}
      </div>
    </div>
  )
}
export default NotificationsPage
