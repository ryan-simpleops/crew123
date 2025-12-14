import { useState, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './ConsentPage.css';

function CrewOptIn() {
  const [searchParams] = useSearchParams();

  // Get hirer info from URL parameters, with fallback to generic text
  const hirerName = searchParams.get('hirer_name') || 'the department head';
  const hirerCompany = searchParams.get('company') || 'their production company';
  const hirerRole = searchParams.get('role') || '';

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    agreedToSMS: false,
    agreedToTerms: false,
  });

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const turnstileRef = useRef(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Get Turnstile token
      const turnstileToken = window.turnstile.getResponse(turnstileRef.current);
      if (!turnstileToken) {
        throw new Error('Please complete the security verification');
      }

      // Verify Turnstile token
      const verifyResponse = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-turnstile`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
          },
          body: JSON.stringify({ token: turnstileToken }),
        }
      );

      const verifyData = await verifyResponse.json();
      if (!verifyData.success) {
        throw new Error('Security verification failed. Please try again.');
      }

      // Insert into crew_members table
      const { error: insertError } = await supabase
        .from('crew_members')
        .insert([
          {
            name: formData.name,
            phone: formData.phone,
            email: formData.email,
            web_consent_given: formData.agreedToSMS,
            web_consent_at: new Date().toISOString(),
            // hirer_id will be null for now until we implement email invitations
          }
        ]);

      if (insertError) throw insertError;

      console.log('Crew member opt-in successful');
      setSubmitted(true);
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err.message || 'Failed to submit form. Please try again.');
      // Reset Turnstile widget on error
      if (window.turnstile && turnstileRef.current) {
        window.turnstile.reset(turnstileRef.current);
      }
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const isFormValid = formData.name && formData.phone && formData.email &&
                      formData.agreedToSMS && formData.agreedToTerms;

  if (submitted) {
    return (
      <div className="consent-page">
        <div className="consent-container">
          <div className="success-message">
            <div className="success-icon">✓</div>
            <h1>Almost Done!</h1>
            <h2>Check your phone for a confirmation text</h2>
            <div className="success-content">
              <p>
                We just sent a text message to <strong>{formData.phone}</strong>
              </p>
              <div className="sms-preview">
                <p className="sms-label">You'll receive:</p>
                <div className="sms-bubble">
                  "Crew123: Reply YES to confirm you want to receive job offers via Crew123.
                  Reply HELP for support or STOP to opt out. Msg&Data rates may apply."
                </div>
              </div>
              <p className="instruction">
                <strong>Reply "YES" to that message to complete your opt-in.</strong>
              </p>
              <p>
                You will only receive job notifications after you confirm by replying YES.
              </p>
              <div className="help-text">
                <p>Didn't receive the text?</p>
                <ul>
                  <li>Check that you entered the correct phone number</li>
                  <li>Wait a few minutes - texts can take up to 5 minutes to arrive</li>
                  <li>Check your spam/blocked messages</li>
                  <li>Contact us at <a href="mailto:support@crew123.io">support@crew123.io</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="consent-page">
      <div className="consent-container">
        <div className="consent-header">
          <h1>Job Notification Opt-In</h1>
          <p className="subtitle">
            {searchParams.get('hirer_name')
              ? `${hirerName} from ${hirerCompany} wants to send you job opportunities via text message`
              : 'Opt in to receive job opportunities via text message from department heads you work with'
            }
          </p>
        </div>

        <div className="consent-content">
          <div className="info-section">
            {searchParams.get('hirer_name') && (
              <div className="sender-info">
                <h3>About This Request</h3>
                <p><strong>From:</strong> {hirerName}{hirerRole && `, ${hirerRole}`}</p>
                <p><strong>Company:</strong> {hirerCompany}</p>
                <p><strong>Purpose:</strong> Receive time-sensitive job opportunity notifications</p>
              </div>
            )}

            <h2>What You're Agreeing To</h2>
            <div className="agreement-details">
              <div className="detail-item">
                <h4>What messages you'll receive:</h4>
                <ul>
                  <li>Job opportunity notifications from department heads</li>
                  <li>Follow-up messages if you haven't responded to a job offer</li>
                  <li>Job confirmations when you accept a position</li>
                </ul>
              </div>

              <div className="detail-item">
                <h4>Message frequency:</h4>
                <p>
                  Varies based on job availability. Typically 2-4 messages per week,
                  up to 10 messages per week during busy production periods.
                </p>
              </div>

              <div className="detail-item">
                <h4>How to opt-out:</h4>
                <p>
                  Reply <strong>STOP</strong> to any message at any time to immediately unsubscribe.
                  You can also manage preferences in your Crew123 account or contact support.
                </p>
              </div>

              <div className="detail-item">
                <h4>Cost:</h4>
                <p>
                  Message and data rates may apply based on your mobile carrier plan.
                  Crew123 does not charge for SMS messages.
                </p>
              </div>

              <div className="detail-item">
                <h4>Privacy:</h4>
                <p>
                  Your phone number will only be used to send you job notifications from
                  approved department heads. We do not sell your information. Read our{' '}
                  <Link to="/privacy" target="_blank">Privacy Policy</Link>.
                </p>
              </div>
            </div>

            <div className="two-step-notice">
              <h3>Two-Step Confirmation Process</h3>
              <p>
                After submitting this form, you will receive a text message asking you to reply "YES"
                to confirm. You must complete both steps to receive job notifications.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="consent-form">
            <h2>Opt-In Form</h2>

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
              <label htmlFor="phone">Mobile Phone Number *</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                placeholder="(555) 123-4567"
                value={formData.phone}
                onChange={handleChange}
                required
              />
              <small>Must be a U.S. mobile number capable of receiving text messages</small>
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

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  name="agreedToSMS"
                  checked={formData.agreedToSMS}
                  onChange={handleChange}
                  required
                />
                <span className="checkbox-text">
                  <strong>I consent to receive automated SMS messages from Crew123</strong>
                  <br />
                  By checking this box, I expressly consent to receive automated text messages about
                  job opportunities from department heads through the Crew123 platform.
                  I understand that:
                  <ul>
                    <li>I will receive a confirmation text and must reply "YES" to activate SMS notifications</li>
                    <li>Message frequency varies (typically 2-4/week, up to 10/week during busy periods)</li>
                    <li>Message and data rates may apply</li>
                    <li>I can opt-out anytime by replying STOP</li>
                    <li>I can get help by replying HELP or contacting support@crew123.io</li>
                  </ul>
                  This consent is not a condition of purchase or employment.
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

            {error && (
              <div style={{padding: '15px', background: '#fee', border: '1px solid #fcc', borderRadius: '6px', color: '#c00', marginBottom: '20px'}}>
                <strong>Error:</strong> {error}
              </div>
            )}

            <div
              ref={turnstileRef}
              className="cf-turnstile"
              data-sitekey={import.meta.env.VITE_TURNSTILE_SITE_KEY}
              data-theme="light"
              style={{marginBottom: '20px'}}
            ></div>

            <button
              type="submit"
              className="submit-btn"
              disabled={!isFormValid || loading}
            >
              {loading ? 'Submitting...' : 'Continue to SMS Confirmation'}
            </button>

            <p className="form-footer">
              By submitting this form, you provide express written consent to receive SMS messages
              as described above. You will receive a confirmation text message to verify your phone number
              and complete the opt-in process.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CrewOptIn;
