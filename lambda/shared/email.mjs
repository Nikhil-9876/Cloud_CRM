import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'

const ses = new SESClient({ region: process.env.AWS_REGION ?? 'us-east-1' })
const FROM = process.env.SES_FROM_EMAIL // e.g. noreply@yourdomain.com

/**
 * Send an email via AWS SES.
 * Silently swallows errors so a mail failure never breaks an API response.
 *
 * @param {{ to: string|string[], subject: string, html: string, text?: string }} opts
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!FROM) {
    console.warn('SES_FROM_EMAIL env var not set — skipping email')
    return
  }
  try {
    await ses.send(new SendEmailCommand({
      Source: FROM,
      Destination: { ToAddresses: Array.isArray(to) ? to : [to] },
      Message: {
        Subject: { Data: subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: html, Charset: 'UTF-8' },
          Text: { Data: text ?? subject, Charset: 'UTF-8' },
        },
      },
    }))
  } catch (err) {
    console.warn('SES sendEmail failed (non-fatal):', err.message)
  }
}

// ── Canned email templates ──────────────────────────────────────────────────

export function newLeadEmail(lead) {
  return {
    subject: `New Lead: ${lead.name}`,
    html: `
      <h2 style="font-family:sans-serif;">New CRM Lead</h2>
      <p style="font-family:sans-serif;">A new lead has been created:</p>
      <table style="font-family:sans-serif;border-collapse:collapse;">
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Name</td><td>${lead.name}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Email</td><td>${lead.email ?? '—'}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Source</td><td>${lead.source ?? '—'}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Status</td><td>${lead.status}</td></tr>
      </table>`,
    text: `New Lead: ${lead.name} | ${lead.email ?? ''} | Source: ${lead.source}`,
  }
}

export function dealStageEmail(deal, fromStage, toStage) {
  const emoji = toStage === 'Won' ? '🎉' : toStage === 'Lost' ? '😞' : '📋'
  return {
    subject: `${emoji} Deal "${deal.title}" moved to ${toStage}`,
    html: `
      <h2 style="font-family:sans-serif;">${emoji} Deal Stage Update</h2>
      <p style="font-family:sans-serif;">A deal has changed stage:</p>
      <table style="font-family:sans-serif;border-collapse:collapse;">
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Deal</td><td>${deal.title}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">Value</td><td>$${Number(deal.value ?? 0).toLocaleString()}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">From</td><td>${fromStage ?? 'N/A'}</td></tr>
        <tr><td style="padding:4px 12px 4px 0;font-weight:bold;">To</td><td>${toStage}</td></tr>
      </table>`,
    text: `Deal "${deal.title}" moved from ${fromStage} → ${toStage}. Value: $${deal.value}`,
  }
}
