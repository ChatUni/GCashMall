import nodemailer from 'nodemailer'

// Gmail SMTP configuration
// Requires GMAIL_USER and GMAIL_APP_PASSWORD environment variables
// To get an app password: Google Account > Security > 2-Step Verification > App passwords
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  })
}

// Every outbound mail is sent through one authenticated Gmail account — Gmail SMTP rewrites
// any From that isn't that account or a verified alias — so the brand lives in the display
// name. Replies are pointed at support instead of that mailbox, which recipients should
// never need to see or write to.
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'support@ganime.io'

const sender = (displayName = 'Ganime') => ({
  from: `${displayName} <${process.env.GMAIL_USER}>`,
  replyTo: SUPPORT_EMAIL,
})

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
  validateEmailConfig()

  const transporter = createTransporter()

  const mailOptions = {
    ...sender(),
    to: email,
    subject: 'Reset Your Password - Ganime',
    html: generatePasswordResetEmailHtml(resetUrl),
    text: generatePasswordResetEmailText(resetUrl),
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('[sendPasswordResetEmail] Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('[sendPasswordResetEmail] Failed to send email:', error)
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

// Send user feedback to the admin inbox
export const sendFeedbackEmail = async (feedback, adminEmail) => {
  validateEmailConfig()

  const transporter = createTransporter()

  const mailOptions = {
    ...sender('Ganime Feedback'),
    to: adminEmail,
    subject: 'New User Feedback - Ganime',
    text: feedback,
    html: generateFeedbackEmailHtml(feedback),
  }

  try {
    const info = await transporter.sendMail(mailOptions)
    console.log('[sendFeedbackEmail] Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('[sendFeedbackEmail] Failed to send email:', error)
    throw new Error(`Failed to send email: ${error.message}`)
  }
}

// Notify the admin of a withdrawal request (account + amount)
// Notify the user that their wallet top-up completed. Best-effort — never throws, so a
// mail failure can't affect crediting.
export const sendTopUpEmail = async (account, amount) => {
  if (!account?.email) return { success: false, error: 'no recipient' }
  try {
    validateEmailConfig()
    const transporter = createTransporter()
    const info = await transporter.sendMail({
      ...sender(),
      to: account.email,
      subject: 'Top-up Complete - Ganime',
      text: `Hi ${account.nickname || 'there'},\n\nYour top-up of ${Number(amount).toFixed(2)} GUSD is complete and has been added to your Ganime wallet.\n\nThank you!`,
      html: generateTopUpEmailHtml(account.nickname, amount),
    })
    console.log('[sendTopUpEmail] Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('[sendTopUpEmail] Failed to send email:', error.message)
    return { success: false, error: error.message }
  }
}

// Notify the user that their withdrawal completed. Best-effort — never throws, so a
// mail failure can't affect the payout flow.
export const sendWithdrawCompleteEmail = async (account, amount) => {
  if (!account?.email) return { success: false, error: 'no recipient' }
  try {
    validateEmailConfig()
    const transporter = createTransporter()
    const info = await transporter.sendMail({
      ...sender(),
      to: account.email,
      subject: 'Withdrawal Complete - Ganime',
      text: `Hi ${account.nickname || 'there'},\n\nYour withdrawal of ${Number(amount).toFixed(2)} GUSD has been processed and sent.\n\nThank you!`,
      html: generateWithdrawCompleteEmailHtml(account.nickname, amount),
    })
    console.log('[sendWithdrawCompleteEmail] Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('[sendWithdrawCompleteEmail] Failed to send email:', error.message)
    return { success: false, error: error.message }
  }
}

const generateWithdrawCompleteEmailHtml = (nickname, amount) => {
  const name = String(nickname || 'there').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0B0E; color: #ffffff; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #3B82F6; font-size: 24px; margin: 0;">Withdrawal Complete</h1>
        </div>
        <div style="background-color: #121214; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
          <p style="color: #E5E7EB; font-size: 15px; margin: 0 0 20px 0;">Hi ${name},</p>
          <p style="color: #9CA3AF; font-size: 14px; margin: 0 0 8px 0;">Withdrawn from your wallet</p>
          <p style="color: #3B82F6; font-size: 28px; font-weight: 700; margin: 0 0 20px 0;">${Number(amount).toFixed(2)} GUSD</p>
          <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin: 0;">Your withdrawal has been processed and the funds are on their way.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

const generateTopUpEmailHtml = (nickname, amount) => {
  const name = String(nickname || 'there').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0B0E; color: #ffffff; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #3B82F6; font-size: 24px; margin: 0;">Top-up Complete</h1>
        </div>
        <div style="background-color: #121214; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
          <p style="color: #E5E7EB; font-size: 15px; margin: 0 0 20px 0;">Hi ${name},</p>
          <p style="color: #9CA3AF; font-size: 14px; margin: 0 0 8px 0;">Added to your wallet</p>
          <p style="color: #3B82F6; font-size: 28px; font-weight: 700; margin: 0 0 20px 0;">${Number(amount).toFixed(2)} GUSD</p>
          <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin: 0;">Your payment has been processed and the amount is now available in your Ganime wallet.</p>
        </div>
      </div>
    </body>
    </html>
  `
}

const generateFeedbackEmailHtml = (feedback) => {
  const safe = String(feedback)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>')
  return `
    <!DOCTYPE html>
    <html>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0B0E; color: #ffffff; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #3B82F6; font-size: 24px; margin: 0;">New User Feedback</h1>
        </div>
        <div style="background-color: #121214; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
          <p style="color: #E5E7EB; font-size: 15px; line-height: 1.7; margin: 0; white-space: pre-wrap;">${safe}</p>
        </div>
      </div>
    </body>
    </html>
  `
}

const validateEmailConfig = () => {
  if (!process.env.GMAIL_USER) {
    throw new Error('GMAIL_USER environment variable is not configured')
  }
  if (!process.env.GMAIL_APP_PASSWORD) {
    throw new Error('GMAIL_APP_PASSWORD environment variable is not configured')
  }
}

const generatePasswordResetEmailHtml = (resetUrl) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Reset Your Password</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #0B0B0E; color: #ffffff; margin: 0; padding: 0;">
      <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #3B82F6; font-size: 28px; margin: 0;">Ganime</h1>
        </div>
        
        <div style="background-color: #121214; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
          <h2 style="font-size: 24px; margin: 0 0 16px 0; color: #ffffff;">Reset Your Password</h2>
          
          <p style="color: #9CA3AF; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            We received a request to reset your password for your Ganime account. Click the button below to create a new password.
          </p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="${resetUrl}" style="display: inline-block; background-color: #3B82F6; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
              Reset Password
            </a>
          </div>
          
          <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin: 0 0 16px 0;">
            This link will expire in 1 hour for security reasons.
          </p>
          
          <p style="color: #9CA3AF; font-size: 14px; line-height: 1.6; margin: 0;">
            If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 32px;">
          <p style="color: #6B7280; font-size: 12px; margin: 0;">
            If the button doesn't work, copy and paste this link into your browser:
          </p>
          <p style="color: #3B82F6; font-size: 12px; word-break: break-all; margin: 8px 0 0 0;">
            ${resetUrl}
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 32px; padding-top: 32px; border-top: 1px solid #242428;">
          <p style="color: #6B7280; font-size: 12px; margin: 0;">
            © ${new Date().getFullYear()} Ganime. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

const generatePasswordResetEmailText = (resetUrl) => {
  return `
Reset Your Password - Ganime

We received a request to reset your password for your Ganime account.

Click the link below to create a new password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

© ${new Date().getFullYear()} Ganime. All rights reserved.
  `.trim()
}

// ── Manual moderation notifications ──
// Sent when an admin approves or rejects a series' details or one of its episodes.
// Best-effort like the wallet mails: never throws, so a mail failure can't block a review.

const escapeHtml = (v) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// What was reviewed, in words. `episodeCount` is the bulk (Approve All) case — one mail
// covering the series and everything approved with it, rather than one per item.
const moderationSubjectLine = ({ seriesName, episodeNumber, episodeCount }) => {
  if (episodeNumber) return `episode ${episodeNumber} of “${seriesName}”`
  if (episodeCount > 0) {
    const eps = episodeCount === 1 ? '1 episode' : `${episodeCount} episodes`
    return `your series “${seriesName}” and ${eps}`
  }
  return `your series “${seriesName}”`
}

export const sendModerationApprovedEmail = async (account, details) => {
  if (!account?.email) return { success: false, error: 'no recipient' }
  const what = moderationSubjectLine(details)
  try {
    validateEmailConfig()
    const transporter = createTransporter()
    const info = await transporter.sendMail({
      ...sender(),
      to: account.email,
      subject: `Approved: ${details.episodeNumber ? `Episode ${details.episodeNumber}` : details.seriesName} - Ganime`,
      text: `Hi ${account.nickname || 'there'},\n\nGood news — ${what} has been approved and is now live on Ganime.\n\n${details.note || ''}\n\nThank you for creating with us!`,
      html: generateModerationEmailHtml({
        nickname: account.nickname,
        heading: 'Approved',
        accent: '#22c55e',
        body: `Good news — ${escapeHtml(what)} has been approved and is now live on Ganime.`,
        note: details.note,
      }),
    })
    console.log('[sendModerationApprovedEmail] Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('[sendModerationApprovedEmail] Failed to send email:', error.message)
    return { success: false, error: error.message }
  }
}

export const sendModerationRejectedEmail = async (account, details) => {
  if (!account?.email) return { success: false, error: 'no recipient' }
  const what = moderationSubjectLine(details)
  const reason = String(details.reason || '').trim() || 'No reason was provided.'
  try {
    validateEmailConfig()
    const transporter = createTransporter()
    const info = await transporter.sendMail({
      ...sender(),
      to: account.email,
      subject: `Changes needed: ${details.episodeNumber ? `Episode ${details.episodeNumber}` : details.seriesName} - Ganime`,
      text: `Hi ${account.nickname || 'there'},\n\nWe reviewed ${what} and it can't be published as it is.\n\nReason:\n${reason}\n\nYou can edit it and submit again — it will go back into the review queue.`,
      html: generateModerationEmailHtml({
        nickname: account.nickname,
        heading: 'Changes needed',
        accent: '#f97316',
        body: `We reviewed ${escapeHtml(what)} and it can’t be published as it is.`,
        reason,
        note: 'You can edit it and submit again — it will go back into the review queue.',
      }),
    })
    console.log('[sendModerationRejectedEmail] Email sent:', info.messageId)
    return { success: true, messageId: info.messageId }
  } catch (error) {
    console.error('[sendModerationRejectedEmail] Failed to send email:', error.message)
    return { success: false, error: error.message }
  }
}

const generateModerationEmailHtml = ({ nickname, heading, accent, body, reason, note }) => `
<!DOCTYPE html>
<html>
  <head><meta charset="utf-8" /><title>${escapeHtml(heading)}</title></head>
  <body style="margin:0;padding:0;background-color:#0B0B0E;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0B0E;padding:32px 0;">
      <tr><td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background-color:#15161C;border-radius:12px;padding:32px;">
          <tr><td>
            <h2 style="font-size:22px;margin:0 0 16px 0;color:${accent};">${escapeHtml(heading)}</h2>
            <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;color:#D1D5DB;">Hi ${escapeHtml(nickname || 'there')},</p>
            <p style="font-size:15px;line-height:1.6;margin:0 0 16px 0;color:#D1D5DB;">${body}</p>
            ${
              reason
                ? `<div style="background-color:#0F1015;border-left:3px solid ${accent};border-radius:6px;padding:14px 16px;margin:0 0 16px 0;">
                     <p style="font-size:13px;margin:0 0 6px 0;color:#9CA3AF;text-transform:uppercase;letter-spacing:.04em;">Reason</p>
                     <p style="font-size:15px;line-height:1.6;margin:0;color:#E5E7EB;white-space:pre-wrap;">${escapeHtml(reason)}</p>
                   </div>`
                : ''
            }
            ${note ? `<p style="font-size:14px;line-height:1.6;margin:0 0 16px 0;color:#9CA3AF;">${escapeHtml(note)}</p>` : ''}
            <p style="font-size:13px;line-height:1.6;margin:24px 0 0 0;color:#6B7280;">Ganime · <a href="https://ganime.io" style="color:#3B82F6;text-decoration:none;">ganime.io</a></p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`
