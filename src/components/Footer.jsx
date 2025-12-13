import { Link } from 'react-router-dom';
import './Footer.css';

function Footer() {
  return (
    <footer className="footer">
      <div className="footer-container">
        <div className="footer-section">
          <h3>Crew<span className="logo-highlight">123</span></h3>
          <p>Streamlining film crew hiring with automated SMS messaging.</p>
          <div className="address">
            <p><strong>Crew123</strong></p>
            <p>Studio City, CA 91604</p>
            <p>United States</p>
          </div>
        </div>

        <div className="footer-section">
          <h4>Company</h4>
          <ul>
            <li><Link to="/contact">Contact Us</Link></li>
            <li><Link to="/contact">Careers</Link></li>
            <li><Link to="/contact">Press</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Legal</h4>
          <ul>
            <li><Link to="/terms">Terms of Service</Link></li>
            <li><Link to="/privacy">Privacy Policy</Link></li>
            <li><Link to="/sms-terms">SMS Terms</Link></li>
          </ul>
        </div>

        <div className="footer-section">
          <h4>Support</h4>
          <ul>
            <li><a href="mailto:info@crew123.io">info@crew123.io</a></li>
            <li>Text HELP for SMS support</li>
            <li>Mon-Fri: 9AM-6PM PST</li>
          </ul>
        </div>
      </div>

      <div className="footer-bottom">
        <p>&copy; 2025 Crew123. All rights reserved.</p>
        <p className="compliance-note">
          A2P 10DLC Compliant | TCPA Compliant | Message and data rates may apply
        </p>
      </div>
    </footer>
  );
}

export default Footer;
