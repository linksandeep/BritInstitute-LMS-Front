import React, { useEffect, useState } from 'react';
import { batchApi, recordedApi } from '../../api';
import RecordedLecturePlayer from '../../components/RecordedLecturePlayer';
import { formatUkDate } from '../../utils/ukTime';

interface Batch { _id: string; name: string; course?: { title: string } }
interface Lecture {
  _id: string; title: string; description: string; videoUrl: string;
  videoType: string; recordingSource?: string; recordingStatus?: string;
  isPlayable?: boolean;
  order: number; batch: Batch; createdAt: string;
}

const typeLabels: Record<string, { label: string; icon: string }> = {
  youtube:     { label: 'YouTube', icon: '▶️' },
  drive:       { label: 'Google Drive', icon: '📁' },
  google_meet: { icon: '🎥', label: 'Meet Recording' },
  zoom:        { icon: '🎥', label: 'Zoom Recording' },
  other:       { label: 'Other', icon: '🔗' },
};

export default function AdminRecorded() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editLecture, setEditLecture] = useState<Lecture | null>(null);
  const [linkLecture, setLinkLecture] = useState<Lecture | null>(null);
  const [playerLecture, setPlayerLecture] = useState<Lecture | null>(null);
  const [form, setForm] = useState({ batch: '', title: '', description: '', videoUrl: '', videoType: 'youtube', order: '0' });
  const [linkForm, setLinkForm] = useState({ videoUrl: '', videoType: 'youtube' });
  const [error, setError] = useState('');
  const [linkError, setLinkError] = useState('');
  const [notice, setNotice] = useState('');
  const [saving, setSaving] = useState(false);
  const [savingLink, setSavingLink] = useState(false);
  const [syncingZoom, setSyncingZoom] = useState(false);

  const fetchAll = async () => {
    try {
      const [br, lr] = await Promise.all([batchApi.getAll(), recordedApi.getAll()]);
      setBatches(br.data.batches);
      setLectures(lr.data.lectures);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditLecture(null);
    setForm({ batch: batches[0]?._id || '', title: '', description: '', videoUrl: '', videoType: 'youtube', order: '0' });
    setError(''); setShowModal(true);
  };

  const openEdit = (l: Lecture) => {
    setEditLecture(l);
    setForm({ batch: l.batch?._id || '', title: l.title, description: l.description, videoUrl: l.videoUrl, videoType: l.videoType, order: String(l.order) });
    setError(''); setShowModal(true);
  };

  const openLinkUpdate = (l: Lecture) => {
    setLinkLecture(l);
    setLinkForm({ videoUrl: l.videoUrl || '', videoType: l.videoType || 'other' });
    setLinkError('');
    setNotice('');
  };

  const handleSave = async () => {
    setError('');
    if (!form.batch || !form.title || !form.videoUrl) { setError('Batch, title and video URL are required'); return; }
    setSaving(true);
    try {
      const payload = { ...form, order: Number(form.order) };
      if (editLecture) await recordedApi.update(editLecture._id, payload);
      else await recordedApi.create(payload);
      await fetchAll();
      setShowModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'An error occurred');
    } finally { setSaving(false); }
  };

  const handleSaveLink = async () => {
    if (!linkLecture) return;
    setLinkError('');
    if (!linkForm.videoUrl.trim()) {
      setLinkError('Recorded lecture link is required');
      return;
    }

    setSavingLink(true);
    try {
      await recordedApi.update(linkLecture._id, {
        videoUrl: linkForm.videoUrl.trim(),
        videoType: linkForm.videoType,
        replaceRecording: true,
      });
      await fetchAll();
      setLinkLecture(null);
      setNotice('Recorded lecture link updated.');
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setLinkError(msg || 'Unable to update recorded lecture link');
    } finally {
      setSavingLink(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this lecture?')) return;
    await recordedApi.delete(id);
    await fetchAll();
  };

  const handleSyncZoom = async () => {
    setNotice('');
    setError('');
    setSyncingZoom(true);
    try {
      const res = await recordedApi.syncZoom();
      setNotice(res.data.message || 'Zoom recordings synced.');
      await fetchAll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Unable to sync Zoom recordings');
    } finally {
      setSyncingZoom(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Recorded Lectures</h1>
          <p className="page-subtitle">Add YouTube, Drive or Meeting recording links scoped by Batch</p>
        </div>
        <div className="actions-row">
          <button className="btn btn-secondary" onClick={handleSyncZoom} disabled={syncingZoom}>
            {syncingZoom ? 'Syncing...' : 'Sync Zoom Recordings'}
          </button>
          <button className="btn btn-primary" onClick={openCreate}>+ Add Lecture</button>
        </div>
      </div>

      {notice && <div className="alert alert-success">{notice}</div>}
      {error && !showModal && <div className="alert alert-error">⚠️ {error}</div>}

      {lectures.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">🎬</div><p>No recorded lectures yet.</p></div></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Batch</th>
                <th>Course</th>
                <th>Type</th>
                <th>Player</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {lectures.map(l => {
                const type = typeLabels[l.videoType] || typeLabels.other;
                return (
                  <tr key={l._id}>
                    <td style={{ color: 'var(--text-muted)' }}>{l.order}</td>
                    <td><strong>{l.title}</strong>{l.description && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{l.description.slice(0, 50)}…</p>}</td>
                    <td><span className="badge badge-scheduled" style={{background: 'var(--accent-light)', color: 'var(--accent)'}}>{l.batch?.name}</span></td>
                    <td style={{ color: 'var(--text-muted)' }}>{l.batch?.course?.title || '—'}</td>
                    <td><span className={`badge badge-${l.videoType}`}>{type.icon} {type.label}</span></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => setPlayerLecture(l)}>
                        Play in LMS
                      </button>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{formatUkDate(l.createdAt)}</td>
                    <td>
                      <div className="actions-row">
                        <button className="btn btn-secondary btn-sm" onClick={() => openLinkUpdate(l)}>Update Link</button>
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(l)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(l._id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {linkLecture && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setLinkLecture(null); }}>
          <div className="modal" style={{ maxWidth: '620px' }}>
            <div className="modal-header">
              <h2>Update Recorded Link</h2>
              <button className="modal-close" onClick={() => setLinkLecture(null)}>✕</button>
            </div>
            {linkError && <div className="alert alert-error">⚠️ {linkError}</div>}
            <div className="form-group">
              <label className="form-label">Lecture</label>
              <input className="form-input" value={linkLecture.title} disabled />
            </div>
            <div className="form-group">
              <label className="form-label">Video Type</label>
              <select className="form-select" value={linkForm.videoType} onChange={e => setLinkForm(f => ({ ...f, videoType: e.target.value }))}>
                <option value="youtube">▶️ YouTube</option>
                <option value="drive">📁 Google Drive</option>
                <option value="google_meet">🎥 Meet Recording</option>
                <option value="zoom">🎥 Zoom Link</option>
                <option value="other">🔗 Other</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Recorded Lecture Link</label>
              <input className="form-input" placeholder="Paste the correct recording link" value={linkForm.videoUrl} onChange={e => setLinkForm(f => ({ ...f, videoUrl: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setLinkLecture(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveLink} disabled={savingLink}>
                {savingLink ? 'Updating...' : 'Update Link'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editLecture ? '✏️ Edit Lecture' : '🎬 Add Recorded Lecture'}</h2>
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
                <label className="form-label">Video Type</label>
                <select className="form-select" value={form.videoType} onChange={e => setForm(f => ({ ...f, videoType: e.target.value }))}>
                  <option value="youtube">▶️ YouTube</option>
                  <option value="drive">📁 Google Drive</option>
                  <option value="google_meet">🎥 Meet Recording</option>
                  <option value="zoom">🎥 Zoom Link</option>
                  <option value="other">🔗 Other</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Lecture Title</label>
              <input className="form-input" placeholder="e.g. Introduction to Python" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Video URL</label>
              <input className="form-input" placeholder="https://youtu.be/... or drive.google.com/..." value={form.videoUrl} onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea className="form-textarea" rows={3} placeholder="Brief description of this lecture..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Order / Position</label>
              <input className="form-input" type="number" min="0" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editLecture ? '✓ Update' : '+ Add Lecture')}
              </button>
            </div>
          </div>
        </div>
      )}

      {playerLecture && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setPlayerLecture(null); }}>
          <div className="modal recorded-player-modal">
            <div className="modal-header">
              <h2>{playerLecture.title}</h2>
              <button className="modal-close" onClick={() => setPlayerLecture(null)}>✕</button>
            </div>
            <RecordedLecturePlayer lecture={playerLecture} />
          </div>
        </div>
      )}
    </div>
  );
}
