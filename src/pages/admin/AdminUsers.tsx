import React, { useEffect, useState } from 'react';
import { adminApi } from '../../api';

interface Course { _id: string; title: string; description: string }
interface User  { _id: string; name: string; username: string; isActive: boolean; enrolledCourse?: Course }

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: '', username: '', password: '', enrolledCourse: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [ur, cr] = await Promise.all([adminApi.getUsers(), adminApi.getCourses()]);
      setUsers(ur.data.users);
      setCourses(cr.data.courses);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: '', username: '', password: '', enrolledCourse: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({ name: u.name, username: u.username, password: '', enrolledCourse: u.enrolledCourse?._id || '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      if (editUser) {
        const data: Record<string, string> = { name: form.name, username: form.username, enrolledCourse: form.enrolledCourse };
        if (form.password) data.password = form.password;
        await adminApi.updateUser(editUser._id, data);
      } else {
        if (!form.name || !form.username || !form.password) { setError('Name, username and password are required'); setSaving(false); return; }
        await adminApi.createUser(form);
      }
      await fetchAll();
      setShowModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'An error occurred');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this student?')) return;
    await adminApi.deleteUser(id);
    await fetchAll();
  };

  const toggleActive = async (u: User) => {
    await adminApi.updateUser(u._id, { isActive: !u.isActive });
    await fetchAll();
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{users.length} student{users.length !== 1 ? 's' : ''} registered</p>
        </div>
        <button id="add-student-btn" className="btn btn-primary" onClick={openCreate}>+ Add Student</button>
      </div>

      <div className="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Enrolled Course</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr><td colSpan={5}><div className="empty-state"><div className="empty-icon">👤</div><p>No students yet. Add your first student!</p></div></td></tr>
            ) : users.map(u => (
              <tr key={u._id}>
                <td><strong>{u.name}</strong></td>
                <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>@{u.username}</td>
                <td>{u.enrolledCourse ? <span className="badge badge-scheduled">{u.enrolledCourse.title}</span> : <span className="text-muted">—</span>}</td>
                <td>
                  <span className={`badge ${u.isActive ? 'badge-present' : 'badge-absent'}`}>
                    {u.isActive ? '✓ Active' : '✗ Inactive'}
                  </span>
                </td>
                <td>
                  <div className="actions-row">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(u)}>✏️ Edit</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(u)}>
                      {u.isActive ? '🔒 Deactivate' : '🔓 Activate'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(u._id)}>🗑️</button>
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
              <h2>{editUser ? '✏️ Edit Student' : '+ Add New Student'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {error && <div className="alert alert-error">⚠️ {error}</div>}

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="e.g. Rahul Sharma" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Username (Login ID)</label>
              <input className="form-input" placeholder="e.g. rahul2024" value={form.username} onChange={e => setForm(f => ({ ...f, username: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">{editUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
              <input className="form-input" type="password" placeholder={editUser ? '••••••••' : 'Minimum 6 characters'} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Enrolled Course</label>
              <select className="form-select" value={form.enrolledCourse} onChange={e => setForm(f => ({ ...f, enrolledCourse: e.target.value }))}>
                <option value="">— No course —</option>
                {courses.map(c => <option key={c._id} value={c._id}>{c.title}</option>)}
              </select>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editUser ? '✓ Update Student' : '+ Create Student')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
