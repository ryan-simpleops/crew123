import { useState } from 'react';
import { supabase } from '../../lib/supabase';

function TagManager({ tags, hirer, onRefresh }) {
  const [newTagName, setNewTagName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [deletingTagId, setDeletingTagId] = useState(null);

  async function handleCreateTag(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const tagName = newTagName.trim();

    if (!tagName) {
      setError('Tag name cannot be empty');
      setLoading(false);
      return;
    }

    // Check if tag already exists
    if (tags.some(t => t.tag_name.toLowerCase() === tagName.toLowerCase())) {
      setError('A tag with this name already exists');
      setLoading(false);
      return;
    }

    try {
      const { error: insertError } = await supabase
        .from('crew_tags')
        .insert({
          hirer_id: hirer.id,
          tag_name: tagName
        });

      if (insertError) throw insertError;

      setNewTagName('');
      onRefresh();
    } catch (err) {
      console.error('Error creating tag:', err);
      setError(err.message || 'Failed to create tag');
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteTag(tagId, tagName) {
    if (!confirm(`Delete tag "${tagName}"?\n\nThis will remove the tag from all crew members.`)) {
      return;
    }

    setDeletingTagId(tagId);
    setError(null);

    try {
      // Delete tag associations first
      const { error: deleteAssocError } = await supabase
        .from('crew_member_tags')
        .delete()
        .eq('crew_tag_id', tagId)
        .eq('hirer_id', hirer.id);

      if (deleteAssocError) throw deleteAssocError;

      // Delete the tag itself
      const { error: deleteTagError } = await supabase
        .from('crew_tags')
        .delete()
        .eq('id', tagId)
        .eq('hirer_id', hirer.id);

      if (deleteTagError) throw deleteTagError;

      onRefresh();
    } catch (err) {
      console.error('Error deleting tag:', err);
      setError(err.message || 'Failed to delete tag');
    } finally {
      setDeletingTagId(null);
    }
  }

  async function getTagUsageCount(tagId) {
    const { count } = await supabase
      .from('crew_member_tags')
      .select('*', { count: 'exact', head: true })
      .eq('crew_tag_id', tagId)
      .eq('hirer_id', hirer.id);

    return count || 0;
  }

  return (
    <div className="crew-section">
      <div className="section-header">
        <h2>Position Tags ({tags.length})</h2>
      </div>

      <p style={{color: '#666', marginBottom: '24px'}}>
        Create tags to categorize and filter your crew roster. Tags help you quickly find crew members when building lists.
      </p>

      {/* Create new tag */}
      <form onSubmit={handleCreateTag} style={{marginBottom: '32px'}}>
        <div style={{display: 'flex', gap: '12px', maxWidth: '500px'}}>
          <input
            type="text"
            className="search-input"
            placeholder="e.g., Camera, Grip, Gaffer, Sound..."
            value={newTagName}
            onChange={(e) => setNewTagName(e.target.value)}
            style={{flex: 1}}
          />
          <button type="submit" className="btn-primary" disabled={loading || !newTagName.trim()}>
            {loading ? 'Creating...' : '+ Create Tag'}
          </button>
        </div>
        {error && (
          <div className="error-message" style={{marginTop: '12px'}}>
            <strong>Error:</strong> {error}
          </div>
        )}
      </form>

      {/* Tag list */}
      {tags.length === 0 ? (
        <div className="empty-state">
          <h3>No tags yet</h3>
          <p>Create your first position tag to start organizing your crew</p>
        </div>
      ) : (
        <div className="tag-list">
          {tags.map(tag => (
            <TagCard
              key={tag.id}
              tag={tag}
              onDelete={handleDeleteTag}
              isDeleting={deletingTagId === tag.id}
              getUsageCount={getTagUsageCount}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TagCard({ tag, onDelete, isDeleting, getUsageCount }) {
  const [usageCount, setUsageCount] = useState(null);

  useState(() => {
    getUsageCount(tag.id).then(setUsageCount);
  }, [tag.id]);

  return (
    <div className="tag-card">
      <div className="tag-card-content">
        <div className="tag-card-name">
          <span className="tag-chip" style={{fontSize: '14px', padding: '6px 16px'}}>
            {tag.tag_name}
          </span>
        </div>
        <div className="tag-card-info">
          {usageCount !== null && (
            <span style={{fontSize: '14px', color: '#666'}}>
              {usageCount} crew member{usageCount !== 1 ? 's' : ''}
            </span>
          )}
        </div>
      </div>
      <button
        className="btn-danger"
        onClick={() => onDelete(tag.id, tag.tag_name)}
        disabled={isDeleting}
        style={{fontSize: '12px', padding: '6px 12px'}}
      >
        {isDeleting ? 'Deleting...' : 'Delete'}
      </button>
    </div>
  );
}

export default TagManager;
