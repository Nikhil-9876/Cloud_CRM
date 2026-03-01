import { getUserId, respond } from '../shared/auth.mjs'
import { query } from '../shared/db.mjs'

/**
 * Activities Lambda — handles all /activities routes:
 *   GET    /activities    ← with contacts + deals joined
 *   POST   /activities
 *   PUT    /activities/{id}
 *   DELETE /activities/{id}
 */

// SQL to fetch activities with related contact name and deal title
const ACTIVITIES_WITH_JOINS = `
  SELECT a.*,
    CASE WHEN c.id IS NOT NULL
      THEN json_build_object('first_name', c.first_name, 'last_name', c.last_name)
      ELSE NULL
    END AS contacts,
    CASE WHEN d.id IS NOT NULL
      THEN json_build_object('title', d.title)
      ELSE NULL
    END AS deals
  FROM activities a
  LEFT JOIN contacts c ON a.contact_id = c.id
  LEFT JOIN deals    d ON a.deal_id    = d.id
  WHERE a.user_id = $1
`

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200)

  try {
    const userId = await getUserId(event)
    const method = event.httpMethod
    const resource = event.resource
    const id = event.pathParameters?.id ?? null
    const body = event.body ? JSON.parse(event.body) : {}

    // ── GET /activities ────────────────────────────────────────────────────
    if (method === 'GET' && resource === '/activities') {
      const result = await query(
        `${ACTIVITIES_WITH_JOINS} ORDER BY a.due_date DESC`,
        [userId]
      )
      return respond(200, result.rows)
    }

    // ── POST /activities ───────────────────────────────────────────────────
    if (method === 'POST' && resource === '/activities') {
      const { type, title, description, contact_id, deal_id, due_date, done } = body
      if (!title?.trim()) return respond(400, { error: 'title is required' })

      const result = await query(
        `INSERT INTO activities
           (user_id, type, title, description, contact_id, deal_id, due_date, done)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
        [userId,
         type || 'Call',
         title.trim(),
         description || null,
         contact_id || null,
         deal_id || null,
         due_date || null,
         done ?? false]
      )
      return respond(201, result.rows[0])
    }

    // ── PUT /activities/{id} ───────────────────────────────────────────────
    if (method === 'PUT' && resource === '/activities/{id}') {
      const { type, title, description, contact_id, deal_id, due_date, done } = body
      const result = await query(
        `UPDATE activities
           SET type        = COALESCE($1, type),
               title       = COALESCE($2, title),
               description = $3,
               contact_id  = $4,
               deal_id     = $5,
               due_date    = $6,
               done        = COALESCE($7, done)
         WHERE id=$8 AND user_id=$9 RETURNING *`,
        [type ?? null, title ?? null,
         description ?? null,
         contact_id ?? null,
         deal_id ?? null,
         due_date ?? null,
         done ?? null,
         id, userId]
      )
      if (!result.rows.length) return respond(404, { error: 'Activity not found' })
      return respond(200, result.rows[0])
    }

    // ── DELETE /activities/{id} ────────────────────────────────────────────
    if (method === 'DELETE' && resource === '/activities/{id}') {
      await query(`DELETE FROM activities WHERE id=$1 AND user_id=$2`, [id, userId])
      return respond(204)
    }

    return respond(404, { error: 'Route not found' })

  } catch (err) {
    console.error('activities-lambda error:', err)
    return respond(err.statusCode ?? 500, { error: err.message })
  }
}
