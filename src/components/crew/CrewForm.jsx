import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { validatePhone, validateEmail, checkPhoneDuplicate } from '../../lib/validation';

function CrewForm({ crew, tags, hirer, onClose, onSuccess }) {
  const isEdit = !!crew;

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    selectedTags: []
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});

  // Populate form when editing
  useEffect(() => {
    if (crew) {
      const crewTags = crew.crew_member_tags
        ? crew.crew_member_tags.map(cmt => cmt.crew_tags?.id).filter(Boolean)
        : [];

      setFormData({
        name: crew.name || '',
        phone: crew.phone || '',
        email: crew.email || '',
        selectedTags: crewTags
      });
    }
  }, [crew]);

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear field error when user types
    if (fieldErrors[name]) {
      setFieldErrors(prev => ({
        ...prev,
        [name]: null
      }));
    }
  }

  function toggleTag(tagId) {
    setFormData(prev => ({
      ...prev,
      selectedTags: prev.selectedTags.includes(tagId)
        ? prev.selectedTags.filter(id => id !== tagId)
        : [...prev.selectedTags, tagId]
    }));
  }

  function validateForm() {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else {
      const phoneValidation = validatePhone(formData.phone);
      if (!phoneValidation.valid) {
        errors.phone = phoneValidation.error;
      }
    }

    if (formData.email && !validateEmail(formData.email)) {
      errors.email = 'Invalid email format';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!validateForm()) {
      setLoading(false);
      return;
    }

    try {
      const phoneValidation = validatePhone(formData.phone);
      const normalizedPhone = phoneValidation.normalized;

      // Check for duplicate phone (skip if editing same crew member)
      if (!isEdit || normalizedPhone !== crew.phone) {
        const { isDuplicate, existingCrew } = await checkPhoneDuplicate(formData.phone);
        if (isDuplicate) {
          setError(`Phone number already registered for ${existingCrew.name}`);
          setLoading(false);
          return;
        }
      }

      let crewMemberId;

      if (isEdit) {
        // Update existing crew member
        const { error: updateError } = await supabase
          .from('crew_members')
          .update({
            name: formData.name.trim(),
            phone: normalizedPhone,
            email: formData.email.trim() || null
          })
          .eq('id', crew.id);

        if (updateError) throw updateError;
        crewMemberId = crew.id;

        // Delete existing tag associations for this hirer
        const { error: deleteError } = await supabase
          .from('crew_member_tags')
          .delete()
          .eq('crew_member_id', crew.id)
          .eq('hirer_id', hirer.id);

        if (deleteError) throw deleteError;
      } else {
        // Insert new crew member
        const { data: newCrew, error: insertError } = await supabase
          .from('crew_members')
          .insert({
            name: formData.name.trim(),
            phone: normalizedPhone,
            email: formData.email.trim() || null
          })
          .select()
          .single();

        if (insertError) throw insertError;
        crewMemberId = newCrew.id;
      }

      // Insert new tag associations
      if (formData.selectedTags.length > 0) {
        const tagInserts = formData.selectedTags.map(tagId => ({
          crew_member_id: crewMemberId,
          crew_tag_id: tagId,
          hirer_id: hirer.id
        }));

        const { error: tagError } = await supabase
          .from('crew_member_tags')
          .insert(tagInserts);

        if (tagError) throw tagError;
      }

      onSuccess();
    } catch (err) {
      console.error('Error saving crew member:', err);
      setError(err.message || 'Failed to save crew member');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{isEdit ? 'Edit Crew Member' : 'Add Crew Member'}</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={`form-group ${fieldErrors.name ? 'error' : ''}`}>
            <label htmlFor="name">Name *</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="John Doe"
              required
            />
            {fieldErrors.name && <div className="error-text">{fieldErrors.name}</div>}
          </div>

          <div className={`form-group ${fieldErrors.phone ? 'error' : ''}`}>
            <label htmlFor="phone">Phone Number *</label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="555-123-4567"
              required
            />
            <small>10-digit US number or international format</small>
            {fieldErrors.phone && <div className="error-text">{fieldErrors.phone}</div>}
          </div>

          <div className={`form-group ${fieldErrors.email ? 'error' : ''}`}>
            <label htmlFor="email">Email (Optional)</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="john@example.com"
            />
            {fieldErrors.email && <div className="error-text">{fieldErrors.email}</div>}
          </div>

          <div className="form-group">
            <label>Tags</label>
            {tags.length === 0 ? (
              <p style={{color: '#999', fontSize: '14px'}}>
                No tags available. Create tags in the Tags tab first.
              </p>
            ) : (
              <div style={{display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px'}}>
                {tags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    className={`tag-chip-filter ${formData.selectedTags.includes(tag.id) ? 'active' : ''}`}
                    onClick={() => toggleTag(tag.id)}
                  >
                    {tag.tag_name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {error && (
            <div className="error-message">
              <strong>Error:</strong> {error}
            </div>
          )}

          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (isEdit ? 'Update Crew Member' : 'Add Crew Member')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CrewForm;
