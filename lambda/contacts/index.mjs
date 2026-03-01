import { getUser, respond } from '../shared/auth.mjs'
import { query } from '../shared/db.mjs'

/**
 * Contacts Lambda — handles all /contacts routes:
 *   GET    /contacts
 *   POST   /contacts
 *   GET    /contacts/{id}
 *   PUT    /contacts/{id}
 *   DELETE /contacts/{id}
 *   GET    /contacts/{id}/deals
 *   GET    /contacts/{id}/activities
 *
 * Role-based access:
 *   admin     → sees ALL contacts across all users (isAdmin = true)
 *   sales_rep → sees only their own contacts (isAdmin = false)
 */
export const handler = async (event) => {
  // Handle preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') return respond(200)

  try {
    const { userId, isAdmin } = await getUser(event)
    const method = event.httpMethod
    const resource = event.resource           // e.g. /contacts/{id}/deals
    const id = event.pathParameters?.id ?? null
    const body = event.body ? JSON.parse(event.body) : {}

    // ── GET /contacts ──────────────────────────────────────────────────────
    if (method === 'GET' && resource === '/contacts') {
      const result = await query(
        `SELECT * FROM contacts
         WHERE ($2::boolean = true OR user_id = $1)
         ORDER BY created_at DESC`,
        [userId, isAdmin]
      )
      return respond(200, result.rows)
    }

    // ── POST /contacts ─────────────────────────────────────────────────────
    if (method === 'POST' && resource === '/contacts') {
      const { first_name, last_name, email, phone, company_name, notes } = body
      if (!first_name?.trim() || !last_name?.trim())
        return respond(400, { error: 'first_name and last_name are required' })

      const result = await query(
        `INSERT INTO contacts (user_id, first_name, last_name, email, phone, company_name, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [userId, first_name.trim(), last_name.trim(),
         email || null, phone || null, company_name || null, notes || null]
      )
      return respond(201, result.rows[0])
    }

    // ── GET /contacts/{id} ──────────────────────────────────────────────────
    if (method === 'GET' && resource === '/contacts/{id}') {
      const result = await query(
        `SELECT * FROM contacts
         WHERE id = $1 AND ($3::boolean = true OR user_id = $2)`,
        [id, userId, isAdmin]
      )
      if (!result.rows.length) return respond(404, { error: 'Contact not found' })
      return respond(200, result.rows[0])
    }

    // ── PUT /contacts/{id} ──────────────────────────────────────────────────
    if (method === 'PUT' && resource === '/contacts/{id}') {
      const { first_name, last_name, email, phone, company_name, notes } = body
      const result = await query(
        `UPDATE contacts
           SET first_name=$1, last_name=$2, email=$3,
               phone=$4, company_name=$5, notes=$6
         WHERE id=$7 AND ($8::boolean = true OR user_id = $9) RETURNING *`,
        [first_name, last_name, email || null, phone || null,
         company_name || null, notes || null, id, isAdmin, userId]
      )
      if (!result.rows.length) return respond(404, { error: 'Contact not found' })
      return respond(200, result.rows[0])
    }

    // ── DELETE /contacts/{id} ───────────────────────────────────────────────
    if (method === 'DELETE' && resource === '/contacts/{id}') {
      await query(
        `DELETE FROM contacts WHERE id=$1 AND ($3::boolean = true OR user_id = $2)`,
        [id, userId, isAdmin]
      )
      return respond(204)
    }

    // ── GET /contacts/{id}/deals ─────────────────────────────────────────────
    if (method === 'GET' && resource === '/contacts/{id}/deals') {
      const result = await query(
        `SELECT * FROM deals
         WHERE contact_id=$1 AND ($3::boolean = true OR user_id = $2)
         ORDER BY created_at DESC`,
        [id, userId, isAdmin]
      )
      return respond(200, result.rows)
    }

    // ── GET /contacts/{id}/activities ───────────────────────────────────────
    if (method === 'GET' && resource === '/contacts/{id}/activities') {
      const result = await query(
        `SELECT * FROM activities
         WHERE contact_id=$1 AND ($3::boolean = true OR user_id = $2)
         ORDER BY due_date DESC`,
        [id, userId, isAdmin]
      )
      return respond(200, result.rows)
    }

    return respond(404, { error: 'Route not found' })

  } catch (err) {
    console.error('contacts-lambda error:', err)
    return respond(err.statusCode ?? 500, { error: err.message })
  }
}
