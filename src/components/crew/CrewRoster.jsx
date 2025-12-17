import { useState } from 'react';
import CrewForm from './CrewForm';

function CrewRoster({ crewMembers, tags, hirer, onRefresh }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCrew, setEditingCrew] = useState(null);

  // Filter crew members based on search and tags
  const filteredCrew = crewMembers.filter(crew => {
    // Search filter
    const matchesSearch = searchTerm === '' ||
      crew.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (crew.phone && crew.phone.includes(searchTerm)) ||
      (crew.email && crew.email.toLowerCase().includes(searchTerm.toLowerCase()));

    // Tag filter
    const matchesTags = selectedTags.length === 0 ||
      (crew.crew_member_tags && crew.crew_member_tags.some(cmt =>
        selectedTags.includes(cmt.crew_tags?.id)
      ));

    return matchesSearch && matchesTags;
  });

  function toggleTagFilter(tagId) {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  }

  function getCrewTags(crew) {
    if (!crew.crew_member_tags) return [];
    return crew.crew_member_tags
      .map(cmt => cmt.crew_tags)
      .filter(tag => tag !== null);
  }

  function getConsentStatus(crew) {
    if (crew.opted_out) {
      return { label: 'Opted Out', className: 'opted-out' };
    }
    if (crew.sms_consent_confirmed) {
      return { label: 'SMS Confirmed', className: 'sms-confirmed' };
    }
    if (crew.web_consent_given) {
      return { label: 'Web Only', className: 'web-only' };
    }
    return { label: 'No Consent', className: 'no-consent' };
  }

  function handleEdit(crew) {
    setEditingCrew(crew);
    setShowAddForm(true);
  }

  function handleCloseForm() {
    setShowAddForm(false);
    setEditingCrew(null);
  }

  function handleFormSuccess() {
    setShowAddForm(false);
    setEditingCrew(null);
    onRefresh();
  }

  return (
    <div className="crew-section">
      <div className="section-header">
        <h2>All Crew ({filteredCrew.length})</h2>
        <button className="btn-primary" onClick={() => setShowAddForm(true)}>
          + Add Crew Member
        </button>
      </div>

      {/* Search and filter bar */}
      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search by name, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        {tags.length > 0 && (
          <div style={{display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap'}}>
            <span className="filter-label">Filter by tags:</span>
            {tags.map(tag => (
              <button
                key={tag.id}
                className={`tag-chip-filter ${selectedTags.includes(tag.id) ? 'active' : ''}`}
                onClick={() => toggleTagFilter(tag.id)}
              >
                {tag.tag_name}
              </button>
            ))}
            {selectedTags.length > 0 && (
              <button className="btn-icon" onClick={() => setSelectedTags([])} title="Clear filters">
                ✕ Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Crew table */}
      {filteredCrew.length === 0 ? (
        <div className="empty-state">
          <h3>No crew members found</h3>
          <p>
            {crewMembers.length === 0
              ? 'Start by adding your first crew member'
              : 'Try adjusting your search or filters'}
          </p>
          {crewMembers.length === 0 && (
            <button className="btn-primary" onClick={() => setShowAddForm(true)}>
              Add First Crew Member
            </button>
          )}
        </div>
      ) : (
        <div className="crew-table">
          <div className="crew-table-header">
            <div className="crew-col-name">Name</div>
            <div className="crew-col-phone">Phone</div>
            <div className="crew-col-email">Email</div>
            <div className="crew-col-tags">Tags</div>
            <div className="crew-col-status">Status</div>
            <div className="crew-col-actions">Actions</div>
          </div>

          {filteredCrew.map(crew => {
            const crewTags = getCrewTags(crew);
            const status = getConsentStatus(crew);

            return (
              <div key={crew.id} className="crew-table-row">
                <div className="crew-col-name">
                  <strong>{crew.name}</strong>
                </div>
                <div className="crew-col-phone">{crew.phone}</div>
                <div className="crew-col-email">{crew.email || '—'}</div>
                <div className="crew-col-tags">
                  {crewTags.length > 0 ? (
                    crewTags.map(tag => (
                      <span key={tag.id} className="tag-chip">{tag.tag_name}</span>
                    ))
                  ) : (
                    <span style={{color: '#999', fontSize: '12px'}}>No tags</span>
                  )}
                </div>
                <div className="crew-col-status">
                  <span className={`status-badge ${status.className}`}>
                    {status.label}
                  </span>
                </div>
                <div className="crew-col-actions">
                  <button className="btn-icon" onClick={() => handleEdit(crew)} title="Edit">
                    ✎
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Form Modal */}
      {showAddForm && (
        <CrewForm
          crew={editingCrew}
          tags={tags}
          hirer={hirer}
          onClose={handleCloseForm}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
}

export default CrewRoster;
