import React, { useEffect, useMemo, useState } from 'react';
import { assignmentApi, batchApi } from '../../api';

interface Batch {
  _id: string;
  name: string;
  course?: { title: string };
}

interface Assignment {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
  attachmentUrl?: string;
  batch: Batch;
  createdAt: string;
  submissionCount?: number;
}

interface Submission {
  _id: string;
  driveLink?: string;
  fileLink?: string;
  repoLink?: string;
  notes?: string;
  status: 'submitted' | 'late';
  submittedAt: string;
  batch?: { name: string };
  student: { name: string; username: string; phone?: string; email?: string };
}

export default function AdminAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submissionModal, setSubmissionModal] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);
  const [editAssignment, setEditAssignment] = useState<Assignment | null>(null);
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [submissionSearch, setSubmissionSearch] = useState('');
  const [form, setForm] = useState({ batch: '', title: '', description: '', dueDate: '', attachmentUrl: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = async (batchFilter = selectedBatch) => {
    try {
      const [batchRes, assignmentRes] = await Promise.all([
        batchApi.getAll(),
        assignmentApi.getAll(batchFilter !== 'all' ? batchFilter : undefined),
      ]);
      setBatches(batchRes.data.batches);
      setAssignments(assignmentRes.data.assignments);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll('all');
  }, []);

  useEffect(() => {
    if (!loading) {
      void fetchAll(selectedBatch);
    }
  }, [selectedBatch]);

  const openCreate = () => {
    const defaultBatch = selectedBatch !== 'all' ? selectedBatch : (batches[0]?._id || '');
    setEditAssignment(null);
    setForm({ batch: defaultBatch, title: '', description: '', dueDate: '', attachmentUrl: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (assignment: Assignment) => {
    setEditAssignment(assignment);
    setForm({
      batch: assignment.batch?._id || '',
      title: assignment.title,
      description: assignment.description,
      dueDate: new Date(assignment.dueDate).toISOString().slice(0, 10),
      attachmentUrl: assignment.attachmentUrl || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.batch || !form.title || !form.description || !form.dueDate) {
      setError('All required fields must be filled');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, dueDate: new Date(form.dueDate).toISOString() };
      if (editAssignment) await assignmentApi.update(editAssignment._id, payload);
      else await assignmentApi.create(payload);
      await fetchAll(selectedBatch);
      setShowModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assignment?')) return;
    await assignmentApi.delete(id);
    await fetchAll(selectedBatch);
  };

  const openSubmissions = async (assignment: Assignment, search = '') => {
    setSubmissionModal(assignment);
    setSubmissionSearch(search);
    setLoadingSubmissions(true);
    try {
      const res = await assignmentApi.getSubmissions(assignment._id, search || undefined);
      setSubmissions(res.data.submissions || []);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const groupedAssignments = useMemo(() => {
    return assignments.reduce<Record<string, { batch: Batch; items: Assignment[] }>>((acc, assignment) => {
      const batchId = assignment.batch?._id || 'unassigned';
      if (!acc[batchId]) {
        acc[batchId] = { batch: assignment.batch, items: [] };
      }
      acc[batchId].items.push(assignment);
      return acc;
    }, {});
  }, [assignments]);

  const groupedEntries = Object.values(groupedAssignments);
  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Assignments</h1>
          <p className="page-subtitle">Review assignments batch-wise and open submissions with student details.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Assignment</button>
      </div>

      <div className="card" style={{ padding: '18px', marginBottom: '18px' }}>
        <div className="grid-2" style={{ alignItems: 'end' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Batch Filter</label>
            <select className="form-select" value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
              <option value="all">All batches</option>
              {batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.name}</option>)}
            </select>
          </div>
          <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Assignments are grouped by batch so teachers can review one cohort at a time.
          </div>
        </div>
      </div>

      {groupedEntries.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">📝</div><p>No assignments found for the selected batch.</p></div></div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {groupedEntries.map(({ batch, items }) => (
            <div key={batch?._id || 'unknown'} className="card section-shell">
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: '16px' }}>
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, marginBottom: '4px' }}>{batch?.name || 'Unknown Batch'}</h2>
                  <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{batch?.course?.title || 'No course assigned'} • {items.length} assignment{items.length !== 1 ? 's' : ''}</p>
                </div>
                <span className="badge badge-scheduled" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>Batch View</span>
              </div>

              <div className="table-wrapper">
                <table>
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Due Date</th>
                      <th>Status</th>
                      <th>Submissions</th>
                      <th>Attachment</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((assignment) => (
                      <tr key={assignment._id}>
                        <td>
                          <strong>{assignment.title}</strong>
                          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                            {assignment.description.slice(0, 90)}{assignment.description.length > 90 ? '…' : ''}
                          </p>
                        </td>
                        <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(assignment.dueDate).toLocaleDateString()}</td>
                        <td>
                          {isOverdue(assignment.dueDate)
                            ? <span className="badge badge-overdue">⏰ Overdue</span>
                            : <span className="badge badge-scheduled">📅 Upcoming</span>}
                        </td>
                        <td>
                          <button className="btn btn-secondary btn-sm" onClick={() => openSubmissions(assignment)}>
                            {assignment.submissionCount || 0} View
                          </button>
                        </td>
                        <td>
                          {assignment.attachmentUrl ? <a href={assignment.attachmentUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none' }}>📎 View</a> : <span className="text-muted">—</span>}
                        </td>
                        <td>
                          <div className="actions-row">
                            <button className="btn btn-secondary btn-sm" onClick={() => openEdit(assignment)}>✏️</button>
                            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(assignment._id)}>🗑️</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editAssignment ? '✏️ Edit Assignment' : '📝 New Assignment'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">⚠️ {error}</div>}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Batch</label>
                <select className="form-select" value={form.batch} onChange={(e) => setForm((prev) => ({ ...prev, batch: e.target.value }))}>
                  <option value="">— Select Batch —</option>
                  {batches.map((batch) => <option key={batch._id} value={batch._id}>{batch.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={form.dueDate} onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" placeholder="Assignment title" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Description / Instructions</label>
              <textarea className="form-textarea" rows={4} placeholder="Detailed instructions for students..." value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Attachment URL (optional)</label>
              <input className="form-input" placeholder="https://..." value={form.attachmentUrl} onChange={(e) => setForm((prev) => ({ ...prev, attachmentUrl: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editAssignment ? '✓ Update' : '+ Create')}
              </button>
            </div>
          </div>
        </div>
      )}

      {submissionModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setSubmissionModal(null); }}>
          <div className="modal" style={{ maxWidth: '920px' }}>
            <div className="modal-header">
              <div>
                <h2>Assignment Submissions</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
                  {submissionModal.title} • {submissionModal.batch?.name}
                </p>
              </div>
              <button className="modal-close" onClick={() => setSubmissionModal(null)}>X</button>
            </div>

            <div className="card" style={{ padding: '16px', marginBottom: '16px', boxShadow: 'none' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label">Search Students</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    className="form-input"
                    placeholder="Search by name, username, phone, or email"
                    value={submissionSearch}
                    onChange={(e) => setSubmissionSearch(e.target.value)}
                  />
                  <button className="btn btn-secondary" onClick={() => openSubmissions(submissionModal, submissionSearch)}>Search</button>
                </div>
              </div>
            </div>

            {loadingSubmissions ? (
              <div className="loading-center"><div className="spinner" /></div>
            ) : submissions.length === 0 ? (
              <div className="empty-state" style={{ padding: '32px' }}>
                <div className="empty-icon">📝</div>
                <p>No student submissions matched this view.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '520px', overflowY: 'auto', paddingRight: '4px' }}>
                {submissions.map((submission) => (
                  <div key={submission._id} className="soft-panel" style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <div>
                        <div style={{ fontWeight: 700 }}>{submission.student?.name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>@{submission.student?.username}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                          {[submission.student?.phone, submission.student?.email].filter(Boolean).join(' • ') || 'No contact details shared'}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span className={`badge ${submission.status === 'late' ? 'badge-overdue' : 'badge-present'}`}>{submission.status === 'late' ? 'Late' : 'Submitted'}</span>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>{new Date(submission.submittedAt).toLocaleString()}</div>
                        {submission.batch?.name && <div style={{ fontSize: '12px', color: 'var(--accent)', marginTop: '6px' }}>{submission.batch.name}</div>}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: submission.notes ? '10px' : 0 }}>
                      {submission.driveLink && <a className="btn btn-secondary btn-sm" href={submission.driveLink} target="_blank" rel="noreferrer">Drive Link</a>}
                      {submission.fileLink && <a className="btn btn-secondary btn-sm" href={submission.fileLink} target="_blank" rel="noreferrer">File Link</a>}
                      {submission.repoLink && <a className="btn btn-secondary btn-sm" href={submission.repoLink} target="_blank" rel="noreferrer">Repo Link</a>}
                    </div>
                    {submission.notes && <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{submission.notes}</p>}
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
