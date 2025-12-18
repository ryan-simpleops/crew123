import { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { validatePhone, validateEmail } from '../../lib/validation';

function CSVImport({ tags, hirer, onRefresh }) {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importResults, setImportResults] = useState(null);

  function handleFileChange(e) {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please select a CSV file');
      return;
    }

    setFile(selectedFile);
    parseCSV(selectedFile);
  }

  function parseCSV(file) {
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target.result;
      const lines = content.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        alert('CSV file is empty');
        return;
      }

      // Parse header
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());

      // Expected format: name,phone,email,tags
      if (!headers.includes('name') || !headers.includes('phone') || !headers.includes('email')) {
        alert('CSV must have "name", "phone", and "email" columns');
        return;
      }

      // Parse data rows
      const rows = lines.slice(1).map((line, index) => {
        const values = parseCSVLine(line);
        const row = {};

        headers.forEach((header, i) => {
          row[header] = values[i]?.trim() || '';
        });

        // Validate row
        const errors = [];
        const warnings = [];

        if (!row.name) {
          errors.push('Name is required');
        }

        if (!row.phone) {
          errors.push('Phone is required');
        } else {
          const phoneValidation = validatePhone(row.phone);
          if (!phoneValidation.valid) {
            errors.push(phoneValidation.error);
          } else {
            row.normalized_phone = phoneValidation.normalized;
          }
        }

        if (!row.email) {
          errors.push('Email is required');
        } else if (!validateEmail(row.email)) {
          errors.push('Invalid email format');
        }

        // Parse tags
        if (row.tags) {
          row.parsed_tags = row.tags.split(',').map(t => t.trim()).filter(Boolean);

          // Check for new tags
          row.new_tags = row.parsed_tags.filter(
            tagName => !tags.some(t => t.tag_name.toLowerCase() === tagName.toLowerCase())
          );

          if (row.new_tags.length > 0) {
            warnings.push(`Will create new tags: ${row.new_tags.join(', ')}`);
          }
        } else {
          row.parsed_tags = [];
          row.new_tags = [];
        }

        return {
          ...row,
          row_number: index + 2, // +2 for header and 1-indexed
          errors,
          warnings,
          valid: errors.length === 0
        };
      });

      setParsedData(rows);
    };

    reader.onerror = () => {
      alert('Error reading file');
    };

    reader.readAsText(file);
  }

  // Simple CSV line parser that handles quoted fields
  function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current);
    return result;
  }

  async function handleImport() {
    const validRows = parsedData.filter(row => row.valid);

    if (validRows.length === 0) {
      alert('No valid rows to import');
      return;
    }

    if (!confirm(`Import ${validRows.length} crew member${validRows.length !== 1 ? 's' : ''}?`)) {
      return;
    }

    setImporting(true);
    const results = { success: 0, failed: 0, errors: [] };

    for (const row of validRows) {
      try {
        // Insert or update crew member
        const { data: crewMember, error: crewError } = await supabase
          .from('crew_members')
          .upsert({
            phone: row.normalized_phone,
            name: row.name,
            email: row.email
          }, {
            onConflict: 'phone',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (crewError) throw crewError;

        // Handle tags
        if (row.parsed_tags.length > 0) {
          for (const tagName of row.parsed_tags) {
            // Get or create tag
            const { data: tag, error: tagError } = await supabase
              .from('crew_tags')
              .upsert({
                hirer_id: hirer.id,
                tag_name: tagName
              }, {
                onConflict: 'hirer_id,tag_name',
                ignoreDuplicates: false
              })
              .select()
              .single();

            if (tagError) throw tagError;

            // Link crew to tag (ignore if already linked)
            await supabase
              .from('crew_member_tags')
              .upsert({
                crew_member_id: crewMember.id,
                crew_tag_id: tag.id,
                hirer_id: hirer.id
              }, {
                onConflict: 'crew_member_id,crew_tag_id,hirer_id',
                ignoreDuplicates: true
              });
          }
        }

        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: row.row_number,
          name: row.name,
          error: error.message
        });
      }
    }

    setImporting(false);
    setImportResults(results);

    if (results.success > 0) {
      onRefresh();
    }
  }

  function handleReset() {
    setFile(null);
    setParsedData([]);
    setImportResults(null);
  }

  const validCount = parsedData.filter(r => r.valid).length;
  const invalidCount = parsedData.length - validCount;

  return (
    <div className="crew-section">
      <div className="section-header">
        <h2>Import Crew from CSV</h2>
      </div>

      <p style={{color: '#666', marginBottom: '16px'}}>
        Upload a CSV file to bulk import crew members. All fields (name, phone, email) are required.
        Email is needed to send SMS opt-in invitations.
      </p>

      <div className="csv-format-example">
        <code>name,phone,email,tags</code>
        <br />
        <code>John Doe,555-123-4567,john@example.com,"Camera,Grip"</code>
        <br />
        <code>Jane Smith,555-987-6543,jane@example.com,Lighting</code>
      </div>

      {/* File upload */}
      {!file && (
        <div className="file-upload-area">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            id="csv-file-input"
            style={{display: 'none'}}
          />
          <label htmlFor="csv-file-input" className="file-upload-label">
            <div className="upload-icon">📄</div>
            <p>Click to select CSV file</p>
            <p style={{fontSize: '13px', color: '#999'}}>or drag and drop</p>
          </label>
        </div>
      )}

      {/* Preview and validation */}
      {parsedData.length > 0 && !importResults && (
        <>
          <div className="import-summary">
            <h3>Import Preview</h3>
            <div className="summary-stats">
              <div className="stat-item stat-success">
                <strong>{validCount}</strong> valid
              </div>
              {invalidCount > 0 && (
                <div className="stat-item stat-error">
                  <strong>{invalidCount}</strong> invalid
                </div>
              )}
            </div>
          </div>

          <div className="csv-preview-table">
            <div className="csv-preview-header">
              <div>Row</div>
              <div>Name</div>
              <div>Phone</div>
              <div>Email</div>
              <div>Tags</div>
              <div>Status</div>
            </div>

            {parsedData.map(row => (
              <div key={row.row_number} className={`csv-preview-row ${!row.valid ? 'invalid' : ''}`}>
                <div style={{color: '#999'}}>#{row.row_number}</div>
                <div><strong>{row.name}</strong></div>
                <div>{row.phone}</div>
                <div style={{fontSize: '13px'}}>{row.email || <span style={{color: '#999'}}>—</span>}</div>
                <div>
                  {row.parsed_tags.length > 0 ? (
                    row.parsed_tags.map((tag, i) => (
                      <span key={i} className="tag-chip" style={{fontSize: '11px', padding: '2px 8px'}}>
                        {tag}
                        {row.new_tags.includes(tag) && ' (new)'}
                      </span>
                    ))
                  ) : (
                    <span style={{color: '#999', fontSize: '12px'}}>—</span>
                  )}
                </div>
                <div>
                  {row.valid ? (
                    <span className="status-badge sms-confirmed">✓ Valid</span>
                  ) : (
                    <div>
                      <span className="status-badge opted-out">✗ Invalid</span>
                      <div style={{fontSize: '12px', color: '#dc3545', marginTop: '4px'}}>
                        {row.errors.join(', ')}
                      </div>
                    </div>
                  )}
                  {row.warnings.length > 0 && (
                    <div style={{fontSize: '11px', color: '#856404', marginTop: '4px'}}>
                      {row.warnings.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div style={{marginTop: '24px', display: 'flex', gap: '12px'}}>
            <button className="btn-secondary" onClick={handleReset}>
              Cancel
            </button>
            <button
              className="btn-primary"
              onClick={handleImport}
              disabled={importing || validCount === 0}
            >
              {importing ? 'Importing...' : `Import ${validCount} Crew Member${validCount !== 1 ? 's' : ''}`}
            </button>
          </div>
        </>
      )}

      {/* Import results */}
      {importResults && (
        <div className="import-results">
          <h3>Import Complete</h3>

          {importResults.success > 0 && (
            <div className="success-message">
              Successfully imported {importResults.success} crew member{importResults.success !== 1 ? 's' : ''}
            </div>
          )}

          {importResults.failed > 0 && (
            <div className="error-message">
              <strong>Failed to import {importResults.failed} row{importResults.failed !== 1 ? 's' : ''}:</strong>
              <ul style={{marginTop: '8px', paddingLeft: '20px'}}>
                {importResults.errors.map((err, i) => (
                  <li key={i}>
                    Row {err.row} ({err.name}): {err.error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button className="btn-primary" onClick={handleReset} style={{marginTop: '16px'}}>
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}

export default CSVImport;
