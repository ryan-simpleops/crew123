import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Navigation.css';

function Navigation() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check current session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/');
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <Link to="/" className="nav-logo">
          Crew<span className="logo-highlight">123</span>
        </Link>

        <ul className="nav-menu">
          <li className="nav-item">
            <Link to="/" className="nav-link">Home</Link>
          </li>
          <li className="nav-item">
            <Link to="/contact" className="nav-link">Contact</Link>
          </li>
          <li className="nav-item">
            <Link to="/sms-terms" className="nav-link">SMS Terms</Link>
          </li>
          <li className="nav-item">
            <Link to="/crew-opt-in" className="nav-link">Crew Opt-In</Link>
          </li>

          {!loading && (
            <>
              {user ? (
                // Logged in - show Dashboard + Logout
                <>
                  <li className="nav-item">
                    <Link to="/dashboard">
                      <button className="nav-btn nav-btn-secondary">Dashboard</button>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <button className="nav-btn" onClick={handleLogout}>Logout</button>
                  </li>
                </>
              ) : (
                // Not logged in - show Login + Sign Up
                <>
                  <li className="nav-item">
                    <Link to="/login">
                      <button className="nav-btn nav-btn-secondary">Login</button>
                    </Link>
                  </li>
                  <li className="nav-item">
                    <Link to="/hirer-signup">
                      <button className="nav-btn">Sign Up</button>
                    </Link>
                  </li>
                </>
              )}
            </>
          )}
        </ul>
      </div>
    </nav>
  );
}

export default Navigation;
