import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  try {
    const { hirer } = await req.json()

    // Send welcome email using Resend API
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Crew123 <info@crew123.io>',
        to: [hirer.email],
        subject: 'Welcome to Crew123!',
        html: `
          <h1>Welcome to Crew123, ${hirer.name}!</h1>
          <p>Thank you for signing up. We're excited to help you streamline your crew hiring process.</p>

          <h2>What's Next?</h2>
          <p>We're currently in beta. Here's what you can expect:</p>
          <ul>
            <li>Your account has been created for ${hirer.company}</li>
            <li>We'll notify you when we're ready to launch the full platform</li>
            <li>You'll be able to build priority lists of crew members</li>
            <li>Send time-sensitive job offers via SMS</li>
          </ul>

          <h2>Have Questions?</h2>
          <p>Reply to this email or contact us at <a href="mailto:info@crew123.io">info@crew123.io</a></p>

          <p>Best regards,<br>The Crew123 Team</p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
          <p style="color: #666; font-size: 12px;">
            Crew123 | Studio City, CA 91604 | <a href="https://crew123.io">crew123.io</a>
          </p>
        `,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(data)}`)
    }

    return new Response(
      JSON.stringify({ success: true, messageId: data.id }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error sending email:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
