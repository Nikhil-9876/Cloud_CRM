import { fetchAuthSession } from 'aws-amplify/auth'

const API_URL = import.meta.env.VITE_API_URL

/**
 * Build request headers including the Cognito ID token as Bearer.
 * The token is attached to every request so Lambda can verify the user.
 */
async function getHeaders() {
  try {
    const session = await fetchAuthSession()
    const idToken = session.tokens?.idToken?.toString()
    return {
      'Content-Type': 'application/json',
      ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
    }
  } catch {
    return { 'Content-Type': 'application/json' }
  }
}

/**
 * Parse the response, throwing a readable error on non-2xx status.
 * Lambda errors now come back as { error: true, message: "...", code: "..." }.
 */
async function handleResponse(res) {
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({
    error: true,
    message: `Server error (HTTP ${res.status})`,
    code: 'PARSE_ERROR',
  }))
  if (!res.ok) {
    // Prefer the normalised `message` field; fall back to legacy string `error`
    const msg =
      data.message ??
      (typeof data.error === 'string' ? data.error : null) ??
      `Request failed (HTTP ${res.status})`
    const err = new Error(msg)
    err.code = data.code ?? `HTTP_${res.status}`
    err.status = res.status
    throw err
  }
  return data
}

/**
 * Wrap fetch so that a network failure (no internet, DNS error, CORS) gives
 * a human-readable error instead of a cryptic TypeError.
 */
async function safeFetch(url, options) {
  try {
    return await fetch(url, options)
  } catch (networkErr) {
    const err = new Error('Network error — check your internet connection')
    err.code = 'NETWORK_ERROR'
    err.status = 0
    throw err
  }
}

/**
 * Thin HTTP client for API Gateway.
 * Usage examples:
 *   api.get('/contacts')
 *   api.post('/contacts', { first_name: 'Jane', last_name: 'Doe' })
 *   api.put('/contacts/abc123', { email: 'new@email.com' })
 *   api.delete('/contacts/abc123')
 */
export const api = {
  async get(path) {
    const res = await safeFetch(`${API_URL}${path}`, {
      headers: await getHeaders(),
    })
    return handleResponse(res)
  },

  async post(path, body = {}) {
    const res = await safeFetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(body),
    })
    return handleResponse(res)
  },

  async put(path, body = {}) {
    const res = await safeFetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(body),
    })
    return handleResponse(res)
  },

  async delete(path) {
    const res = await safeFetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    })
    return handleResponse(res)
  },
}
