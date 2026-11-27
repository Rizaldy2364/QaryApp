import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useOnlineStatus } from '../../lib/useOnlineStatus'
import {
  deleteUserAccount,
  fetchCurrentUser,
  loginAccount,
  logoutAccount,
  registerAccount,
  type AuthUser,
  type LoginPayload,
  type RegisterPayload,
} from './api'

export const AUTH_ME_QUERY_KEY = ['auth', 'me'] as const

export function useAuth() {
  const queryClient = useQueryClient()
  const isOnline = useOnlineStatus()

  const meQuery = useQuery<AuthUser | null>({
    queryKey: AUTH_ME_QUERY_KEY,
    queryFn: fetchCurrentUser,
    enabled: isOnline,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 60 * 24,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  })

  const registerMutation = useMutation({
    mutationFn: (payload: RegisterPayload) => registerAccount(payload),
  })

  const loginMutation = useMutation({
    mutationFn: (payload: LoginPayload) => loginAccount(payload),
    onSuccess: (user) => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, user)
    },
  })

  const logoutMutation = useMutation({
    mutationFn: () => logoutAccount(),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, null)
    },
  })

  const deleteAccountMutation = useMutation({
    mutationFn: (password: string) => deleteUserAccount(password),
    onSuccess: () => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, null)
    },
  })

  const user = meQuery.data ?? null

  return {
    user,
    isAuthenticated: user !== null,
    isLoading: isOnline && meQuery.isLoading && user === null,
    isOnline,
    register: registerMutation.mutateAsync,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    deleteAccount: deleteAccountMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut: logoutMutation.isPending,
    isDeletingAccount: deleteAccountMutation.isPending,
    markAsGuest: () => {
      queryClient.setQueryData(AUTH_ME_QUERY_KEY, null)
    },
  }
}
