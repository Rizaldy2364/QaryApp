export interface ApiErrorPayload {
  error?: {
    code?: string
    message?: string
  }
}

export class ApiError extends Error {
  readonly code: string
  readonly status: number

  constructor(code: string, message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.status = status
  }
}

export function normalizeApiError(
  status: number,
  body: unknown,
  fallbackMessage = 'Terjadi kesalahan saat menghubungi server',
): ApiError {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const errObj = (body as ApiErrorPayload).error
    if (errObj && typeof errObj.message === 'string' && errObj.message.trim() !== '') {
      return new ApiError(
        typeof errObj.code === 'string' ? errObj.code : 'API_ERROR',
        errObj.message,
        status,
      )
    }
  }

  if (status === 401) {
    return new ApiError('UNAUTHORIZED', 'Sesi Anda telah berakhir, silakan masuk kembali', 401)
  }
  if (status === 429) {
    return new ApiError('RATE_LIMITED', 'Terlalu banyak percobaan, coba lagi sebentar lagi', 429)
  }
  if (status >= 500) {
    return new ApiError(
      'SERVER_UNAVAILABLE',
      'Server belum aktif atau tidak dapat dihubungi. Pastikan server backend berjalan.',
      status,
    )
  }

  return new ApiError('API_ERROR', fallbackMessage, status)
}

export interface ApiRequestOptions extends Omit<RequestInit, 'body' | 'credentials'> {
  body?: unknown
  timeoutMs?: number
}

const DEFAULT_TIMEOUT_MS = 10_000

export async function apiFetch<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const { body, timeoutMs = DEFAULT_TIMEOUT_MS, headers: customHeaders, ...rest } = options
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)

  const headers = new Headers(customHeaders)
  headers.set('X-QaryApp', '1')
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  try {
    const response = await fetch(`/api${path}`, {
      ...rest,
      headers,
      credentials: 'same-origin',
      signal: controller.signal,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })

    const text = await response.text()
    let parsed: unknown = null
    if (text) {
      try {
        parsed = JSON.parse(text)
      } catch {
        parsed = null
      }
    }

    if (!response.ok) {
      throw normalizeApiError(response.status, parsed)
    }

    return parsed as T
  } catch (err) {
    if (err instanceof ApiError) {
      throw err
    }
    if (err instanceof DOMException && err.name === 'AbortError') {
      throw new ApiError('TIMEOUT', 'Koneksi ke server terlalu lama, coba lagi', 0)
    }
    throw new ApiError('NETWORK_ERROR', 'Tidak dapat terhubung ke server', 0)
  } finally {
    window.clearTimeout(timer)
  }
}
