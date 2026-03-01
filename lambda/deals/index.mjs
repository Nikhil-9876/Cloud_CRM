import { getUserId, respond } from '../shared/auth.mjs'
import { query } from '../shared/db.mjs'

/**
 * Deals Lambda — handles all /deals routes:
 *   GET    /deals                    ← with contacts joined
 *   POST   /deals
 *   PUT    /deals/{id}               ← auto-creates follow-up activity on stage change
 *   DELETE /deals/{id}
 *   GET    /deals/{id}/activities
 */

// When a deal reaches these stages, a follow-up activity is auto-created
// (mirrors the STAGE_FOLLOWUP config in Pipeline.jsx)
const STAGE_FOLLOWUP = {
  'Proposal Sent': { type: 'Email',   title: 'Send proposal document',    days: 1 },
  'Negotiation':   { type: 'Call',    title: 'Negotiation call',           days: 2 },
  'Won':           { type: 'Meeting', title: 'Onboarding kickoff meeting', days: 3 },
}

// SQL to fetch deals with related contact name
const DEALS_WITH_CONTACT = `
  SELECT d.*,
    CASE WHEN c.id IS NOT NULL
      THEN json_build_object('first_name', c.first_name, 'last_name', c.last_name)
      ELSE NULL
    END AS contacts
  FROM deals d
  LEFT JOIN contacts c ON d.contact_id = c.id
  WHERE d.user_id = $1
`

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200)

  try {
    const userId = await getUserId(event)
    const method = event.httpMethod
    const resource = event.resource
    const id = event.pathParameters?.id ?? null
    const body = event.body ? JSON.parse(event.body) : {}

    // ── GET /deals ─────────────────────────────────────────────────────────
    if (method === 'GET' && resource === '/deals') {
      const result = await query(
        `${DEALS_WITH_CONTACT} ORDER BY d.created_at DESC`,
        [userId]
      )
      return respond(200, result.rows)
    }

    // ── POST /deals ────────────────────────────────────────────────────────
    if (method === 'POST' && resource === '/deals') {
      const { title, value, stage, contact_id, expected_close_date, notes } = body
      if (!title?.trim()) return respond(400, { error: 'title is required' })

      const result = await query(
        `INSERT INTO deals (user_id, title, value, stage, contact_id, expected_close_date, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [userId, title.trim(),
         value != null ? Number(value) : 0,
         stage || 'Lead',
         contact_id || null,
         expected_close_date || null,
         notes || null]
      )
      return respond(201, result.rows[0])
    }

    // ── PUT /deals/{id} ────────────────────────────────────────────────────
    if (method === 'PUT' && resource === '/deals/{id}') {
      // Fetch current deal to detect stage change
      const currentRes = await query(
        `SELECT * FROM deals WHERE id=$1 AND user_id=$2`,
        [id, userId]
      )
      if (!currentRes.rows.length) return respond(404, { error: 'Deal not found' })
      const current = currentRes.rows[0]

      const {
        title = current.title,
        value = current.value,
        stage,
        contact_id = current.contact_id,
        expected_close_date = current.expected_close_date,
        notes = current.notes,
      } = body

      const updateRes = await query(
        `UPDATE deals
           SET title=$1, value=$2, stage=$3,
               contact_id=$4, expected_close_date=$5, notes=$6
         WHERE id=$7 AND user_id=$8 RETURNING *`,
        [title, Number(value ?? 0),
         stage || current.stage,
         contact_id ?? null,
         expected_close_date ?? null,
         notes ?? null,
         id, userId]
      )
      const updated = updateRes.rows[0]

      // Auto-create follow-up activity when stage changes to a key stage
      if (stage && stage !== current.stage) {
        const followup = STAGE_FOLLOWUP[stage]
        if (followup) {
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + followup.days)
          await query(
            `INSERT INTO activities
               (user_id, deal_id, contact_id, type, title, description, due_date, done)
             VALUES ($1,$2,$3,$4,$5,$6,$7,false)`,
            [
              userId, id, updated.contact_id ?? null,
              followup.type,
              `${followup.title} — ${updated.title}`,
              `Auto-created when deal moved to "${stage}" stage.`,
              dueDate.toISOString(),
            ]
          )
        }
      }

      return respond(200, updated)
    }

    // ── DELETE /deals/{id} ─────────────────────────────────────────────────
    if (method === 'DELETE' && resource === '/deals/{id}') {
      await query(`DELETE FROM deals WHERE id=$1 AND user_id=$2`, [id, userId])
      return respond(204)
    }

    // ── GET /deals/{id}/activities ─────────────────────────────────────────
    if (method === 'GET' && resource === '/deals/{id}/activities') {
      const result = await query(
        `SELECT * FROM activities WHERE deal_id=$1 AND user_id=$2 ORDER BY due_date DESC`,
        [id, userId]
      )
      return respond(200, result.rows)
    }

    return respond(404, { error: 'Route not found' })

  } catch (err) {
    console.error('deals-lambda error:', err)
    return respond(err.statusCode ?? 500, { error: err.message })
  }
}
