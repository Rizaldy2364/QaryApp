export interface CsrfCheckInput {
  method: string
  csrfHeader: string | string[] | undefined
  originHeader: string | string[] | undefined
  hostHeader: string | undefined
  protocol: string
  allowedOrigins: string[]
}

export type CsrfCheckResult =
  | { ok: true }
  | { ok: false; message: string }

function firstHeaderValue(val: string | string[] | undefined): string | undefined {
  if (Array.isArray(val)) return val[0]
  return val
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
    const isAllowed = input.allowedOrigins.includes(normalizedOrigin)

    let isSameHost = false
    if (input.hostHeader) {
      const expectedSameOrigin = `${input.protocol}://${input.hostHeader}`
      isSameHost = normalizedOrigin === expectedSameOrigin
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
