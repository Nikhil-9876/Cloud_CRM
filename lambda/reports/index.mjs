import { getUser, respond } from '../shared/auth.mjs'
import { query } from '../shared/db.mjs'

/**
 * Reports Lambda — GET /reports/summary
 * Returns aggregated data for the Reporting page.
 * Admins see data across all users; sales reps see only their own.
 */
export const handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') return respond(200)

  try {
    const { userId, isAdmin } = await getUser(event)

    const [
      dealsByStage,
      revenueByMonth,
      leadsByStatus,
      activitiesByType,
      conversionRate,
    ] = await Promise.all([

      // Deals grouped by stage (count + total value)
      query(
        `SELECT stage,
                COUNT(*)::int        AS count,
                COALESCE(SUM(value),0)::float AS total_value
         FROM deals
         WHERE ($2::boolean = true OR user_id = $1)
         GROUP BY stage
         ORDER BY count DESC`,
        [userId, isAdmin]
      ),

      // Won deal revenue grouped by month (last 12 months)
      query(
        `SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'Mon YYYY') AS month,
                DATE_TRUNC('month', created_at)                      AS month_date,
                COALESCE(SUM(value), 0)::float                       AS revenue,
                COUNT(*)::int                                        AS deals_won
         FROM deals
         WHERE stage = 'Won'
           AND ($2::boolean = true OR user_id = $1)
           AND created_at >= NOW() - INTERVAL '12 months'
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY month_date ASC`,
        [userId, isAdmin]
      ),

      // Leads grouped by status
      query(
        `SELECT status,
                COUNT(*)::int AS count
         FROM leads
         WHERE ($2::boolean = true OR user_id = $1)
         GROUP BY status`,
        [userId, isAdmin]
      ),

      // Activities grouped by type
      query(
        `SELECT type,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE done = true)::int  AS done,
                COUNT(*) FILTER (WHERE done = false)::int AS pending
         FROM activities
         WHERE ($2::boolean = true OR user_id = $1)
         GROUP BY type`,
        [userId, isAdmin]
      ),

      // Lead-to-contact conversion rate
      query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'Qualified')::float AS qualified,
           COUNT(*)::float                                      AS total
         FROM leads
         WHERE ($2::boolean = true OR user_id = $1)`,
        [userId, isAdmin]
      ),
    ])

    const totals = conversionRate.rows[0]
    const convRate = totals.total > 0
      ? Math.round((totals.qualified / totals.total) * 100)
      : 0

    return respond(200, {
      dealsByStage:    dealsByStage.rows,
      revenueByMonth:  revenueByMonth.rows,
      leadsByStatus:   leadsByStatus.rows,
      activitiesByType: activitiesByType.rows,
      conversionRate:  convRate,
    })

  } catch (err) {
    console.error('reports-lambda error:', err)
    return respond(err.statusCode ?? 500, { error: err.message })
  }
}
