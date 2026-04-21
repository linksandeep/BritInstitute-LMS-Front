import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api';

interface Course { _id: string; title: string; description: string; createdAt: string }

export default function AdminCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [form, setForm] = useState({ title: '', description: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchCourses = async () => {
    try { const res = await adminApi.getCourses(); setCourses(res.data.courses); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCourses(); }, []);

  const openCreate = () => { setEditCourse(null); setForm({ title: '', description: '' }); setError(''); setShowModal(true); };
  const openEdit = (c: Course) => { setEditCourse(c); setForm({ title: c.title, description: c.description }); setError(''); setShowModal(true); };

  const handleSave = async () => {
    setError('');
    if (!form.title || !form.description) { setError('Title and description are required'); return; }
    setSaving(true);
    try {
      if (editCourse) await adminApi.updateCourse(editCourse._id, form);
      else await adminApi.createCourse(form);
      await fetchCourses();
      setShowModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'An error occurred');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this course? Students enrolled in it will lose access.')) return;
    await adminApi.deleteCourse(id);
    await fetchCourses();
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Courses</h1>
          <p className="page-subtitle">{courses.length} course{courses.length !== 1 ? 's' : ''} available</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Create Course</button>
      </div>

      {courses.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <p>No courses yet. Create your first course to get started.</p>
          </div>
        </div>
      ) : (
        <div className="grid-3">
          {courses.map(c => (
            <div key={c._id} className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ width: '44px', height: '44px', background: 'var(--accent-light)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                  📚
                </div>
                <div className="actions-row">
                  <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>✏️</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c._id)}>🗑️</button>
                </div>
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>{c.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{c.description}</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '12px' }}>
                Created {new Date(c.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editCourse ? '✏️ Edit Course' : '+ New Course'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error">⚠️ {error}</div>}
            <div className="form-group">
              <label className="form-label">Course Title</label>
              <input className="form-input" placeholder="e.g. Full Stack Development 2024" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea className="form-textarea" rows={4} placeholder="Describe what students will learn..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editCourse ? '✓ Update' : '+ Create Course')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
