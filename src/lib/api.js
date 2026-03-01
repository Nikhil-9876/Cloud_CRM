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
 */
async function handleResponse(res) {
  if (res.status === 204) return null
  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }))
  if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
  return data
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
    const res = await fetch(`${API_URL}${path}`, {
      headers: await getHeaders(),
    })
    return handleResponse(res)
  },

  async post(path, body = {}) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: await getHeaders(),
      body: JSON.stringify(body),
    })
    return handleResponse(res)
  },

  async put(path, body = {}) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'PUT',
      headers: await getHeaders(),
      body: JSON.stringify(body),
    })
    return handleResponse(res)
  },

  async delete(path) {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'DELETE',
      headers: await getHeaders(),
    })
    return handleResponse(res)
  },
}
