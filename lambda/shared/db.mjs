import pg from 'pg'
const { Pool } = pg

/**
 * Singleton connection pool — reused across warm Lambda invocations.
 * AWS RDS requires SSL; set RDS_SSL=true in Lambda environment variables.
 */
let pool = null

export function getPool() {
  if (!pool) {
    pool = new Pool({
      host:     process.env.RDS_HOST,
      port:     parseInt(process.env.RDS_PORT ?? '5432', 10),
      database: process.env.RDS_DATABASE,
      user:     process.env.RDS_USER,
      password: process.env.RDS_PASSWORD,
      ssl: process.env.RDS_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 5,                  // keep low — Lambda concurrency each gets a pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
    pool.on('error', () => { pool = null }) // reset on unexpected disconnect
  }
  return pool
}

export const query = (text, params) => getPool().query(text, params)
