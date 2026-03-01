import { CognitoJwtVerifier } from 'aws-jwt-verify'

/**
 * Verifier is initialised once and caches Cognito's public JWKS.
 * Set COGNITO_USER_POOL_ID and COGNITO_CLIENT_ID in Lambda environment variables.
 */
const verifier = CognitoJwtVerifier.create({
  userPoolId: process.env.COGNITO_USER_POOL_ID,
  tokenUse: 'id',           // we forward the Cognito ID-token from the frontend
  clientId: process.env.COGNITO_CLIENT_ID,
})

/**
 * CORS / preflight headers included in every response.
 * CORS_ORIGIN env var should be your Amplify / CloudFront URL in production.
 */
export const CORS_HEADERS = {
  'Access-Control-Allow-Origin':  process.env.CORS_ORIGIN ?? '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
}

/**
 * Build a standard API Gateway response object.
 * Error bodies are normalised to { error: true, message: "...", code: "..." }.
 */
export function respond(statusCode, body = null) {
  // Normalise error shape so the frontend always gets a consistent format
  if (body && typeof body === 'object' && !Array.isArray(body) && (body.error || statusCode >= 400)) {
    // If the caller passed a plain string under `error`, lift it to `message`
    if (typeof body.error === 'string') {
      body = { error: true, message: body.error, code: body.code ?? httpCodeName(statusCode) }
    } else if (body.message && body.error !== true) {
      body = { error: true, message: body.message, code: body.code ?? httpCodeName(statusCode) }
    }
  }
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
    body: body === null ? '' : JSON.stringify(body),
  }
}

function httpCodeName(code) {
  const names = {
    400: 'BAD_REQUEST', 401: 'UNAUTHORIZED', 403: 'FORBIDDEN',
    404: 'NOT_FOUND', 409: 'CONFLICT', 422: 'UNPROCESSABLE_ENTITY',
    500: 'INTERNAL_ERROR',
  }
  return names[code] ?? `HTTP_${code}`
}

/**
 * Extract and verify the Cognito JWT from the Authorization header.
 * Returns the Cognito user's `sub` (unique user ID) on success.
 * Throws a 401 error if the header is missing or the token is invalid.
 *
 * @param {object} event  API Gateway event object
 * @returns {Promise<string>}  Cognito user sub (used as user_id in DB)
 */
export async function getUserId(event) {
  const authHeader =
    event.headers?.Authorization ||
    event.headers?.authorization ||
    ''

  if (!authHeader.startsWith('Bearer ')) {
    const err = new Error('Missing or invalid Authorization header')
    err.statusCode = 401
    throw err
  }

  try {
    const payload = await verifier.verify(authHeader.slice(7))
    return payload.sub   // Cognito unique user ID
  } catch {
    const err = new Error('Token verification failed')
    err.statusCode = 401
    throw err
  }
}
