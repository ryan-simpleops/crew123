import './LegalPage.css';

function Privacy() {
  return (
    <div className="legal-page">
      <div className="container">
        <h1>Privacy Policy</h1>
        <p className="last-updated">Last Updated: December 13, 2025</p>

        <section>
          <h2>Introduction</h2>
          <p>
            Crew123 ("we," "our," or "us") is committed to protecting your privacy. This Privacy Policy
            explains how we collect, use, disclose, and safeguard your information when you use our
            automated SMS messaging service for film crew hiring.
          </p>
        </section>

        <section>
          <h2>Information We Collect</h2>

          <h3>Information You Provide</h3>
          <ul>
            <li><strong>Account Information:</strong> Name, email address, phone number, company affiliation</li>
            <li><strong>Profile Information:</strong> Department, job titles, skills, availability preferences</li>
            <li><strong>Contact Lists:</strong> Names and phone numbers of crew members (for department heads)</li>
            <li><strong>Consent Records:</strong> Timestamps and records of SMS opt-in confirmations</li>
          </ul>

          <h3>Information Collected Automatically</h3>
          <ul>
            <li><strong>Message Data:</strong> SMS delivery status, response times, message content</li>
            <li><strong>Usage Data:</strong> How you interact with our service, features used, login times</li>
            <li><strong>Device Information:</strong> IP address, browser type, operating system</li>
            <li><strong>Cookies:</strong> We use cookies to maintain your session and preferences</li>
          </ul>
        </section>

        <section>
          <h2>How We Use Your Information</h2>
          <p>We use your information to:</p>
          <ul>
            <li>Provide and maintain the Crew123 service</li>
            <li>Send SMS messages on behalf of department heads (with your consent)</li>
            <li>Process and respond to job opportunities</li>
            <li>Maintain compliance records for TCPA and A2P 10DLC regulations</li>
            <li>Improve our service and develop new features</li>
            <li>Send service-related notifications</li>
            <li>Prevent fraud and ensure service security</li>
            <li>Comply with legal obligations</li>
          </ul>
        </section>

        <section>
          <h2>How We Share Your Information</h2>

          <h3>With Your Consent</h3>
          <p>
            When you opt in to receive messages from a department head, we share your phone number and
            relevant profile information with that specific sender to facilitate job communications.
          </p>

          <h3>Service Providers</h3>
          <p>We share information with third-party service providers who help us operate our service:</p>
          <ul>
            <li><strong>AWS (Amazon Web Services):</strong> SMS delivery via Amazon SNS, data storage</li>
            <li><strong>Supabase:</strong> Database hosting and backend services</li>
            <li><strong>Analytics Providers:</strong> To understand service usage and improve features</li>
          </ul>

          <h3>Legal Requirements</h3>
          <p>
            We may disclose your information if required by law, court order, or to protect our rights,
            property, or safety.
          </p>

          <h3>We Do NOT Sell Your Data</h3>
          <p>
            We do not sell, rent, or trade your personal information, including phone numbers, to third
            parties for marketing purposes.
          </p>
        </section>

        <section>
          <h2>Data Retention</h2>
          <p>
            We retain your information for as long as your account is active or as needed to provide services.
            Specifically:
          </p>
          <ul>
            <li><strong>Account Data:</strong> Retained while your account is active, deleted within 30 days of account closure</li>
            <li><strong>Consent Records:</strong> Retained for 4 years to comply with TCPA requirements</li>
            <li><strong>Message Logs:</strong> Retained for 2 years for compliance and dispute resolution</li>
            <li><strong>Opt-Out Records:</strong> Retained indefinitely to honor your preferences</li>
          </ul>
        </section>

        <section>
          <h2>Your Privacy Rights</h2>

          <h3>Access & Correction</h3>
          <p>You can access and update your account information at any time through your account settings.</p>

          <h3>Deletion</h3>
          <p>
            You can request deletion of your account and personal information by contacting
            support@crew123.io. Note that we may retain certain information as required for legal compliance.
          </p>

          <h3>Opt-Out of SMS</h3>
          <p>
            Reply "STOP" to any message to opt out of SMS communications. See our
            <a href="/sms-terms">SMS Terms</a> for details.
          </p>

          <h3>California Privacy Rights (CCPA)</h3>
          <p>If you are a California resident, you have additional rights:</p>
          <ul>
            <li>Right to know what personal information we collect and how we use it</li>
            <li>Right to request deletion of your personal information</li>
            <li>Right to opt-out of the sale of personal information (we do not sell your information)</li>
            <li>Right to non-discrimination for exercising your privacy rights</li>
          </ul>
        </section>

        <section>
          <h2>Data Security</h2>
          <p>
            We implement industry-standard security measures to protect your information:
          </p>
          <ul>
            <li>Encryption of data in transit (HTTPS/TLS)</li>
            <li>Encryption of sensitive data at rest</li>
            <li>Access controls and authentication</li>
            <li>Regular security audits</li>
            <li>Secure cloud infrastructure (AWS, Supabase)</li>
          </ul>
          <p>
            However, no method of transmission over the Internet is 100% secure. We cannot guarantee
            absolute security of your information.
          </p>
        </section>

        <section>
          <h2>Children's Privacy</h2>
          <p>
            Crew123 is not intended for individuals under 18 years of age. We do not knowingly collect
            personal information from children. If we learn we have collected information from a child
            under 18, we will delete it promptly.
          </p>
        </section>

        <section>
          <h2>Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes
            by email or through a prominent notice in our service. Your continued use of Crew123 after
            changes are posted constitutes acceptance of the updated policy.
          </p>
        </section>

        <section>
          <h2>Contact Us</h2>
          <p>
            If you have questions or concerns about this Privacy Policy, please contact us at:
          </p>
          <p>
            <strong>Email:</strong> privacy@crew123.io<br />
            <strong>Support:</strong> support@crew123.io<br />
            <strong>Mail:</strong> Crew123, Studio City, CA 91604
          </p>
        </section>
      </div>
    </div>
  );
}

export default Privacy;
