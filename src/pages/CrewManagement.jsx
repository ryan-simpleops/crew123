import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CrewRoster from '../components/crew/CrewRoster';
import TagManager from '../components/crew/TagManager';
import ListManager from '../components/crew/ListManager';
import CSVImport from '../components/crew/CSVImport';
import './CrewManagement.css';

function CrewManagement() {
  const [activeTab, setActiveTab] = useState('roster');
  const [user, setUser] = useState(null);
  const [hirer, setHirer] = useState(null);
  const [crewMembers, setCrewMembers] = useState([]);
  const [tags, setTags] = useState([]);
  const [lists, setLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    setError(null);

    try {
      // Check authentication
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        navigate('/login');
        return;
      }

      setUser(user);

      // Get hirer data
      const { data: hirerData, error: hirerError } = await supabase
        .from('hirers')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (hirerError) throw hirerError;

      if (!hirerData) {
        throw new Error('Hirer profile not found. Please complete signup first.');
      }

      setHirer(hirerData);

      // Load all crew management data in parallel
      const [crewResult, tagsResult, listsResult] = await Promise.all([
        loadCrewMembers(hirerData.id),
        loadTags(hirerData.id),
        loadLists(hirerData.id)
      ]);

      setCrewMembers(crewResult);
      setTags(tagsResult);
      setLists(listsResult);
    } catch (err) {
      console.error('Error loading data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadCrewMembers(hirerId) {
    const { data, error } = await supabase
      .from('crew_members')
      .select(`
        *,
        crew_member_tags!inner (
          hirer_id,
          crew_tags (
            id,
            tag_name
          )
        )
      `)
      .eq('crew_member_tags.hirer_id', hirerId)
      .order('name');

    if (error) throw error;

    // Also get crew members without any tags
    const { data: untaggedCrew, error: untaggedError } = await supabase
      .from('crew_members')
      .select('*')
      .not('id', 'in', `(SELECT crew_member_id FROM crew_member_tags WHERE hirer_id = '${hirerId}')`)
      .order('name');

    if (untaggedError) console.warn('Error loading untagged crew:', untaggedError);

    // Merge and deduplicate
    const allCrew = [...(data || []), ...(untaggedCrew || [])];
    const uniqueCrew = Array.from(new Map(allCrew.map(c => [c.id, c])).values());

    return uniqueCrew;
  }

  async function loadTags(hirerId) {
    const { data, error } = await supabase
      .from('crew_tags')
      .select('*')
      .eq('hirer_id', hirerId)
      .order('tag_name');

    if (error) throw error;
    return data || [];
  }

  async function loadLists(hirerId) {
    const { data, error } = await supabase
      .from('crew_lists')
      .select(`
        id,
        name,
        position_name,
        created_at,
        crew_list_members (
          id,
          priority_order,
          crew_member_id,
          crew_members (
            id,
            name,
            phone,
            email
          )
        )
      `)
      .eq('hirer_id', hirerId)
      .order('name');

    if (error) throw error;
    return data || [];
  }

  async function refreshData() {
    if (hirer) {
      const [crewResult, tagsResult, listsResult] = await Promise.all([
        loadCrewMembers(hirer.id),
        loadTags(hirer.id),
        loadLists(hirer.id)
      ]);

      setCrewMembers(crewResult);
      setTags(tagsResult);
      setLists(listsResult);
    }
  }

  if (loading) {
    return (
      <div className="crew-management">
        <div className="loading">Loading crew management...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="crew-management">
        <div className="error-message">
          <strong>Error:</strong> {error}
          <button onClick={loadAllData} className="btn-primary" style={{marginTop: '16px'}}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="crew-management">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h2>Crew123</h2>
        </div>
        <div className="nav-user">
          <span>{hirer?.name}</span>
          <button onClick={() => navigate('/dashboard')} className="back-btn">
            ← Dashboard
          </button>
        </div>
      </nav>

      <div className="crew-container">
        <div className="crew-header">
          <h1>Crew Management</h1>
          <p className="subtitle">
            Manage your crew roster, tags, and priority lists
          </p>
        </div>

        <div className="crew-tabs">
          <button
            className={`crew-tab ${activeTab === 'roster' ? 'active' : ''}`}
            onClick={() => setActiveTab('roster')}
          >
            All Crew
          </button>
          <button
            className={`crew-tab ${activeTab === 'tags' ? 'active' : ''}`}
            onClick={() => setActiveTab('tags')}
          >
            Tags
          </button>
          <button
            className={`crew-tab ${activeTab === 'lists' ? 'active' : ''}`}
            onClick={() => setActiveTab('lists')}
          >
            Lists
          </button>
          <button
            className={`crew-tab ${activeTab === 'import' ? 'active' : ''}`}
            onClick={() => setActiveTab('import')}
          >
            Import CSV
          </button>
        </div>

        <div className="crew-content">
          {activeTab === 'roster' && (
            <CrewRoster
              crewMembers={crewMembers}
              tags={tags}
              hirer={hirer}
              onRefresh={refreshData}
            />
          )}

          {activeTab === 'tags' && (
            <TagManager
              tags={tags}
              hirer={hirer}
              onRefresh={refreshData}
            />
          )}

          {activeTab === 'lists' && (
            <ListManager
              lists={lists}
              crewMembers={crewMembers}
              tags={tags}
              hirer={hirer}
              onRefresh={refreshData}
            />
          )}

          {activeTab === 'import' && (
            <CSVImport
              tags={tags}
              hirer={hirer}
              onRefresh={refreshData}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export default CrewManagement;
