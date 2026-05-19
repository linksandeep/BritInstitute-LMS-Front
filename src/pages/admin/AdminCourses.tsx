import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api';
import { useAuth } from '../../context/AuthContext';

interface Teacher { _id: string; id?: string; name: string; username: string; }
interface Course {
  _id: string;
  title: string;
  description: string;
  createdAt: string;
  isPublic?: boolean;
  assignedTeachers?: Teacher[];
  createdBy?: Teacher;
  canManage?: boolean;
}

export default function AdminCourses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editCourse, setEditCourse] = useState<Course | null>(null);
  const [form, setForm] = useState({ title: '', description: '', accessMode: 'private', assignedTeachers: [] as string[] });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const canEditAccess = user?.role === 'admin' || user?.role === 'superadmin';

  const fetchCourses = async () => {
    try {
      const [coursesRes, teachersRes] = await Promise.all([
        adminApi.getCourses(),
        canEditAccess ? adminApi.getTeachers() : Promise.resolve({ data: { teachers: [] } }),
      ]);
      setCourses(coursesRes.data.courses);
      setTeachers(teachersRes.data.teachers || []);
    }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCourses(); }, []);

  const getAccessMode = (course: Course) => {
    if (course.isPublic) return 'public';
    if ((course.assignedTeachers || []).length > 0) return 'assigned';
    return 'private';
  };

  const openCreate = () => {
    setEditCourse(null);
    setForm({ title: '', description: '', accessMode: 'private', assignedTeachers: [] });
    setError('');
    setShowModal(true);
  };

  const openEdit = (c: Course) => {
    setEditCourse(c);
    setForm({
      title: c.title,
      description: c.description,
      accessMode: getAccessMode(c),
      assignedTeachers: (c.assignedTeachers || []).map((teacher) => teacher._id || teacher.id || ''),
    });
    setError('');
    setShowModal(true);
  };

  const toggleTeacherAccess = (teacherId: string) => {
    setForm((prev) => ({
      ...prev,
      assignedTeachers: prev.assignedTeachers.includes(teacherId)
        ? prev.assignedTeachers.filter((id) => id !== teacherId)
        : [...prev.assignedTeachers, teacherId],
    }));
  };

  const handleSave = async () => {
    setError('');
    if (!form.title || !form.description) { setError('Title and description are required'); return; }
    if (canEditAccess && form.accessMode === 'assigned' && form.assignedTeachers.length === 0) {
      setError('Select at least one teacher or choose public access');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        isPublic: canEditAccess ? form.accessMode === 'public' : false,
        assignedTeachers: canEditAccess && form.accessMode === 'assigned' ? form.assignedTeachers : [],
      };
      if (editCourse) await adminApi.updateCourse(editCourse._id, payload);
      else await adminApi.createCourse(payload);
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

  const getAccessLabel = (course: Course) => {
    if (course.isPublic) return 'Public to teachers';
    if ((course.assignedTeachers || []).length > 0) {
      return `Assigned: ${(course.assignedTeachers || []).map((teacher) => teacher.name).join(', ')}`;
    }
    return course.createdBy?._id === user?.id || course.createdBy?.id === user?.id ? 'Private to you' : 'Private';
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
                {c.canManage && (
                  <div className="actions-row">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>✏️</button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(c._id)}>🗑️</button>
                  </div>
                )}
              </div>
              <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '8px' }}>{c.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--text-muted)', lineHeight: '1.5' }}>{c.description}</p>
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className={`badge ${c.isPublic ? 'badge-present' : (c.assignedTeachers || []).length ? 'badge-scheduled' : 'badge-ended'}`}>{getAccessLabel(c)}</span>
                {c.createdBy?.name && <span className="badge badge-other">Owner: {c.createdBy.name}</span>}
              </div>
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
            {canEditAccess && (
              <div className="form-group">
                <label className="form-label">Teacher Access</label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  {[
                    { value: 'private', label: 'Admin only' },
                    { value: 'assigned', label: 'Assign teacher' },
                    { value: 'public', label: 'Public to all teachers' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={`btn btn-sm ${form.accessMode === option.value ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setForm((prev) => ({ ...prev, accessMode: option.value, assignedTeachers: option.value === 'assigned' ? prev.assignedTeachers : [] }))}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                {form.accessMode === 'assigned' && (
                  <div className="soft-panel" style={{ padding: '12px', maxHeight: '180px', overflowY: 'auto' }}>
                    {teachers.length === 0 ? (
                      <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>No active teachers available.</div>
                    ) : teachers.map((teacher) => {
                      const teacherId = teacher._id || teacher.id || '';
                      return (
                        <label key={teacherId} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 0', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={form.assignedTeachers.includes(teacherId)}
                            onChange={() => toggleTeacherAccess(teacherId)}
                          />
                          <span>{teacher.name} <span style={{ color: 'var(--text-muted)' }}>@{teacher.username}</span></span>
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {!canEditAccess && (
              <div className="alert alert-info">This course will be private to your teacher account. Admins can later make it public or assign it to other teachers.</div>
            )}
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
