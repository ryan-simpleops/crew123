import './LegalPage.css';

function SMSTerms() {
  return (
    <div className="legal-page">
      <div className="container">
        <h1>SMS Terms & Conditions</h1>
        <p className="last-updated">Last Updated: December 13, 2025</p>

        <section>
          <h2>Overview</h2>
          <p>
            Crew123 provides an automated SMS messaging service that enables film production department heads
            to contact crew members about job opportunities. By opting in to receive SMS messages from Crew123,
            you agree to these SMS Terms and Conditions.
          </p>
        </section>

        <section>
          <h2>Opt-In Process</h2>
          <p>
            To receive SMS messages through Crew123, you must complete a double opt-in process:
          </p>
          <ol>
            <li>
              <strong>Initial Consent:</strong> A department head or production company will send you an email
              invitation with a link to opt in to SMS communications for job opportunities.
            </li>
            <li>
              <strong>Web Form Consent:</strong> You will complete a web form explicitly consenting to receive
              SMS messages, including the name of the sender (department head/production company), the types of
              messages you will receive, and the expected frequency.
            </li>
            <li>
              <strong>SMS Confirmation:</strong> After submitting the web form, you will receive a confirmation
              SMS asking you to reply "YES" to confirm your opt-in. You must reply with "YES" to activate SMS
              notifications.
            </li>
          </ol>
          <p>
            By completing this process, you provide express written consent to receive automated SMS messages
            from Crew123 on behalf of the department heads or production companies you have approved.
          </p>
        </section>

        <section>
          <h2>Message Types & Frequency</h2>
          <p>
            Once opted in, you may receive the following types of messages:
          </p>
          <ul>
            <li><strong>Job Opportunity Notifications:</strong> Time-sensitive messages about available crew positions</li>
            <li><strong>Follow-up Messages:</strong> Reminders or follow-ups if you have not responded to a job offer</li>
            <li><strong>Confirmation Messages:</strong> Confirmations when you accept or decline a position</li>
            <li><strong>Service Messages:</strong> Important updates about the Crew123 service</li>
          </ul>
          <p>
            <strong>Message Frequency:</strong> Message frequency varies depending on job availability and your
            placement on department heads' priority lists. You may receive up to 10 messages per week during
            active production periods, though typical volume is 2-4 messages per week.
          </p>
        </section>

        <section>
          <h2>Opt-Out / Unsubscribe</h2>
          <p>
            You may opt out of SMS messages at any time by:
          </p>
          <ul>
            <li><strong>Text "STOP":</strong> Reply with "STOP" to any message from Crew123 to immediately unsubscribe
              from all SMS communications. You will receive a confirmation message.</li>
            <li><strong>Account Settings:</strong> Log in to your Crew123 account and update your SMS preferences</li>
            <li><strong>Contact Support:</strong> Email support@crew123.io to request removal from SMS lists</li>
          </ul>
          <p>
            After opting out, you will no longer receive SMS messages unless you opt back in through the
            double opt-in process.
          </p>
        </section>

        <section>
          <h2>Help & Support</h2>
          <p>
            For help or questions about SMS messages:
          </p>
          <ul>
            <li><strong>Text "HELP":</strong> Reply with "HELP" to any message for assistance</li>
            <li><strong>Email Support:</strong> support@crew123.io</li>
            <li><strong>Support Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM PST</li>
          </ul>
        </section>

        <section>
          <h2>Message & Data Rates</h2>
          <p>
            Message and data rates may apply based on your mobile carrier plan. Crew123 does not charge for
            SMS messages, but your carrier may charge you for receiving text messages. Contact your mobile
            carrier for details about your messaging plan.
          </p>
        </section>

        <section>
          <h2>Supported Carriers</h2>
          <p>
            Crew123 SMS service is available on major U.S. carriers including AT&T, Verizon, T-Mobile,
            Sprint, and other participating carriers. Service may not be available on all carriers.
          </p>
        </section>

        <section>
          <h2>Privacy & Data Use</h2>
          <p>
            Your phone number and message interactions are governed by our <a href="/privacy">Privacy Policy</a>.
            We do not sell your phone number to third parties. Your contact information is only shared with
            the department heads and production companies you have explicitly agreed to receive messages from.
          </p>
        </section>

        <section>
          <h2>Service Availability</h2>
          <p>
            SMS service is provided on an "as is" basis. Crew123 is not responsible for:
          </p>
          <ul>
            <li>Delayed or undelivered messages due to carrier issues</li>
            <li>Messages blocked by spam filters or carrier restrictions</li>
            <li>Service interruptions or outages</li>
            <li>Messages lost due to phone number changes or carrier switches</li>
          </ul>
        </section>

        <section>
          <h2>Compliance</h2>
          <p>
            Crew123 complies with:
          </p>
          <ul>
            <li><strong>TCPA (Telephone Consumer Protection Act):</strong> We obtain proper consent before sending
              automated SMS messages</li>
            <li><strong>A2P 10DLC Registration:</strong> Our messaging campaigns are registered with The Campaign
              Registry and approved by carriers</li>
            <li><strong>CTIA Messaging Principles:</strong> We follow industry best practices for SMS messaging</li>
          </ul>
        </section>

        <section>
          <h2>Changes to SMS Terms</h2>
          <p>
            We may update these SMS Terms from time to time. If we make material changes, we will notify you
            via SMS or email. Your continued use of the SMS service after changes are posted constitutes
            acceptance of the updated terms.
          </p>
        </section>

        <section>
          <h2>Contact Information</h2>
          <p>
            For questions about these SMS Terms, contact us at:
          </p>
          <p>
            <strong>Email:</strong> support@crew123.io<br />
            <strong>Mail:</strong> Crew123, Studio City, CA 91604
          </p>
        </section>
      </div>
    </div>
  );
}

export default SMSTerms;
