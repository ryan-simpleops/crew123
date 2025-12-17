import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import ListBuilder from './ListBuilder';

function ListManager({ lists, crewMembers, tags, hirer, onRefresh }) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedList, setSelectedList] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    position_name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingListId, setDeletingListId] = useState(null);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  }

  async function handleCreateList(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const listName = formData.name.trim();
    const positionName = formData.position_name.trim();

    if (!listName || !positionName) {
      setError('Both list name and position name are required');
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('crew_lists')
        .insert({
          hirer_id: hirer.id,
          name: listName,
          position_name: positionName
        });

      if (insertError) throw insertError;

      setFormData({ name: '', position_name: '' });
      setShowCreateModal(false);
      onRefresh();
    } catch (err) {
      console.error('Error creating list:', err);
      setError(err.message || 'Failed to create list');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteList(listId, listName) {
    const memberCount = lists.find(l => l.id === listId)?.crew_list_members?.length || 0;

    const confirmMessage = memberCount > 0
      ? `Delete list "${listName}"?\n\nThis list has ${memberCount} crew member${memberCount !== 1 ? 's' : ''}. This action cannot be undone.`
      : `Delete list "${listName}"?`;

    if (!confirm(confirmMessage)) {
      return;
    }

    setDeletingListId(listId);

    try {
      // Delete list members first (cascade should handle this but being explicit)
      const { error: deleteMembersError } = await supabase
        .from('crew_list_members')
        .delete()
        .eq('crew_list_id', listId);

      if (deleteMembersError) throw deleteMembersError;

      // Delete the list
      const { error: deleteListError } = await supabase
        .from('crew_lists')
        .delete()
        .eq('id', listId)
        .eq('hirer_id', hirer.id);

      if (deleteListError) throw deleteListError;

      onRefresh();
    } catch (err) {
      console.error('Error deleting list:', err);
      alert(`Error deleting list: ${err.message}`);
    } finally {
      setDeletingListId(null);
    }
  }

  function handleOpenList(list) {
    setSelectedList(list);
  }

  function handleCloseBuilder() {
    setSelectedList(null);
    onRefresh();
  }

  if (selectedList) {
    return (
      <ListBuilder
        list={selectedList}
        crewMembers={crewMembers}
        tags={tags}
        hirer={hirer}
        onClose={handleCloseBuilder}
        onRefresh={onRefresh}
      />
    );
  }

  return (
    <div className="crew-section">
      <div className="section-header">
        <h2>Priority Lists ({lists.length})</h2>
        <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
          + Create New List
        </button>
      </div>

      <p style={{color: '#666', marginBottom: '24px'}}>
        Create priority lists for job positions. When posting a job, you'll select a list and crew will be contacted in priority order.
      </p>

      {lists.length === 0 ? (
        <div className="empty-state">
          <h3>No lists yet</h3>
          <p>Create your first priority list to start organizing crew for jobs</p>
          <button className="btn-primary" onClick={() => setShowCreateModal(true)}>
            Create First List
          </button>
        </div>
      ) : (
        <div className="list-grid">
          {lists.map(list => {
            const memberCount = list.crew_list_members?.length || 0;

            return (
              <div key={list.id} className="list-card">
                <div className="list-card-header">
                  <h3>{list.name}</h3>
                  <span className="position-badge">{list.position_name}</span>
                </div>

                <div className="list-card-body">
                  <p style={{fontSize: '14px', color: '#666', marginBottom: '16px'}}>
                    {memberCount} crew member{memberCount !== 1 ? 's' : ''} in priority order
                  </p>

                  <div className="list-card-actions">
                    <button className="btn-primary" onClick={() => handleOpenList(list)}>
                      Manage List
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteList(list.id, list.name)}
                      disabled={deletingListId === list.id}
                      style={{fontSize: '12px', padding: '8px 12px'}}
                    >
                      {deletingListId === list.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create List Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New List</h2>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>×</button>
            </div>

            <form onSubmit={handleCreateList}>
              <div className="form-group">
                <label htmlFor="name">List Name *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="e.g., Top 5 Camera Ops, Best Boy Grips"
                  required
                />
                <small>Internal name for you to identify this list</small>
              </div>

              <div className="form-group">
                <label htmlFor="position_name">Position Name *</label>
                <input
                  type="text"
                  id="position_name"
                  name="position_name"
                  value={formData.position_name}
                  onChange={handleChange}
                  placeholder="e.g., 1st AC, Best Boy Grip, Gaffer"
                  required
                />
                <small>Position title used in SMS messages to crew</small>
              </div>

              {error && (
                <div className="error-message">
                  <strong>Error:</strong> {error}
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? 'Creating...' : 'Create List'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ListManager;
