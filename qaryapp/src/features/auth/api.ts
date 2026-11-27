import { ApiError, apiFetch } from '../../lib/api-client'

export interface AuthUser {
  id: string
  email: string
  displayName: string | null
  createdAt: string
}

export interface RegisterPayload {
  email: string
  password: string
  displayName?: string
}

export interface LoginPayload {
  email: string
  password: string
}

export async function fetchCurrentUser(): Promise<AuthUser | null> {
  try {
    return await apiFetch<AuthUser>('/auth/me', { method: 'GET' })
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return null
    }
    throw err
  }
}

export async function registerAccount(payload: RegisterPayload): Promise<AuthUser> {
  const res = await apiFetch<{ user: AuthUser }>('/auth/register', {
    method: 'POST',
    body: payload,
  })
  return res.user
}

export async function loginAccount(payload: LoginPayload): Promise<AuthUser> {
  const res = await apiFetch<{ user: AuthUser }>('/auth/login', {
    method: 'POST',
    body: payload,
  })
  return res.user
}

export async function logoutAccount(): Promise<void> {
  await apiFetch<{ ok: boolean }>('/auth/logout', {
    method: 'POST',
  })
}

export async function deleteUserAccount(password: string): Promise<void> {
  await apiFetch<{ ok: boolean }>('/account', {
    method: 'DELETE',
    body: { password },
  })
}
