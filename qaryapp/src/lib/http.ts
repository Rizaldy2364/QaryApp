export class HttpError extends Error {
  public status?: number
  public isTimeout: boolean
  public isNetwork: boolean

  constructor(
    message: string,
    options?: { status?: number; isTimeout?: boolean; isNetwork?: boolean },
  ) {
    super(message)
    this.name = 'HttpError'
    this.status = options?.status
    this.isTimeout = options?.isTimeout ?? false
    this.isNetwork = options?.isNetwork ?? false
  }
}

export interface FetchOptions extends RequestInit {
  timeoutMs?: number
}

export async function fetchWithTimeout<T>(
  url: string,
  options: FetchOptions = {},
): Promise<T> {
  const { timeoutMs = 10000, signal: externalSignal, ...fetchInit } = options

  const controller = new AbortController()
  let isTimedOut = false

  const timer = setTimeout(() => {
    isTimedOut = true
    controller.abort()
  }, timeoutMs)

  // Tangani pembatalan eksternal bila ada
  if (externalSignal) {
    externalSignal.addEventListener('abort', () => {
      controller.abort()
    })
  }

  try {
    const response = await fetch(url, {
      ...fetchInit,
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new HttpError(
        `Server merespons dengan status ${response.status} (${response.statusText || 'Gagal'})`,
        { status: response.status },
      )
    }

    try {
      const data = (await response.json()) as T
      return data
    } catch {
      throw new HttpError(
        'Format data dari server tidak dapat dibaca atau rusak.',
      )
    }
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      throw error
    }

    if (isTimedOut) {
      throw new HttpError(
        'Waktu koneksi habis (timeout). Silakan periksa jaringan Anda dan coba lagi.',
        { isTimeout: true },
      )
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new HttpError('Permintaan dibatalkan.', { isNetwork: false })
    }

    throw new HttpError(
      'Gagal terhubung ke server. Periksa koneksi internet Anda.',
      { isNetwork: true },
    )
  } finally {
    clearTimeout(timer)
  }
}
