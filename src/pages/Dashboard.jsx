import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import './Dashboard.css';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [hirer, setHirer] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadUserData();
  }, []);

  async function loadUserData() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/login');
        return;
      }

      setUser(user);

      // Get hirer data
      const { data: hirerData, error } = await supabase
        .from('hirers')
        .select('*')
        .eq('email', user.email)
        .single();

      if (error) throw error;

      setHirer(hirerData);
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate('/login');
  }

  if (loading) {
    return (
      <div className="dashboard">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h2>Crew123</h2>
        </div>
        <div className="nav-user">
          <span>{hirer?.name}</span>
          <button onClick={handleLogout} className="logout-btn">Logout</button>
        </div>
      </nav>

      <div className="dashboard-container">
        <div className="dashboard-header">
          <h1>Welcome, {hirer?.name}!</h1>
          <p className="subtitle">
            {hirer?.company && `${hirer.company} • `}{hirer?.role}
          </p>
        </div>

        <div className="dashboard-content">
          <div className="feature-grid">
            <div className="feature-card">
              <h3>Crew Lists</h3>
              <p>Manage your crew members and priority lists</p>
              <button className="btn-primary" disabled>Coming Soon</button>
            </div>

            <div className="feature-card">
              <h3>Post a Job</h3>
              <p>Create job opportunities and contact crew</p>
              <button className="btn-primary" disabled>Coming Soon</button>
            </div>

            <div className="feature-card">
              <h3>Active Jobs</h3>
              <p>Track responses and manage job offers</p>
              <button className="btn-primary" disabled>Coming Soon</button>
            </div>

            <div className="feature-card">
              <h3>Billing</h3>
              <p>Manage subscription and payment</p>
              <button className="btn-primary" disabled>Coming Soon</button>
            </div>
          </div>

          <div className="info-box">
            <h3>Account Info</h3>
            <p><strong>Email:</strong> {user?.email}</p>
            <p><strong>Plan:</strong> Free (1 job per 30 days)</p>
            <p><strong>Jobs Used:</strong> {hirer?.jobs_used_this_period || 0} / 1</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
