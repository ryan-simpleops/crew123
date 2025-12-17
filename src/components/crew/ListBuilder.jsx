import { useState } from 'react';
import { supabase } from '../../lib/supabase';

function ListBuilder({ list, crewMembers, tags, hirer, onClose, onRefresh }) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedTags, setSelectedTags] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [movingMemberId, setMovingMemberId] = useState(null);
  const [removingMemberId, setRemovingMemberId] = useState(null);

  // Get list members sorted by priority
  const listMembers = (list.crew_list_members || [])
    .sort((a, b) => a.priority_order - b.priority_order);

  // Get available crew (not already in list)
  const listMemberIds = listMembers.map(lm => lm.crew_member_id);
  const availableCrew = crewMembers.filter(crew => !listMemberIds.includes(crew.id));

  // Filter available crew by search and tags
  const filteredAvailableCrew = availableCrew.filter(crew => {
    const matchesSearch = searchTerm === '' ||
      crew.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (crew.phone && crew.phone.includes(searchTerm));

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

  async function handleAddCrew(crewId) {
    try {
      const nextPriority = listMembers.length > 0
        ? Math.max(...listMembers.map(lm => lm.priority_order)) + 1
        : 1;

      const { error } = await supabase
        .from('crew_list_members')
        .insert({
          crew_list_id: list.id,
          crew_member_id: crewId,
          priority_order: nextPriority
        });

      if (error) throw error;

      onRefresh();
    } catch (err) {
      console.error('Error adding crew to list:', err);
      alert(`Error adding crew: ${err.message}`);
    }
  }

  async function handleRemoveCrew(listMemberId, crewMemberId) {
    setRemovingMemberId(crewMemberId);

    try {
      const { error } = await supabase
        .from('crew_list_members')
        .delete()
        .eq('id', listMemberId);

      if (error) throw error;

      // Reorder remaining members to close gaps
      await reorderMembers();
      onRefresh();
    } catch (err) {
      console.error('Error removing crew from list:', err);
      alert(`Error removing crew: ${err.message}`);
    } finally {
      setRemovingMemberId(null);
    }
  }

  async function handleMoveUp(memberIndex) {
    if (memberIndex === 0) return;

    setMovingMemberId(listMembers[memberIndex].crew_member_id);

    try {
      const currentMember = listMembers[memberIndex];
      const aboveMember = listMembers[memberIndex - 1];

      // Swap priority orders
      await supabase
        .from('crew_list_members')
        .update({ priority_order: currentMember.priority_order })
        .eq('id', aboveMember.id);

      await supabase
        .from('crew_list_members')
        .update({ priority_order: aboveMember.priority_order })
        .eq('id', currentMember.id);

      onRefresh();
    } catch (err) {
      console.error('Error moving crew:', err);
      alert(`Error reordering: ${err.message}`);
    } finally {
      setMovingMemberId(null);
    }
  }

  async function handleMoveDown(memberIndex) {
    if (memberIndex === listMembers.length - 1) return;

    setMovingMemberId(listMembers[memberIndex].crew_member_id);

    try {
      const currentMember = listMembers[memberIndex];
      const belowMember = listMembers[memberIndex + 1];

      // Swap priority orders
      await supabase
        .from('crew_list_members')
        .update({ priority_order: currentMember.priority_order })
        .eq('id', belowMember.id);

      await supabase
        .from('crew_list_members')
        .update({ priority_order: belowMember.priority_order })
        .eq('id', currentMember.id);

      onRefresh();
    } catch (err) {
      console.error('Error moving crew:', err);
      alert(`Error reordering: ${err.message}`);
    } finally {
      setMovingMemberId(null);
    }
  }

  async function reorderMembers() {
    const members = listMembers.filter(lm => lm.id !== removingMemberId);

    for (let i = 0; i < members.length; i++) {
      await supabase
        .from('crew_list_members')
        .update({ priority_order: i + 1 })
        .eq('id', members[i].id);
    }
  }

  return (
    <div className="crew-section">
      <div className="section-header">
        <div>
          <button className="btn-secondary" onClick={onClose} style={{marginBottom: '8px'}}>
            ← Back to Lists
          </button>
          <h2>{list.name}</h2>
          <span className="position-badge" style={{fontSize: '14px'}}>
            {list.position_name}
          </span>
        </div>
        <button className="btn-primary" onClick={() => setShowAddModal(true)}>
          + Add Crew from Roster
        </button>
      </div>

      {listMembers.length === 0 ? (
        <div className="empty-state">
          <h3>No crew in this list yet</h3>
          <p>Add crew members from your roster to build this priority list</p>
          <button className="btn-primary" onClick={() => setShowAddModal(true)}>
            Add First Crew Member
          </button>
        </div>
      ) : (
        <div className="list-builder-table">
          <div className="list-builder-header">
            <div className="col-priority">Priority</div>
            <div className="col-name">Name</div>
            <div className="col-phone">Phone</div>
            <div className="col-actions">Actions</div>
          </div>

          {listMembers.map((member, index) => {
            const crew = member.crew_members;
            if (!crew) return null;

            return (
              <div key={member.id} className="list-builder-row">
                <div className="col-priority">
                  <span className="priority-number">#{member.priority_order}</span>
                </div>
                <div className="col-name">
                  <strong>{crew.name}</strong>
                </div>
                <div className="col-phone">{crew.phone}</div>
                <div className="col-actions">
                  <button
                    className="btn-icon"
                    onClick={() => handleMoveUp(index)}
                    disabled={index === 0 || movingMemberId === crew.id}
                    title="Move up"
                  >
                    ↑
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleMoveDown(index)}
                    disabled={index === listMembers.length - 1 || movingMemberId === crew.id}
                    title="Move down"
                  >
                    ↓
                  </button>
                  <button
                    className="btn-icon"
                    onClick={() => handleRemoveCrew(member.id, crew.id)}
                    disabled={removingMemberId === crew.id}
                    title="Remove from list"
                    style={{color: '#dc3545'}}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Crew Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '800px'}}>
            <div className="modal-header">
              <h2>Add Crew to List</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>×</button>
            </div>

            {/* Search and filter */}
            <div className="filter-bar" style={{marginBottom: '16px'}}>
              <input
                type="text"
                className="search-input"
                placeholder="Search by name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {tags.length > 0 && (
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px'}}>
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

            {/* Available crew list */}
            {filteredAvailableCrew.length === 0 ? (
              <div className="empty-state">
                <p>
                  {availableCrew.length === 0
                    ? 'All crew members are already in this list'
                    : 'No crew found matching your filters'}
                </p>
              </div>
            ) : (
              <div className="available-crew-list">
                {filteredAvailableCrew.map(crew => (
                  <div key={crew.id} className="available-crew-item">
                    <div>
                      <strong>{crew.name}</strong>
                      <div style={{fontSize: '13px', color: '#666'}}>{crew.phone}</div>
                    </div>
                    <button className="btn-primary" onClick={() => handleAddCrew(crew.id)}>
                      Add to List
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ListBuilder;
