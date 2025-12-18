import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './ConsentPage.css';

function HirerConsent() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    role: '',
    password: '',
    agreedToTerms: false,
    agreedToContactCrew: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');
  const turnstileRef = useRef(null);
  const widgetIdRef = useRef(null);

  // Explicitly render Turnstile widget when component mounts
  useEffect(() => {
    const renderWidget = () => {
      if (window.turnstile && turnstileRef.current && !widgetIdRef.current) {
        try {
          widgetIdRef.current = window.turnstile.render(turnstileRef.current, {
            sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
            theme: 'light',
          });
          console.log('Turnstile widget rendered with ID:', widgetIdRef.current);
        } catch (err) {
          console.error('Error rendering Turnstile:', err);
        }
      }
    };

    // Try to render immediately
    renderWidget();

    // If Turnstile not loaded yet, wait for it
    const interval = setInterval(() => {
      if (window.turnstile && !widgetIdRef.current) {
        renderWidget();
        clearInterval(interval);
      }
    }, 100);

    return () => {
      clearInterval(interval);
      // Clean up widget on unmount
      if (window.turnstile && widgetIdRef.current) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch (err) {
          console.error('Error removing Turnstile widget:', err);
        }
      }
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Get Turnstile token using explicit rendering API
      if (!widgetIdRef.current) {
        throw new Error('Security verification not initialized. Please refresh the page.');
      }

      const turnstileToken = window.turnstile.getResponse(widgetIdRef.current);
      console.log('Turnstile token retrieved:', !!turnstileToken);

      if (!turnstileToken) {
        throw new Error('Please complete the security verification.');
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

      // Check if email already exists in hirers table (prevent orphaned records)
      const { data: existingHirer } = await supabase
        .from('hirers')
        .select('email')
        .eq('email', formData.email)
        .maybeSingle();

      if (existingHirer) {
        throw new Error('An account with this email already exists. Please login instead.');
      }

      // Create Supabase auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (authError) throw authError;

      // Insert or update hirers table with auth user ID
      // Use email as conflict key since that's the unique constraint
      const { error: upsertError } = await supabase
        .from('hirers')
        .upsert(
          {
            id: authData.user.id,
            name: formData.name,
            email: formData.email,
            company: formData.company,
            role: formData.role,
            agreed_to_terms: formData.agreedToTerms,
            agreed_to_contact_crew: formData.agreedToContactCrew,
          },
          {
            onConflict: 'email',
            ignoreDuplicates: false
          }
        );

      if (upsertError) throw upsertError;

      console.log('Hirer registered successfully');

      // Send welcome email via Edge Function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-hirer-welcome`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              hirer: {
                name: formData.name,
                email: formData.email,
                company: formData.company,
              }
            }),
          }
        );

        if (!response.ok) {
          console.error('Failed to send welcome email:', await response.text());
        } else {
          console.log('Welcome email sent successfully');
        }
      } catch (emailError) {
        // Log but don't fail the registration if email fails
        console.error('Error sending welcome email:', emailError);
      }

      setSubmittedEmail(formData.email);
      setSuccess(true);

      // Reset form
      setFormData({
        name: '',
        email: '',
        company: '',
        role: '',
        password: '',
        agreedToTerms: false,
        agreedToContactCrew: false,
      });
    } catch (err) {
      console.error('Error submitting form:', err);
      setError(err.message || 'Failed to submit form. Please try again.');
      // Reset Turnstile widget on error
      if (window.turnstile && widgetIdRef.current) {
        window.turnstile.reset(widgetIdRef.current);
      }
    } finally {
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

  const isFormValid = formData.name && formData.email && formData.password &&
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
              <label htmlFor="password">Password *</label>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                autoComplete="new-password"
              />
              <small>At least 6 characters</small>
            </div>

            <div className="form-group">
              <label htmlFor="company">Production Company / Organization</label>
              <input
                type="text"
                id="company"
                name="company"
                placeholder="Leave blank if independent contractor"
                value={formData.company}
                onChange={handleChange}
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

            {error && (
              <div style={{padding: '15px', background: '#fee', border: '1px solid #fcc', borderRadius: '6px', color: '#c00', marginBottom: '20px'}}>
                <strong>Error:</strong> {error}
              </div>
            )}

            {success && (
              <div style={{padding: '15px', background: '#efe', border: '1px solid #cfc', borderRadius: '6px', color: '#060', marginBottom: '20px'}}>
                <strong>Success!</strong> Your account has been created. We'll contact you at {submittedEmail} with next steps.
              </div>
            )}

            <div
              ref={turnstileRef}
              style={{marginBottom: '20px'}}
            ></div>

            <button
              type="submit"
              className="submit-btn"
              disabled={!isFormValid || loading}
            >
              {loading ? 'Submitting...' : 'Create Account'}
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
