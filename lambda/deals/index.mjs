import { getUser, respond } from '../shared/auth.mjs'
import { query } from '../shared/db.mjs'
import { sendEmail, dealStageEmail, taskAssignedEmail } from '../shared/email.mjs'

/**
 * Deals Lambda — handles all /deals routes:
 *   GET    /deals                    ← with contacts joined
 *   POST   /deals
 *   PUT    /deals/{id}               ← auto-creates follow-up activity on stage change
 *   DELETE /deals/{id}
 *   GET    /deals/{id}/activities
 *   GET    /deals/{id}/history     ← stage change history
 *
 * Role-based access:
 *   admin     → sees ALL deals across all users
 *   sales_rep → sees only their own deals
 */

// When a deal reaches these stages, a follow-up activity is auto-created
// (mirrors the STAGE_FOLLOWUP config in Pipeline.jsx)
const STAGE_FOLLOWUP = {
  'Proposal Sent': { type: 'Email',   title: 'Send proposal document',    days: 1 },
  'Negotiation':   { type: 'Call',    title: 'Negotiation call',           days: 2 },
  'Won':           { type: 'Meeting', title: 'Onboarding kickoff meeting', days: 3 },
}

// SQL to fetch deals with related contact name — filter applied at call site
const DEALS_WITH_CONTACT = `
  SELECT d.*,
    CASE WHEN c.id IS NOT NULL
      THEN json_build_object('first_name', c.first_name, 'last_name', c.last_name)
      ELSE NULL
    END AS contacts
  FROM deals d
  LEFT JOIN contacts c ON d.contact_id = c.id
  WHERE ($2::boolean = true OR d.user_id = $1)
`

export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200)

  try {
    const { userId, isAdmin } = await getUser(event)
    const method = event.httpMethod
    const resource = event.resource
    const id = event.pathParameters?.id ?? null
    const body = event.body ? JSON.parse(event.body) : {}

    // ── GET /deals ─────────────────────────────────────────────────────────
    if (method === 'GET' && resource === '/deals') {
      const result = await query(
        `${DEALS_WITH_CONTACT} ORDER BY d.created_at DESC`,
        [userId, isAdmin]
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
        `SELECT * FROM deals WHERE id=$1 AND ($3::boolean = true OR user_id = $2)`,
        [id, userId, isAdmin]
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
         WHERE id=$7 AND ($9::boolean = true OR user_id = $8) RETURNING *`,
        [title, Number(value ?? 0),
         stage || current.stage,
         contact_id ?? null,
         expected_close_date ?? null,
         notes ?? null,
         id, userId, isAdmin]
      )
      const updated = updateRes.rows[0]

      // If stage changed: record history, auto-activity, and send email
      if (stage && stage !== current.stage) {
        // Record stage history
        await query(
          `INSERT INTO deal_stage_history (deal_id, from_stage, to_stage, user_id)
           VALUES ($1,$2,$3,$4)`,
          [id, current.stage, stage, userId]
        )

        // Auto-create follow-up activity
        const followup = STAGE_FOLLOWUP[stage]
        if (followup) {
          const dueDate = new Date()
          dueDate.setDate(dueDate.getDate() + followup.days)
          const actResult = await query(
            `INSERT INTO activities
               (user_id, deal_id, contact_id, type, title, description, due_date, done)
             VALUES ($1,$2,$3,$4,$5,$6,$7,false) RETURNING *`,
            [
              userId, id, updated.contact_id ?? null,
              followup.type,
              `${followup.title} — ${updated.title}`,
              `Auto-created when deal moved to "${stage}" stage.`,
              dueDate.toISOString(),
            ]
          )
          const newActivity = actResult.rows[0]

          // Email the linked contact about the new task (non-blocking)
          if (updated.contact_id) {
            const contactRes = await query(
              `SELECT first_name, last_name, email FROM contacts WHERE id=$1`,
              [updated.contact_id]
            )
            const contact = contactRes.rows[0]
            if (contact?.email) {
              const emailPayload = taskAssignedEmail(contact, newActivity, updated.title)
              sendEmail({ to: contact.email, ...emailPayload })
            }
          }
        }

        // Email notification (non-blocking)
        const emailPayload = dealStageEmail(updated, current.stage, stage)
        sendEmail({ to: process.env.NOTIFY_EMAIL ?? '', ...emailPayload })
      }

      return respond(200, updated)
    }

    // ── DELETE /deals/{id} ─────────────────────────────────────────────────
    if (method === 'DELETE' && resource === '/deals/{id}') {
      await query(
        `DELETE FROM deals WHERE id=$1 AND ($3::boolean = true OR user_id = $2)`,
        [id, userId, isAdmin]
      )
      return respond(204)
    }

    // ── GET /deals/{id}/activities ─────────────────────────────────────────
    if (method === 'GET' && resource === '/deals/{id}/activities') {
      const result = await query(
        `SELECT * FROM activities
         WHERE deal_id=$1 AND ($3::boolean = true OR user_id = $2)
         ORDER BY due_date DESC`,
        [id, userId, isAdmin]
      )
      return respond(200, result.rows)
    }

    // ── GET /deals/{id}/history ────────────────────────────────────────────
    if (method === 'GET' && resource === '/deals/{id}/history') {
      const result = await query(
        `SELECT * FROM deal_stage_history
         WHERE deal_id = $1
         ORDER BY changed_at ASC`,
        [id]
      )
      return respond(200, result.rows)
    }

    return respond(404, { error: 'Route not found' })

  } catch (err) {
    console.error('deals-lambda error:', err)
    return respond(err.statusCode ?? 500, { error: err.message })
  }
}
