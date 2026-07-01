import React, { useEffect, useState } from 'react';
import { foundationApi } from '../../api';
import RecordedLecturePlayer from '../../components/RecordedLecturePlayer';
import { formatUkDate } from '../../utils/ukTime';

interface FoundationResource {
  _id: string;
  title: string;
  description: string;
  videoUrl: string;
  videoType: string;
  order: number;
  createdAt: string;
}

const typeLabels: Record<string, { label: string; icon: string }> = {
  youtube:     { label: 'YouTube', icon: '▶️' },
  drive:       { label: 'Google Drive', icon: '📁' },
  google_meet: { icon: '🎥', label: 'Meet Recording' },
  zoom:        { icon: '🎥', label: 'Zoom Link' },
  other:       { label: 'Other', icon: '🔗' },
};

const emptyForm = { title: '', description: '', videoUrl: '', videoType: 'youtube', order: '0' };

export default function AdminFoundation() {
  const [resources, setResources] = useState<FoundationResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editResource, setEditResource] = useState<FoundationResource | null>(null);
  const [playerResource, setPlayerResource] = useState<FoundationResource | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchResources = async () => {
    try {
      const res = await foundationApi.getAll();
      setResources(res.data.resources || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchResources(); }, []);

  const openCreate = () => {
    setEditResource(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (resource: FoundationResource) => {
    setEditResource(resource);
    setForm({
      title: resource.title,
      description: resource.description || '',
      videoUrl: resource.videoUrl,
      videoType: resource.videoType,
      order: String(resource.order || 0),
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.title || !form.videoUrl) {
      setError('Title and video URL are required');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, order: Number(form.order) };
      if (editResource) await foundationApi.update(editResource._id, payload);
      else await foundationApi.create(payload);
      await fetchResources();
      setShowModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this Foundation & Build-Up item?')) return;
    await foundationApi.delete(id);
    await fetchResources();
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Foundation & Build-Up</h1>
          <p className="page-subtitle">Manage shared videos and resources available to every student</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Resource</button>
      </div>

      {error && !showModal && <div className="alert alert-error">⚠️ {error}</div>}

      {resources.length === 0 ? (
        <div className="card"><div className="empty-state"><div className="empty-icon">FB</div><p>No Foundation & Build-Up resources yet.</p></div></div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Type</th>
                <th>Player</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {resources.map(resource => {
                const type = typeLabels[resource.videoType] || typeLabels.other;
                return (
                  <tr key={resource._id}>
                    <td style={{ color: 'var(--text-muted)' }}>{resource.order}</td>
                    <td><strong>{resource.title}</strong>{resource.description && <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{resource.description.slice(0, 60)}…</p>}</td>
                    <td><span className={`badge badge-${resource.videoType}`}>{type.icon} {type.label}</span></td>
                    <td>
                      <button className="btn btn-secondary btn-sm" onClick={() => setPlayerResource(resource)}>
                        Preview
                      </button>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{formatUkDate(resource.createdAt)}</td>
                    <td>
                      <div className="actions-row">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(resource)}>✏️</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(resource._id)}>🗑️</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editResource ? '✏️ Edit Resource' : '🎬 Add Foundation Resource'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">⚠️ {error}</div>}
            <div className="grid-2">
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
              <div className="form-group">
                <label className="form-label">Order / Position</label>
                <input className="form-input" type="number" min="0" value={form.order} onChange={e => setForm(f => ({ ...f, order: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input className="form-input" placeholder="e.g. Excel Basics Refresher" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Video URL</label>
              <input className="form-input" placeholder="https://youtu.be/... or drive.google.com/..." value={form.videoUrl} onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea className="form-textarea" rows={3} placeholder="Brief description..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editResource ? '✓ Update' : '+ Add Resource')}
              </button>
            </div>
          </div>
        </div>
      )}

      {playerResource && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setPlayerResource(null); }}>
          <div className="modal recorded-player-modal">
            <div className="modal-header">
              <h2>{playerResource.title}</h2>
              <button className="modal-close" onClick={() => setPlayerResource(null)}>✕</button>
            </div>
            <RecordedLecturePlayer lecture={{ title: playerResource.title, videoUrl: playerResource.videoUrl, videoType: playerResource.videoType }} />
          </div>
        </div>
      )}
    </div>
  );
}
