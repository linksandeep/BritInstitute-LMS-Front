import React, { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api';

interface Course {
  _id: string;
  title: string;
  description: string;
}

interface User {
  _id: string;
  name: string;
  username: string;
  phone?: string;
  email?: string;
  isActive: boolean;
  enrolledCourse?: Course;
}

const emptyForm = {
  name: '',
  username: '',
  password: '',
  phone: '',
  email: '',
  enrolledCourse: '',
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAll = async () => {
    try {
      const [ur, cr] = await Promise.all([adminApi.getUsers(), adminApi.getCourses()]);
      setUsers(ur.data.users);
      setCourses(cr.data.courses);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchAll();
  }, []);

  const openCreate = () => {
    setEditUser(null);
    setForm(emptyForm);
    setError('');
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({
      name: user.name,
      username: user.username,
      password: '',
      phone: user.phone || '',
      email: user.email || '',
      enrolledCourse: user.enrolledCourse?._id || '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.name || !form.username || (!editUser && !form.password)) {
      setError('Name, username and password are required');
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, string> = {
        name: form.name,
        username: form.username,
        phone: form.phone,
        email: form.email,
        enrolledCourse: form.enrolledCourse,
      };
      if (form.password) payload.password = form.password;

      if (editUser) {
        await adminApi.updateUser(editUser._id, payload);
      } else {
        await adminApi.createUser(payload);
      }

      await fetchAll();
      setShowModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this student?')) return;
    await adminApi.deleteUser(id);
    await fetchAll();
  };

  const toggleActive = async (user: User) => {
    await adminApi.updateUser(user._id, { isActive: !user.isActive });
    await fetchAll();
  };

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return users;

    return users.filter((user) => (
      [
        user.name,
        user.username,
        user.phone || '',
        user.email || '',
        user.enrolledCourse?.title || '',
        user._id,
      ].some((value) => value.toLowerCase().includes(normalizedSearch))
    ));
  }, [search, users]);

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="page-subtitle">{filteredUsers.length} of {users.length} student{users.length !== 1 ? 's' : ''} shown</p>
        </div>
        <button id="add-student-btn" className="btn btn-primary" onClick={openCreate}>+ Add Student</button>
      </div>

      <div className="card" style={{ padding: '18px', marginBottom: '18px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Search Students</label>
          <input
            className="form-input"
            placeholder="Search by name, username, phone, email, course, or student ID"
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
              <th>Phone</th>
              <th>Email</th>
              <th>Enrolled Course</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr><td colSpan={7}><div className="empty-state"><div className="empty-icon">👤</div><p>No students matched that search.</p></div></td></tr>
            ) : filteredUsers.map((user) => (
              <tr key={user._id}>
                <td><strong>{user.name}</strong></td>
                <td style={{ color: 'var(--text-muted)', fontFamily: 'monospace' }}>@{user.username}</td>
                <td>{user.phone || <span className="text-muted">—</span>}</td>
                <td>{user.email || <span className="text-muted">—</span>}</td>
                <td>{user.enrolledCourse ? <span className="badge badge-scheduled">{user.enrolledCourse.title}</span> : <span className="text-muted">—</span>}</td>
                <td>
                  <span className={`badge ${user.isActive ? 'badge-present' : 'badge-absent'}`}>
                    {user.isActive ? '✓ Active' : '✗ Inactive'}
                  </span>
                </td>
                <td>
                  <div className="actions-row">
                    <button className="btn btn-secondary btn-sm" onClick={() => openEdit(user)}>✏️ Edit</button>
                    <button className="btn btn-secondary btn-sm" onClick={() => toggleActive(user)}>
                      {user.isActive ? '🔒 Deactivate' : '🔓 Activate'}
                    </button>
                    <button className="btn btn-danger btn-sm" onClick={() => handleDelete(user._id)}>🗑️</button>
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
              <h2>{editUser ? '✏️ Edit Student' : '+ Add New Student'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            {error && <div className="alert alert-error">⚠️ {error}</div>}

            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" placeholder="e.g. Rahul Sharma" value={form.name} onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Username (Login ID)</label>
              <input className="form-input" placeholder="e.g. rahul2024" value={form.username} onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))} />
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Phone Number (optional)</label>
                <input className="form-input" placeholder="e.g. 9876543210" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email (optional)</label>
                <input className="form-input" type="email" placeholder="e.g. student@example.com" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">{editUser ? 'New Password (leave blank to keep)' : 'Password'}</label>
              <input className="form-input" type="password" placeholder={editUser ? '••••••••' : 'Minimum 6 characters'} value={form.password} onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Enrolled Course</label>
              <select className="form-select" value={form.enrolledCourse} onChange={(e) => setForm((prev) => ({ ...prev, enrolledCourse: e.target.value }))}>
                <option value="">— No course —</option>
                {courses.map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}
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
