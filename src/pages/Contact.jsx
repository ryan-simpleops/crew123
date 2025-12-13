import './LegalPage.css';

function Contact() {
  return (
    <div className="legal-page">
      <div className="container">
        <h1>Contact Us</h1>

        <section>
          <h2>Get in Touch</h2>
          <p>
            Have questions about Crew123? We're here to help. Reach out to us using any of the
            methods below.
          </p>
        </section>

        <section>
          <h2>General Inquiries</h2>
          <p>
            <strong>Email:</strong> <a href="mailto:info@crew123.io">info@crew123.io</a><br />
            <strong>Hours:</strong> Monday - Friday, 9:00 AM - 6:00 PM PST
          </p>
          <p>
            For support, sales, partnerships, privacy questions, or legal matters, please email us at the address above.
          </p>
          <p>
            For SMS-related help, you can also text "HELP" to any message from Crew123.
          </p>
        </section>

        <section>
          <h2>Report a Problem</h2>
          <p>
            If you're experiencing technical issues or want to report inappropriate use of the service:
          </p>
          <p>
            <strong>Email:</strong> <a href="mailto:info@crew123.io">info@crew123.io</a><br />
            <strong>Subject:</strong> Include "Bug Report" or "Abuse Report" in the subject line
          </p>
        </section>

        <div style={{marginTop: '60px', padding: '30px', background: '#f8f9fa', borderRadius: '8px', textAlign: 'center'}}>
          <h3>Ready to Get Started?</h3>
          <p>Join our waitlist to be the first to know when Crew123 launches.</p>
          <button className="btn btn-primary" style={{marginTop: '20px'}}>
            Join Waitlist
          </button>
        </div>
      </div>
    </div>
  );
}

export default Contact;
