import React, { useEffect, useState, useCallback } from 'react';
import { batchApi, adminApi } from '../../api';
import AdminCurriculumModal from './AdminCurriculumModal';

interface Course  { _id: string; title: string; description: string }
interface Student { _id: string; name: string; username: string; isActive: boolean }
interface Batch {
  _id: string;
  name: string;
  description?: string;
  course: Course;
  students: Student[];
  isActive: boolean;
  startDate: string;
  endDate?: string;
}

interface StudentReport {
  student: { name: string; username: string };
  batchName: string;
  courseName: string;
  attendance: any[];
  videoProgress: any[];
}

type ModalMode = 'create' | 'edit' | 'students' | 'details' | 'curriculum' | null;

const fmt = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const toInput = (d?: string) => d ? new Date(d).toISOString().slice(0, 10) : '';

export default function AdminBatches() {
  const [batches,  setBatches]  = useState<Batch[]>([]);
  const [courses,  setCourses]  = useState<Course[]>([]);
  const [allStudents, setAllStudents] = useState<Student[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState<ModalMode>(null);
  const [selected, setSelected] = useState<Batch | null>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [report, setReport] = useState<StudentReport | null>(null);
  const [loadingReport, setLoadingReport] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState('');
  const [addStudentId, setAddStudentId] = useState('');
  const [addingStudent, setAddingStudent] = useState(false);

  const [form, setForm] = useState({
    name: '', description: '', course: '', startDate: '', endDate: '', isActive: true,
  });

  const fetchAll = useCallback(async () => {
    try {
      const [br, cr, ur] = await Promise.all([
        batchApi.getAll(),
        adminApi.getCourses(),
        adminApi.getUsers(),
      ]);
      setBatches(br.data.batches);
      setCourses(cr.data.courses);
      setAllStudents(ur.data.users);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const openCreate = () => {
    setSelected(null);
    setForm({ name: '', description: '', course: '', startDate: '', endDate: '', isActive: true });
    setError('');
    setModal('create');
  };

  const openEdit = (b: Batch) => {
    setSelected(b);
    setForm({
      name: b.name,
      description: b.description || '',
      course: b.course._id,
      startDate: toInput(b.startDate),
      endDate: toInput(b.endDate),
      isActive: b.isActive,
    });
    setError('');
    setModal('edit');
  };

  const openStudents = (b: Batch) => {
    setSelected(b);
    setAddStudentId('');
    setError('');
    setModal('students');
  };

  const openDetails = async (b: Batch, s: Student) => {
    setSelected(b);
    setSelectedStudent(s);
    setModal('details');
    setLoadingReport(true);
    setError('');
    try {
      const res = await batchApi.getStudentReport(b._id, s._id);
      setReport(res.data.report);
    } catch (err) {
      setError('Failed to load student report');
    } finally {
      setLoadingReport(false);
    }
  };

  const closeModal = () => { 
    setModal(null); 
    setSelected(null); 
    setSelectedStudent(null);
    setReport(null);
    setError(''); 
  };

  const openCurriculum = (b: Batch) => {
    setSelected(b);
    setModal('curriculum');
  };

  // ── CRUD ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!form.name || !form.course || !form.startDate) {
      setError('Name, course and start date are required');
      return;
    }
    setSaving(true); setError('');
    try {
      if (modal === 'edit' && selected) {
        await batchApi.update(selected._id, form);
      } else {
        await batchApi.create(form);
      }
      await fetchAll();
      closeModal();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'An error occurred');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this batch? Students will be un-enrolled from its course.')) return;
    await batchApi.delete(id);
    await fetchAll();
  };

  const handleToggleActive = async (b: Batch) => {
    await batchApi.update(b._id, { isActive: !b.isActive });
    await fetchAll();
  };

  // ── Student Management ────────────────────────────────────────────────────
  const handleAddStudent = async () => {
    if (!addStudentId || !selected) return;
    setAddingStudent(true); setError('');
    try {
      const res = await batchApi.addStudent(selected._id, addStudentId);
      // Update selected from response
      setSelected(res.data.batch);
      setBatches(prev => prev.map(b => b._id === selected._id ? res.data.batch : b));
      setAddStudentId('');
      await fetchAll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to add student');
    } finally { setAddingStudent(false); }
  };

  const handleRemoveStudent = async (studentId: string) => {
    if (!selected) return;
    if (!confirm('Remove student from this batch?')) return;
    try {
      const res = await batchApi.removeStudent(selected._id, studentId);
      setSelected(res.data.batch);
      setBatches(prev => prev.map(b => b._id === selected._id ? res.data.batch : b));
      await fetchAll();
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Failed to remove student');
    }
  };

  // Students not already in this batch
  const eligibleStudents = selected
    ? allStudents.filter(s => !selected.students.some(bs => bs._id === s._id))
    : allStudents;

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Batches</h1>
          <p className="page-subtitle">
            {batches.length} batch{batches.length !== 1 ? 'es' : ''} — students are enrolled via batches
          </p>
        </div>
        <button id="create-batch-btn" className="btn btn-primary" onClick={openCreate}>
          + Create Batch
        </button>
      </div>

      {/* Batches Grid */}
      {batches.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🗂️</div>
            <p>No batches yet. Create your first batch and assign a course to it!</p>
            <button className="btn btn-primary" style={{ marginTop: '12px' }} onClick={openCreate}>
              + Create Batch
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {batches.map(b => (
            <div key={b._id} className="card" style={{
              borderColor: b.isActive ? 'rgba(99,102,241,0.3)' : 'var(--border-subtle)',
              position: 'relative', overflow: 'visible',
            }}>
              {/* Active Badge */}
              <span
                className={`badge ${b.isActive ? 'badge-present' : 'badge-absent'}`}
                style={{ position: 'absolute', top: '16px', right: '16px', fontSize: '11px' }}
              >
                {b.isActive ? '● Active' : '● Inactive'}
              </span>

              {/* Batch Info */}
              <div style={{ marginBottom: '16px', paddingRight: '70px' }}>
                <h3 style={{ fontSize: '17px', fontWeight: '700', marginBottom: '4px' }}>{b.name}</h3>
                {b.description && (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>{b.description}</p>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <span style={{ fontSize: '13px' }}>📚</span>
                  <span style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: '600' }}>
                    {b.course?.title || '—'}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  <span>📅 Start: {fmt(b.startDate)}</span>
                  {b.endDate && <span>🏁 End: {fmt(b.endDate)}</span>}
                </div>
              </div>

              {/* Student Count */}
              <div style={{
                background: 'var(--bg-primary)', borderRadius: '8px', padding: '10px 14px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '18px' }}>👥</span>
                  <div>
                    <div style={{ fontSize: '18px', fontWeight: '700' }}>{b.students.length}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Students enrolled</div>
                  </div>
                </div>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => openStudents(b)}
                  id={`manage-students-${b._id}`}
                >
                  Manage Students
                </button>
              </div>

              {/* Student chips */}
              {b.students.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '16px' }}>
                  {b.students.slice(0, 5).map(s => (
                    <span 
                      key={s._id} 
                      onClick={() => openDetails(b, s)}
                      style={{
                        background: 'var(--accent-light)', color: 'var(--accent)', padding: '3px 9px',
                        borderRadius: '20px', fontSize: '12px', fontWeight: '500', cursor: 'pointer'
                      }}
                    >
                      {s.name}
                    </span>
                  ))}
                  {b.students.length > 5 && (
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', paddingTop: '3px' }}>
                      +{b.students.length - 5} more
                    </span>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="actions-row">
                <button className="btn btn-primary btn-sm" onClick={() => openCurriculum(b)}>📚 Curriculum</button>
                <button className="btn btn-secondary btn-sm" onClick={() => openEdit(b)}>✏️ Edit</button>
                <button className="btn btn-secondary btn-sm" onClick={() => handleToggleActive(b)}>
                  {b.isActive ? '🔒 Deactivate' : '🔓 Activate'}
                </button>
                <button className="btn btn-danger btn-sm" onClick={() => handleDelete(b._id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Create / Edit Modal ── */}
      {(modal === 'create' || modal === 'edit') && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>{modal === 'edit' ? '✏️ Edit Batch' : '+ Create New Batch'}</h2>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            {error && <div className="alert alert-error">⚠️ {error}</div>}

            <div className="form-group">
              <label className="form-label">Batch Name *</label>
              <input
                className="form-input"
                placeholder="e.g. Batch A — January 2025"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Description</label>
              <input
                className="form-input"
                placeholder="Optional description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Course *</label>
              <select
                className="form-select"
                value={form.course}
                onChange={e => setForm(f => ({ ...f, course: e.target.value }))}
              >
                <option value="">— Select a course —</option>
                {courses.map(c => (
                  <option key={c._id} value={c._id}>{c.title}</option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label">Start Date *</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">End Date (optional)</label>
                <input
                  className="form-input"
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                />
              </div>
            </div>

            {modal === 'edit' && (
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <input
                  type="checkbox"
                  id="batch-active"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                  style={{ width: '18px', height: '18px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                />
                <label htmlFor="batch-active" className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                  Batch is Active
                </label>
              </div>
            )}

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (modal === 'edit' ? '✓ Update Batch' : '+ Create Batch')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Manage Students Modal ── */}
      {modal === 'students' && selected && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div>
                <h2>👥 Manage Students</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
                  {selected.name} — <span style={{ color: 'var(--accent)' }}>{selected.course?.title}</span>
                </p>
              </div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            {error && <div className="alert alert-error">⚠️ {error}</div>}

            {/* Add student row */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ flex: 1, marginBottom: 0 }}>
                <label className="form-label">Add Student to Batch</label>
                <select
                  className="form-select"
                  value={addStudentId}
                  onChange={e => setAddStudentId(e.target.value)}
                >
                  <option value="">— Pick a student —</option>
                  {eligibleStudents.map(s => (
                    <option key={s._id} value={s._id}>{s.name} (@{s.username})</option>
                  ))}
                </select>
              </div>
              <button
                className="btn btn-primary"
                onClick={handleAddStudent}
                disabled={!addStudentId || addingStudent}
                style={{ flexShrink: 0 }}
              >
                {addingStudent ? '⏳ Adding...' : '+ Add'}
              </button>
            </div>

            {/* Current students list */}
            <div>
              <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Current Students ({selected.students.length})
              </div>

              {selected.students.length === 0 ? (
                <div className="empty-state" style={{ padding: '24px' }}>
                  <div className="empty-icon" style={{ fontSize: '28px' }}>👤</div>
                  <p style={{ fontSize: '13px' }}>No students in this batch yet.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
                  {selected.students.map(s => (
                    <div key={s._id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: 'var(--bg-primary)', borderRadius: '8px', padding: '10px 14px',
                      border: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', background: 'var(--accent-light)', borderRadius: '50%',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: 'var(--accent)',
                        }}>
                          {s.name.charAt(0).toUpperCase()}
                        </div>
                        <div 
                          style={{ cursor: 'pointer' }}
                          onClick={() => openDetails(selected, s)}
                        >
                          <div style={{ fontSize: '14px', fontWeight: '600' }}>{s.name}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{s.username}</div>
                        </div>
                      </div>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleRemoveStudent(s._id)}
                        style={{ fontSize: '11px', padding: '4px 10px' }}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: '20px' }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={closeModal}>
                ✓ Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Student Details / Report Modal ── */}
      {modal === 'details' && selected && selectedStudent && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="modal" style={{ maxWidth: '800px' }}>
            <div className="modal-header">
              <div>
                <h2>📊 Student Progress Report</h2>
                <p style={{ fontSize: '14px', color: 'var(--text-muted)' }}>
                  {selectedStudent.name} (@{selectedStudent.username}) — <span style={{ color: 'var(--accent)' }}>{selected.name}</span>
                </p>
              </div>
              <button className="modal-close" onClick={closeModal}>✕</button>
            </div>

            {loadingReport ? (
              <div style={{ padding: '60px', textAlign: 'center' }}>
                <div className="spinner" style={{ margin: '0 auto 16px' }} />
                <p style={{ color: 'var(--text-muted)' }}>Generating report...</p>
              </div>
            ) : error ? (
              <div className="alert alert-error">⚠️ {error}</div>
            ) : report ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Attendance Section */}
                <section>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    📅 Live Class Attendance
                  </h3>
                  {report.attendance.length === 0 ? (
                    <div className="card" style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                      No attendance records found for this student.
                    </div>
                  ) : (
                    <div className="table-wrapper" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      <table style={{ fontSize: '13px' }}>
                        <thead>
                          <tr>
                            <th>Class</th>
                            <th>Topic</th>
                            <th>Status</th>
                            <th>Marked At</th>
                          </tr>
                        </thead>
                        <tbody>
                          {report.attendance.map((a: any) => (
                            <tr key={a._id}>
                              <td>{a.liveClass.classNumber}</td>
                              <td>{a.liveClass.topic}</td>
                              <td>
                                <span className={`badge ${a.status === 'present' ? 'badge-present' : 'badge-absent'}`}>
                                  {a.status.toUpperCase()}
                                </span>
                              </td>
                              <td>{fmt(a.markedAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>

                {/* Recorded Lectures Progress */}
                <section>
                  <h3 style={{ fontSize: '15px', fontWeight: '700', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    🎬 Video Lecture Progress
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
                    {report.videoProgress.map((v: any, idx: number) => (
                      <div key={idx} className="card" style={{ padding: '12px', background: v.isCompleted ? 'rgba(16,185,129,0.05)' : 'var(--bg-primary)' }}>
                        <div style={{ fontSize: '13px', fontWeight: '700', marginBottom: '8px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {v.lectureTitle}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                           <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                             {Math.floor(v.watchDuration / 60)}m / 10m
                           </span>
                           {v.isCompleted && <span style={{ color: 'var(--success)', fontSize: '14px' }}>✅</span>}
                        </div>
                        <div style={{ height: '4px', background: 'var(--border-subtle)', borderRadius: '2px', overflow: 'hidden' }}>
                           <div 
                              style={{ 
                                height: '100%', 
                                width: `${Math.min(100, (v.watchDuration / 600) * 100)}%`, 
                                background: v.isCompleted ? 'var(--success)' : 'var(--accent)'
                              }} 
                           />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            ) : null}

            <div className="modal-actions" style={{ marginTop: '24px' }}>
              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={closeModal}>
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}

      {modal === 'curriculum' && selected && (
        <AdminCurriculumModal
          batchId={selected._id}
          batchName={selected.name}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
