import {
  CognitoIdentityProviderClient,
  ListUsersCommand,
  AdminUpdateUserAttributesCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import { getUser, respond } from '../shared/auth.mjs'

const cognito = new CognitoIdentityProviderClient({
  region: process.env.AWS_REGION ?? 'us-east-1',
})
const USER_POOL_ID = process.env.COGNITO_USER_POOL_ID

/**
 * Team Lambda — admin-only routes:
 *   GET  /team              ← list all Cognito users with their role
 *   PUT  /team/{username}   ← update a user's custom:role (admin only)
 */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200)

  try {
    const { isAdmin, userId } = await getUser(event)
    if (!isAdmin) return respond(403, { error: 'Admin access required' })

    const method   = event.httpMethod
    const resource = event.resource
    const username = event.pathParameters?.username ?? null
    const body     = event.body ? JSON.parse(event.body) : {}

    // ── GET /team ───────────────────────────────────────────────────────────
    if (method === 'GET' && resource === '/team') {
      const result = await cognito.send(
        new ListUsersCommand({ UserPoolId: USER_POOL_ID, Limit: 60 })
      )
      const users = (result.Users ?? []).map((u) => {
        const attrs = Object.fromEntries((u.Attributes ?? []).map((a) => [a.Name, a.Value]))
        return {
          username:  u.Username,
          email:     attrs.email ?? u.Username,
          role:      attrs['custom:role'] ?? 'sales_rep',
          status:    u.UserStatus,
          created:   u.UserCreateDate,
          sub:       attrs.sub,
        }
      })
      return respond(200, users)
    }

    // ── PUT /team/{username} ────────────────────────────────────────────────
    if (method === 'PUT' && resource === '/team/{username}') {
      const { role } = body
      if (!['admin', 'sales_rep'].includes(role))
        return respond(400, { error: "role must be 'admin' or 'sales_rep'" })

      await cognito.send(new AdminUpdateUserAttributesCommand({
        UserPoolId: USER_POOL_ID,
        Username:   username,
        UserAttributes: [{ Name: 'custom:role', Value: role }],
      }))
      return respond(200, { updated: true, username, role })
    }

    return respond(404, { error: 'Route not found' })

  } catch (err) {
    console.error('team-lambda error:', err)
    return respond(err.statusCode ?? 500, { error: err.message })
  }
}
