import React, { useEffect, useState } from 'react';
import { batchApi, assignmentApi } from '../../api';

interface Batch { _id: string; name: string; course?: { title: string } }
interface Assignment {
  _id: string; title: string; description: string; dueDate: string;
  attachmentUrl?: string; batch: Batch; createdAt: string;
}

export default function AdminAssignments() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAss, setEditAss] = useState<Assignment | null>(null);
  const [form, setForm] = useState({ batch: '', title: '', description: '', dueDate: '', attachmentUrl: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [br, ar] = await Promise.all([batchApi.getAll(), assignmentApi.getAll()]);
      setBatches(br.data.batches);
      setAssignments(ar.data.assignments);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditAss(null);
    setForm({ batch: batches[0]?._id || '', title: '', description: '', dueDate: '', attachmentUrl: '' });
    setError(''); setShowModal(true);
  };

  const openEdit = (a: Assignment) => {
    setEditAss(a);
    setForm({ batch: a.batch?._id || '', title: a.title, description: a.description, dueDate: new Date(a.dueDate).toISOString().slice(0, 10), attachmentUrl: a.attachmentUrl || '' });
    setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.batch || !form.title || !form.description || !form.dueDate) { setError('All required fields must be filled'); return; }
    setSaving(true);
    try {
      const payload = { ...form, dueDate: new Date(form.dueDate).toISOString() };
      if (editAss) await assignmentApi.update(editAss._id, payload);
      else await assignmentApi.create(payload);
      await fetchAll();
      setShowModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'An error occurred');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this assignment?')) return;
    await assignmentApi.delete(id);
    await fetchAll();
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Assignments</h1>
          <p className="page-subtitle">Create and manage assignments for your batches</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ New Assignment</button>
      </div>

      {assignments.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">📝</div><p>No assignments yet.</p></div></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr><th>Title</th><th>Batch</th><th>Course</th><th>Due Date</th><th>Status</th><th>Attachment</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {assignments.map(a => (
                <tr key={a._id}>
                  <td>
                    <strong>{a.title}</strong>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{a.description.slice(0, 60)}{a.description.length > 60 ? '…' : ''}</p>
                  </td>
                  <td><span className="badge badge-scheduled" style={{background: 'var(--accent-light)', color: 'var(--accent)'}}>{a.batch?.name}</span></td>
                  <td style={{ color: 'var(--text-muted)' }}>{a.batch?.course?.title || '—'}</td>
                  <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(a.dueDate).toLocaleDateString()}</td>
                  <td>
                    {isOverdue(a.dueDate)
                      ? <span className="badge badge-overdue">⏰ Overdue</span>
                      : <span className="badge badge-scheduled">📅 Upcoming</span>}
                  </td>
                  <td>
                    {a.attachmentUrl ? <a href={a.attachmentUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none' }}>📎 View</a> : <span className="text-muted">—</span>}
                  </td>
                  <td>
                    <div className="actions-row">
                      <button className="btn btn-secondary btn-sm" onClick={() => openEdit(a)}>✏️</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(a._id)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editAss ? '✏️ Edit Assignment' : '📝 New Assignment'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">⚠️ {error}</div>}
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Batch</label>
                <select className="form-select" value={form.batch} onChange={e => setForm(f => ({ ...f, batch: e.target.value }))}>
                  <option value="">— Select Batch —</option>
                  {batches.map(b => <option key={b._id} value={b._id}>{b.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Due Date</label>
                <input className="form-input" type="date" value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" placeholder="Assignment title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Description / Instructions</label>
              <textarea className="form-textarea" rows={4} placeholder="Detailed instructions for students..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Attachment URL (optional)</label>
              <input className="form-input" placeholder="https://..." value={form.attachmentUrl} onChange={e => setForm(f => ({ ...f, attachmentUrl: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editAss ? '✓ Update' : '+ Create')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
