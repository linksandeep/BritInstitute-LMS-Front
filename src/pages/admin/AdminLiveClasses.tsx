import React, { useEffect, useState } from 'react';
import { batchApi, liveClassApi } from '../../api';

interface Batch { _id: string; name: string; course?: { title: string } }
interface LiveClass {
  _id: string; classNumber: string; topic: string; zoomLink: string;
  scheduledAt: string; duration: number; status: string;
  batch: Batch;
}

export default function AdminLiveClasses() {
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editClass, setEditClass] = useState<LiveClass | null>(null);
  const [form, setForm] = useState({ batch: '', classNumber: '', topic: '', zoomLink: '', scheduledAt: '', duration: '60' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [br, lr] = await Promise.all([batchApi.getAll(), liveClassApi.getAll()]);
      setBatches(br.data.batches);
      setClasses(lr.data.liveClasses);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditClass(null);
    setForm({ batch: batches[0]?._id || '', classNumber: '', topic: '', zoomLink: '', scheduledAt: '', duration: '60' });
    setError(''); setShowModal(true);
  };

  const openEdit = (c: LiveClass) => {
    setEditClass(c);
    const localDT = new Date(c.scheduledAt).toISOString().slice(0, 16);
    setForm({ batch: c.batch?._id || '', classNumber: c.classNumber, topic: c.topic, zoomLink: c.zoomLink, scheduledAt: localDT, duration: String(c.duration) });
    setError(''); setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    const { batch, classNumber, topic, zoomLink, scheduledAt, duration } = form;
    if (!batch || !classNumber || !topic || !zoomLink || !scheduledAt) { setError('All fields are required'); return; }
    setSaving(true);
    try {
      const payload = { batch, classNumber, topic, zoomLink, scheduledAt: new Date(scheduledAt).toISOString(), duration: Number(duration) };
      if (editClass) await liveClassApi.update(editClass._id, payload);
      else await liveClassApi.create(payload);
      await fetchAll();
      setShowModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'An error occurred');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this class?')) return;
    await liveClassApi.delete(id);
    await fetchAll();
  };

  const statusColor: Record<string, string> = { scheduled: 'badge-scheduled', live: 'badge-live', ended: 'badge-ended' };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Live Classes</h1>
          <p className="page-subtitle">Manage Zoom sessions scoped by Batch</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Schedule Class</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Class #</th>
              <th>Topic</th>
              <th>Batch</th>
              <th>Course</th>
              <th>Scheduled At</th>
              <th>Duration</th>
              <th>Status</th>
              <th>Zoom Link</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 ? (
              <tr><td colSpan={9}><div className="empty-state"><div className="empty-icon">🎥</div><p>No live classes scheduled.</p></div></td></tr>
            ) : classes.map(cls => (
              <tr key={cls._id}>
                <td><strong>{cls.classNumber}</strong></td>
                <td>{cls.topic}</td>
                <td><span className="badge badge-scheduled" style={{background: 'var(--accent-light)', color: 'var(--accent)'}}>{cls.batch?.name}</span></td>
                <td style={{ color: 'var(--text-muted)' }}>{cls.batch?.course?.title || '—'}</td>
                <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{new Date(cls.scheduledAt).toLocaleString()}</td>
                <td style={{ color: 'var(--text-muted)' }}>{cls.duration}m</td>
                <td><span className={`badge ${statusColor[cls.status] || 'badge-ended'}`}>{cls.status}</span></td>
                <td>
                  <a href={cls.zoomLink} target="_blank" rel="noreferrer"
                    style={{ color: 'var(--accent)', fontSize: '13px', textDecoration: 'none' }}>
                    🔗 Open
                  </a>
                </td>
                <td>
                  <div className="actions-row">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(cls)}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(cls._id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editClass ? '✏️ Edit Live Class' : '📅 Schedule Live Class'}</h2>
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
                <label className="form-label">Class Number</label>
                <input className="form-input" placeholder="e.g. Class 1" value={form.classNumber} onChange={e => setForm(f => ({ ...f, classNumber: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Topic</label>
              <input className="form-input" placeholder="What will be taught?" value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Zoom Meeting Link</label>
              <input className="form-input" placeholder="https://zoom.us/j/..." value={form.zoomLink} onChange={e => setForm(f => ({ ...f, zoomLink: e.target.value }))} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Date & Time</label>
                <input className="form-input" type="datetime-local" value={form.scheduledAt} onChange={e => setForm(f => ({ ...f, scheduledAt: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Duration (minutes)</label>
                <input className="form-input" type="number" min="15" max="480" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: e.target.value }))} />
              </div>
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editClass ? '✓ Update' : '📅 Schedule')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
