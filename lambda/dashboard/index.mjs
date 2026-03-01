import { getUserId, respond } from '../shared/auth.mjs'
import { query } from '../shared/db.mjs'

/**
 * Dashboard Lambda — GET /dashboard/stats
 * Runs all dashboard queries in parallel and returns everything in one payload,
 * replacing the 7 parallel Supabase calls that were in Dashboard.jsx.
 */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200)

  try {
    const userId = await getUserId(event)

    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString()
    const today      = now.toISOString()

    // Fire all queries in parallel — single round-trip to RDS
    const [
      contactsRes,
      leadsRes,
      openDealsRes,
      wonThisMonthRes,
      pendingRes,
      recentRes,
      overdueRes,
    ] = await Promise.all([
      query(`SELECT COUNT(*)::int AS c FROM contacts   WHERE user_id=$1`, [userId]),
      query(`SELECT COUNT(*)::int AS c FROM leads      WHERE user_id=$1`, [userId]),
      query(`SELECT COUNT(*)::int AS c FROM deals      WHERE user_id=$1 AND stage NOT IN ('Won','Lost')`, [userId]),
      query(
        `SELECT COUNT(*)::int AS c FROM deals
         WHERE user_id=$1 AND stage='Won'
           AND created_at>=$2 AND created_at<=$3`,
        [userId, monthStart, monthEnd]
      ),
      query(`SELECT COUNT(*)::int AS c FROM activities WHERE user_id=$1 AND done=false`, [userId]),
      // 5 most recent activities with contact name
      query(
        `SELECT a.id, a.title, a.type, a.due_date, a.done,
           CASE WHEN c.id IS NOT NULL
             THEN json_build_object('first_name',c.first_name,'last_name',c.last_name)
             ELSE NULL
           END AS contacts
         FROM activities a
         LEFT JOIN contacts c ON a.contact_id = c.id
         WHERE a.user_id=$1
         ORDER BY a.created_at DESC LIMIT 5`,
        [userId]
      ),
      // Overdue open deals with contact name
      query(
        `SELECT d.id, d.title, d.value, d.stage, d.expected_close_date,
           CASE WHEN c.id IS NOT NULL
             THEN json_build_object('first_name',c.first_name,'last_name',c.last_name)
             ELSE NULL
           END AS contacts
         FROM deals d
         LEFT JOIN contacts c ON d.contact_id = c.id
         WHERE d.user_id=$1
           AND d.stage NOT IN ('Won','Lost')
           AND d.expected_close_date IS NOT NULL
           AND d.expected_close_date < $2
         ORDER BY d.expected_close_date ASC`,
        [userId, today]
      ),
    ])

    return respond(200, {
      contacts:           contactsRes.rows[0].c,
      leads:              leadsRes.rows[0].c,
      openDeals:          openDealsRes.rows[0].c,
      wonThisMonth:       wonThisMonthRes.rows[0].c,
      pendingActivities:  pendingRes.rows[0].c,
      recentActivities:   recentRes.rows,
      overdueDeals:       overdueRes.rows,
    })

  } catch (err) {
    console.error('dashboard-lambda error:', err)
    return respond(err.statusCode ?? 500, { error: err.message })
  }
}
