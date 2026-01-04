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

// Send password reset email
export const sendPasswordResetEmail = async (email, resetToken, resetUrl) => {
  validateEmailConfig()

  const transporter = createTransporter()

  const mailOptions = {
    from: `GCashMall <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Reset Your Password - GCashMall',
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
          <h1 style="color: #3B82F6; font-size: 28px; margin: 0;">GCashMall</h1>
        </div>
        
        <div style="background-color: #121214; border-radius: 12px; padding: 32px; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);">
          <h2 style="font-size: 24px; margin: 0 0 16px 0; color: #ffffff;">Reset Your Password</h2>
          
          <p style="color: #9CA3AF; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
            We received a request to reset your password for your GCashMall account. Click the button below to create a new password.
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
            © ${new Date().getFullYear()} GCashMall. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

const generatePasswordResetEmailText = (resetUrl) => {
  return `
Reset Your Password - GCashMall

We received a request to reset your password for your GCashMall account.

Click the link below to create a new password:
${resetUrl}

This link will expire in 1 hour for security reasons.

If you didn't request a password reset, you can safely ignore this email. Your password will remain unchanged.

© ${new Date().getFullYear()} GCashMall. All rights reserved.
  `.trim()
}
