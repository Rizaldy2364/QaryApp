import { useState, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './theme-provider'

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 1000 * 60 * 10, // 10 menit bawaan
            gcTime: 1000 * 60 * 60 * 24, // 24 jam di memori
            retry: 2, // Maksimal 2x retry
            refetchOnWindowFocus: false, // Jangan refetch saat tab kembali aktif
            refetchOnReconnect: true, // Revalidasi saat koneksi pulih
          },
        },
      }),
  )

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>{children}</ThemeProvider>
    </QueryClientProvider>
  )
}
