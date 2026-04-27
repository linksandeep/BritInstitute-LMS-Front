import React, { useEffect, useState } from 'react';
import { superAdminApi } from '../../api';

interface Teacher {
  _id?: string;
  id?: string;
  name: string;
  username: string;
  role?: string;
  isActive: boolean;
}

interface Stats {
  totalTeachers: number;
  activeTeachers: number;
  totalStudents: number;
  totalAdmins?: number;
}

export default function SuperAdminTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [stats, setStats] = useState<Stats>({ totalTeachers: 0, activeTeachers: 0, totalStudents: 0, totalAdmins: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTeacher, setEditTeacher] = useState<Teacher | null>(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ name: '', username: '', password: '' });

  const fetchAll = async () => {
    try {
      const [teachersRes, statsRes] = await Promise.all([
        superAdminApi.getTeachers(),
        superAdminApi.getStats(),
      ]);
      setTeachers(teachersRes.data.teachers || []);
      setStats(statsRes.data.stats);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
  }, []);

  const openCreate = () => {
    setEditTeacher(null);
    setForm({ name: '', username: '', password: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (teacher: Teacher) => {
    setEditTeacher(teacher);
    setForm({ name: teacher.name, username: teacher.username, password: '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (!form.name || !form.username || (!editTeacher && !form.password)) {
        setError('Name, username and password are required');
        setSaving(false);
        return;
      }

      if (editTeacher) {
        const payload: Record<string, string> = { name: form.name, username: form.username };
        if (form.password) payload.password = form.password;
        await superAdminApi.updateTeacher(editTeacher._id || editTeacher.id || '', payload);
      } else {
        await superAdminApi.createTeacher(form);
      }

      await fetchAll();
      setShowModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Unable to save teacher');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (teacher: Teacher) => {
    const id = teacher._id || teacher.id || '';
    await superAdminApi.updateTeacher(id, { isActive: !teacher.isActive });
    await fetchAll();
  };

  const handleDelete = async (teacher: Teacher) => {
    const id = teacher._id || teacher.id || '';
    if (!confirm('Delete this teacher account?')) return;
    await superAdminApi.deleteTeacher(id);
    await fetchAll();
  };

  const normalizedSearch = search.trim().toLowerCase();
  const filteredTeachers = teachers.filter((teacher) => {
    if (!normalizedSearch) return true;
    return [teacher.name, teacher.username, teacher._id || '', teacher.id || '']
      .some((value) => value.toLowerCase().includes(normalizedSearch));
  });

  if (loading) {
    return <div className="loading-center"><div className="spinner" /></div>;
  }

  return (
    <div className="fade-in">
      <div className="card surface-hero" style={{ padding: '30px', marginBottom: '24px' }}>
        <div style={{ position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
            Super Admin Control
          </div>
          <h1 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '10px' }}>
            Manage teachers and mentors
          </h1>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '720px' }}>
            Super admin sits above the teacher layer and creates or manages teacher accounts for academic operations.
          </p>
        </div>
      </div>

      <div className="metric-grid" style={{ marginBottom: '20px' }}>
        <div className="metric-card">
          <div className="metric-label">Total Teachers</div>
          <div className="metric-value">{stats.totalTeachers}</div>
          <div className="metric-help">Teacher and mentor accounts</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active Teachers</div>
          <div className="metric-value" style={{ color: 'var(--success)' }}>{stats.activeTeachers}</div>
          <div className="metric-help">Currently enabled teacher access</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active Admins</div>
          <div className="metric-value" style={{ color: '#0f766e' }}>{stats.totalAdmins || 0}</div>
          <div className="metric-help">Admin accounts with full operations access</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Students</div>
          <div className="metric-value" style={{ color: 'var(--accent)' }}>{stats.totalStudents}</div>
          <div className="metric-help">Learners in the platform</div>
        </div>
      </div>

      <div className="page-header">
        <div>
          <h2 style={{ fontSize: '22px', fontWeight: '800', color: 'var(--text-primary)' }}>Teachers</h2>
          <p className="page-subtitle">Create and manage teacher or mentor accounts.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Teacher</button>
      </div>

      <div className="card" style={{ padding: '18px', marginBottom: '18px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Search Teachers</label>
          <input
            className="form-input"
            placeholder="Search by name, username, or teacher ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTeachers.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">T</div><p>No teachers matched that search.</p></div></td></tr>
            ) : filteredTeachers.map((teacher) => (
              <tr key={teacher._id || teacher.id}>
                <td><strong>{teacher.name}</strong></td>
                <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>@{teacher.username}</td>
                <td><span className="badge badge-scheduled">Teacher</span></td>
                <td>
                  <span className={`badge ${teacher.isActive ? 'badge-present' : 'badge-absent'}`}>
                    {teacher.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  <div className="actions-row">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(teacher)}>Edit</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(teacher)}>
                      {teacher.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(teacher)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editTeacher ? 'Edit Teacher' : 'Add Teacher'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>X</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Username</label>
              <input className="form-input" value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">{editTeacher ? 'New Password (optional)' : 'Password'}</label>
              <input className="form-input" type="password" value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editTeacher ? 'Update Teacher' : 'Create Teacher')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
