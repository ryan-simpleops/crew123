import { useState } from 'react';
import { Link } from 'react-router-dom';
import './ConsentPage.css';

function HirerConsent() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    agreedToTerms: false,
    agreedToContactCrew: false,
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    // TODO: Submit to backend
    console.log('Hirer consent submitted:', formData);
    alert('Thank you! Your account is being set up. You will receive an email with next steps.');
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const isFormValid = formData.name && formData.email && formData.company &&
                      formData.role && formData.agreedToTerms && formData.agreedToContactCrew;

  return (
    <div className="consent-page">
      <div className="consent-container">
        <div className="consent-header">
          <h1>Department Head / Hirer Registration</h1>
          <p className="subtitle">
            Register to use Crew123 to contact your crew members about job opportunities
          </p>
        </div>

        <div className="consent-content">
          <div className="info-section">
            <h2>How Crew123 Works for Hirers</h2>
            <ol>
              <li>You create an account and build priority lists of your preferred crew members</li>
              <li>When you have a job opening, you post it on Crew123</li>
              <li>We send an email invitation to your crew members inviting them to opt-in to SMS notifications</li>
              <li>Crew members who opt-in will receive SMS job offers from you through Crew123</li>
              <li>If someone doesn't respond within your timeframe, we automatically contact the next person on your list</li>
            </ol>

            <div className="compliance-notice">
              <h3>Important Compliance Information</h3>
              <p>
                By using Crew123, you authorize us to contact your crew members on your behalf via email
                with invitations to opt-in to SMS communications. We will ONLY send SMS messages to crew
                members who have completed our double opt-in consent process.
              </p>
              <p>
                You agree to only add crew members with whom you have an existing professional relationship
                and who would reasonably expect to hear about job opportunities from you.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="consent-form">
            <h2>Registration Form</h2>

            <div className="form-group">
              <label htmlFor="name">Full Name *</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="email">Email Address *</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="company">Production Company / Organization *</label>
              <input
                type="text"
                id="company"
                name="company"
                value={formData.company}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="role">Your Role / Department *</label>
              <input
                type="text"
                id="role"
                name="role"
                placeholder="e.g., Director of Photography, Production Manager"
                value={formData.role}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agreedToContactCrew"
                  checked={formData.agreedToContactCrew}
                  onChange={handleChange}
                  required
                />
                <span className="checkbox-text">
                  <strong>I authorize Crew123 to contact my crew members on my behalf</strong>
                  <br />
                  I understand that Crew123 will send email invitations to my crew members inviting them
                  to opt-in to receive SMS job notifications from me through the Crew123 platform. I confirm
                  that I have existing professional relationships with the crew members I will add to my lists,
                  and they would reasonably expect to receive job opportunity communications from me.
                </span>
              </label>
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agreedToTerms"
                  checked={formData.agreedToTerms}
                  onChange={handleChange}
                  required
                />
                <span className="checkbox-text">
                  I agree to the <Link to="/terms" target="_blank">Terms of Service</Link>,{' '}
                  <Link to="/privacy" target="_blank">Privacy Policy</Link>, and{' '}
                  <Link to="/sms-terms" target="_blank">SMS Terms & Conditions</Link>
                </span>
              </label>
            </div>

            <button
              type="submit"
              className="submit-btn"
              disabled={!isFormValid}
            >
              Create Account
            </button>

            <p className="form-footer">
              By creating an account, you acknowledge that you understand your responsibilities
              as a hirer using Crew123's SMS notification service, including compliance with
              TCPA regulations and respecting crew members' opt-out requests.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default HirerConsent;
