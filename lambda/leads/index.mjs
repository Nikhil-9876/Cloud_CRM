import { getUserId, respond } from '../shared/auth.mjs'
import { query } from '../shared/db.mjs'

/**
 * Leads Lambda — handles all /leads routes:
 *   GET    /leads
 *   POST   /leads
 *   PUT    /leads/{id}
 *   DELETE /leads/{id}
 *   POST   /leads/{id}/convert   ← converts lead to a contact
 */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200)

  try {
    const userId = await getUserId(event)
    const method = event.httpMethod
    const resource = event.resource
    const id = event.pathParameters?.id ?? null
    const body = event.body ? JSON.parse(event.body) : {}

    // ── GET /leads ─────────────────────────────────────────────────────────
    if (method === 'GET' && resource === '/leads') {
      const result = await query(
        `SELECT * FROM leads WHERE user_id=$1 ORDER BY created_at DESC`,
        [userId]
      )
      return respond(200, result.rows)
    }

    // ── POST /leads ────────────────────────────────────────────────────────
    if (method === 'POST' && resource === '/leads') {
      const { name, email, source, status, assigned_to, notes } = body
      if (!name?.trim()) return respond(400, { error: 'name is required' })

      const result = await query(
        `INSERT INTO leads (user_id, name, email, source, status, assigned_to, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [userId, name.trim(), email || null,
         source || 'Website', status || 'New',
         assigned_to || null, notes || null]
      )
      return respond(201, result.rows[0])
    }

    // ── PUT /leads/{id} ────────────────────────────────────────────────────
    if (method === 'PUT' && resource === '/leads/{id}') {
      const { name, email, source, status, assigned_to, notes } = body
      const result = await query(
        `UPDATE leads
           SET name=$1, email=$2, source=$3,
               status=$4, assigned_to=$5, notes=$6
         WHERE id=$7 AND user_id=$8 RETURNING *`,
        [name, email || null, source || 'Website',
         status || 'New', assigned_to || null, notes || null,
         id, userId]
      )
      if (!result.rows.length) return respond(404, { error: 'Lead not found' })
      return respond(200, result.rows[0])
    }

    // ── DELETE /leads/{id} ─────────────────────────────────────────────────
    if (method === 'DELETE' && resource === '/leads/{id}') {
      await query(`DELETE FROM leads WHERE id=$1 AND user_id=$2`, [id, userId])
      return respond(204)
    }

    // ── POST /leads/{id}/convert ───────────────────────────────────────────
    // One-click: create a Contact from the lead and mark the lead Qualified.
    if (method === 'POST' && resource === '/leads/{id}/convert') {
      const leadRes = await query(
        `SELECT * FROM leads WHERE id=$1 AND user_id=$2`,
        [id, userId]
      )
      if (!leadRes.rows.length) return respond(404, { error: 'Lead not found' })
      const lead = leadRes.rows[0]

      const parts = (lead.name ?? '').trim().split(' ')
      const firstName = parts[0] || 'Unknown'
      const lastName  = parts.slice(1).join(' ') || '—'

      const contactRes = await query(
        `INSERT INTO contacts (user_id, first_name, last_name, email, notes)
         VALUES ($1,$2,$3,$4,$5) RETURNING *`,
        [userId, firstName, lastName, lead.email || null,
         `Converted from Lead.\n\n${lead.notes ?? ''}`.trim()]
      )

      await query(
        `UPDATE leads SET status='Qualified' WHERE id=$1 AND user_id=$2`,
        [id, userId]
      )

      return respond(201, contactRes.rows[0])
    }

    return respond(404, { error: 'Route not found' })

  } catch (err) {
    console.error('leads-lambda error:', err)
    return respond(err.statusCode ?? 500, { error: err.message })
  }
}
