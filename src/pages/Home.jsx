import { Link } from 'react-router-dom';
import './Home.css';

function Home() {
  return (
    <div className="home">
      <section className="hero">
        <div className="container">
          <h1>Crew Up Faster with Crew123</h1>
          <p className="tagline">
            Automated SMS messaging for film production department heads.
            Contact your preferred crew in priority order and get your positions filled quickly.
          </p>
          <p className="subtitle">
            Save hours of texting. Focus on what matters.
          </p>
          <div className="cta-buttons">
            <Link to="/hirer-signup">
              <button className="btn btn-primary">Sign Up as Department Head</button>
            </Link>
            <a href="#how-it-works">
              <button className="btn btn-secondary">Learn More</button>
            </a>
          </div>
        </div>
      </section>

      <section className="how-it-works" id="how-it-works">
        <div className="container">
          <h2>How It Works</h2>
          <div className="steps">
            <div className="step">
              <div className="step-number">1</div>
              <h3>Create Your Priority List</h3>
              <p>Build ranked lists of crew members for each department and position</p>
            </div>
            <div className="step">
              <div className="step-number">2</div>
              <h3>Post a Job Opening</h3>
              <p>Enter job details, dates, and set your response time window</p>
            </div>
            <div className="step">
              <div className="step-number">3</div>
              <h3>Automated Outreach</h3>
              <p>Crew123 contacts your first choice. If they don't respond within your timeframe, we automatically move to the next person</p>
            </div>
            <div className="step">
              <div className="step-number">4</div>
              <h3>Position Filled</h3>
              <p>Get notified when someone accepts. Stop wasting time on manual follow-ups</p>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <h2>Built for Production</h2>
          <div className="feature-grid">
            <div className="feature">
              <h3>⏱️ Time-Sensitive</h3>
              <p>Set custom response windows. Auto-escalate to the next person if no reply</p>
            </div>
            <div className="feature">
              <h3>📋 Priority Lists</h3>
              <p>Maintain your preferred crew rankings. Contact the best people first, every time</p>
            </div>
            <div className="feature">
              <h3>✅ Compliant</h3>
              <p>Full A2P 10DLC compliance. Proper opt-in/opt-out handling for all contacts</p>
            </div>
            <div className="feature">
              <h3>📱 SMS Based</h3>
              <p>Reach crew where they are. Fast responses via text message</p>
            </div>
          </div>
        </div>
      </section>

      <section className="consent-flow-section">
        <div className="container">
          <h2>Compliant Consent Process</h2>
          <p className="section-intro">
            Crew123 uses a double opt-in process to ensure full TCPA and A2P 10DLC compliance
          </p>
          <div className="consent-flow">
            <div className="consent-step">
              <div className="consent-icon">👤</div>
              <h3>Department Heads</h3>
              <p>Sign up and authorize Crew123 to contact your crew members via email on your behalf</p>
              <Link to="/hirer-signup">
                <button className="btn btn-primary">Sign Up as Hirer</button>
              </Link>
            </div>
            <div className="consent-arrow">→</div>
            <div className="consent-step">
              <div className="consent-icon">✉️</div>
              <h3>Email Invitation</h3>
              <p>We send your crew members an email with a link to opt-in to SMS job notifications</p>
            </div>
            <div className="consent-arrow">→</div>
            <div className="consent-step">
              <div className="consent-icon">✅</div>
              <h3>Crew Opt-In</h3>
              <p>Crew members complete a web form and confirm via SMS reply to activate notifications</p>
              <p className="note-text">Crew members access this page via personalized email invitation link</p>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="container">
          <h2>Ready to streamline your crew hiring?</h2>
          <p>Get started as a department head today</p>
          <Link to="/hirer-signup">
            <button className="btn btn-primary btn-large">Sign Up Now</button>
          </Link>
        </div>
      </section>

      <section className="compliance-info">
        <div className="container">
          <p className="small-text">
            Crew123 is committed to compliance with all applicable SMS regulations including TCPA and A2P 10DLC requirements.
            All crew members must opt-in to receive messages. Standard message and data rates apply.
          </p>
          <p className="small-text">
            <Link to="/sms-terms">SMS Terms & Conditions</Link> |
            <Link to="/privacy">Privacy Policy</Link> |
            <Link to="/terms">Terms of Service</Link>
          </p>
        </div>
      </section>
    </div>
  );
}

export default Home;
