export interface CsrfCheckInput {
  method: string
  csrfHeader: string | string[] | undefined
  originHeader: string | string[] | undefined
  hostHeader: string | undefined
  forwardedHostHeader?: string | string[] | undefined
  forwardedProtoHeader?: string | string[] | undefined
  protocol: string
  allowedOrigins: string[]
  isDev?: boolean
}

export type CsrfCheckResult =
  | { ok: true }
  | { ok: false; message: string }

function firstHeaderValue(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0]
  return val
}

function isLocalDevOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin)
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false
    const host = parsed.hostname.toLowerCase()
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '[::1]' ||
      host.endsWith('.local') ||
      /^192\.168\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(host)
    )
  } catch {
    return false
  }
}

export function validateCsrfRequest(input: CsrfCheckInput): CsrfCheckResult {
  const method = input.method.toUpperCase()
  if (method === 'GET' || method === 'HEAD') {
    return { ok: true }
  }

  const csrfToken = firstHeaderValue(input.csrfHeader)
  if (csrfToken !== '1') {
    return {
      ok: false,
      message: 'Header keamanan X-QaryApp wajib disertakan',
    }
  }

  const origin = firstHeaderValue(input.originHeader)
  if (origin !== undefined) {
    const normalizedOrigin = origin.trim()
    const isAllowed =
      input.allowedOrigins.includes(normalizedOrigin) ||
      (Boolean(input.isDev) && isLocalDevOrigin(normalizedOrigin))

    const forwardedProto = firstHeaderValue(input.forwardedProtoHeader)?.split(',')[0]?.trim()
    const effectiveProto = forwardedProto || input.protocol

    let isSameHost = false
    if (input.hostHeader) {
      isSameHost =
        normalizedOrigin === `${input.protocol}://${input.hostHeader}` ||
        normalizedOrigin === `${effectiveProto}://${input.hostHeader}`
    }

    const forwardedHost = firstHeaderValue(input.forwardedHostHeader)?.split(',')[0]?.trim()
    if (!isSameHost && forwardedHost) {
      isSameHost = normalizedOrigin === `${effectiveProto}://${forwardedHost}`
    }

    if (!isAllowed && !isSameHost) {
      return {
        ok: false,
        message: 'Origin permintaan tidak diizinkan',
      }
    }
  }

  return { ok: true }
}
