import React, { useEffect, useState } from 'react';
import { adminApi, batchApi, curriculumApi } from '../../api';
import AdminCurriculumModal from './AdminCurriculumModal';

interface Course {
  _id: string;
  title: string;
}

interface Batch {
  _id: string;
  name: string;
  description?: string;
  course: Course;
  students: { _id: string }[];
  isActive: boolean;
}

interface CurriculumTopicDraft {
  title: string;
  duration: number;
}

interface CurriculumModuleDraft {
  title: string;
  topics: CurriculumTopicDraft[];
}

const defaultCurriculumModules: CurriculumModuleDraft[] = [
  {
    title: 'Module 1: Foundations',
    topics: [
      { title: 'Orientation and course roadmap', duration: 60 },
      { title: 'Core concepts and terminology', duration: 90 },
      { title: 'Hands-on practice session', duration: 90 },
    ],
  },
  {
    title: 'Module 2: Applied Learning',
    topics: [
      { title: 'Tools and workflow setup', duration: 90 },
      { title: 'Guided project walkthrough', duration: 120 },
      { title: 'Practice and doubt clearing', duration: 90 },
    ],
  },
  {
    title: 'Module 3: Project and Review',
    topics: [
      { title: 'Capstone planning', duration: 90 },
      { title: 'Project build session', duration: 120 },
      { title: 'Final review and assessment', duration: 90 },
    ],
  },
];

const createEmptyForm = () => ({
  title: '',
  course: '',
  modules: defaultCurriculumModules.map((module) => ({
    title: module.title,
    topics: module.topics.map((topic) => ({ ...topic })),
  })),
});

export default function AdminCurriculum() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeBatches = batches.filter((batch) => batch.isActive).length;
  const totalStudents = batches.reduce((sum, batch) => sum + (batch.students?.length || 0), 0);

  useEffect(() => {
    const load = async () => {
      try {
        const [batchRes, courseRes] = await Promise.all([batchApi.getAll(), adminApi.getCourses()]);
        setBatches(batchRes.data.batches || []);
        setCourses(courseRes.data.courses || []);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const openCreateModal = () => {
    setForm(createEmptyForm());
    setError('');
    setShowCreateModal(true);
  };

  const updateModule = (moduleIndex: number, value: string) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.map((module, index) => index === moduleIndex ? { ...module, title: value } : module),
    }));
  };

  const updateTopic = (moduleIndex: number, topicIndex: number, field: keyof CurriculumTopicDraft, value: string) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.map((module, index) => {
        if (index !== moduleIndex) return module;
        return {
          ...module,
          topics: module.topics.map((topic, tIndex) => (
            tIndex === topicIndex
              ? { ...topic, [field]: field === 'duration' ? Number(value) || 60 : value }
              : topic
          )),
        };
      }),
    }));
  };

  const addModule = () => {
    setForm((prev) => ({
      ...prev,
      modules: [...prev.modules, { title: `Module ${prev.modules.length + 1}: New Module`, topics: [{ title: 'New class topic', duration: 60 }] }],
    }));
  };

  const addTopic = (moduleIndex: number) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.map((module, index) => index === moduleIndex
        ? { ...module, topics: [...module.topics, { title: 'New class topic', duration: 60 }] }
        : module),
    }));
  };

  const removeTopic = (moduleIndex: number, topicIndex: number) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.map((module, index) => index === moduleIndex
        ? { ...module, topics: module.topics.filter((_, tIndex) => tIndex !== topicIndex) }
        : module),
    }));
  };

  const removeModule = (moduleIndex: number) => {
    setForm((prev) => ({ ...prev, modules: prev.modules.filter((_, index) => index !== moduleIndex) }));
  };

  const handleCreateCurriculum = async () => {
    setError('');
    if (!form.title.trim() || !form.course) {
      setError('Curriculum title and course are required');
      return;
    }
    if (form.modules.length === 0) {
      setError('Add at least one module');
      return;
    }

    setSaving(true);
    try {
      await curriculumApi.createDefault({
        title: form.title,
        course: form.course,
        modules: form.modules,
      });
      setShowCreateModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create curriculum');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Curriculum</h1>
          <p className="page-subtitle">One batch has one curriculum. Reassigning a template replaces the current batch curriculum for every student in that batch.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateModal}>+ Create Curriculum</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : batches.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <p>No batches available yet. Create a batch first to manage curriculum.</p>
          </div>
        </div>
      ) : (
        <>
          <div className="card surface-hero" style={{ padding: '28px', marginBottom: '20px' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Curriculum Control Center</div>
                  <h2 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '10px' }}>Manage program delivery batch by batch</h2>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '720px' }}>
                    Choose one curriculum template per batch, then fine-tune class names and dates. Zoom meetings are created automatically when you save scheduled topics.
                  </p>
                </div>
              </div>
              <div className="metric-grid" style={{ marginTop: '22px' }}>
                <div className="metric-card">
                  <div className="metric-label">Total Batches</div>
                  <div className="metric-value">{batches.length}</div>
                  <div className="metric-help">Curriculum-managed cohorts</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Active Batches</div>
                  <div className="metric-value" style={{ color: 'var(--success)' }}>{activeBatches}</div>
                  <div className="metric-help">Currently running programs</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Students Covered</div>
                  <div className="metric-value" style={{ color: 'var(--accent)' }}>{totalStudents}</div>
                  <div className="metric-help">Learners affected by batch curriculum</div>
                </div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '20px' }}>
          {batches.map((batch) => (
            <div key={batch._id} className="card entity-card" style={{ paddingTop: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '6px' }}>{batch.name}</h3>
                  <div style={{ fontSize: '13px', color: 'var(--accent)', fontWeight: '600' }}>{batch.course?.title}</div>
                </div>
                <span className={`badge ${batch.isActive ? 'badge-present' : 'badge-absent'}`}>
                  {batch.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>

              {batch.description && (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px' }}>
                  {batch.description}
                </p>
              )}

              <div className="soft-panel" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', marginBottom: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Students</div>
                  <div style={{ fontSize: '20px', fontWeight: '800' }}>{batch.students?.length || 0}</div>
                </div>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'var(--accent-light)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>
                  📘
                </div>
              </div>

              <div className="soft-panel" style={{ padding: '12px 14px', marginBottom: '18px' }}>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Curriculum Rule</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Exactly one curriculum is active for this batch at a time.</div>
              </div>

              <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setSelectedBatch(batch)}>
                Manage Curriculum
              </button>
            </div>
          ))}
          </div>
        </>
      )}

      {selectedBatch && (
        <AdminCurriculumModal
          batchId={selectedBatch._id}
          batchName={selectedBatch.name}
          onClose={() => setSelectedBatch(null)}
        />
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowCreateModal(false); }}>
          <div className="modal" style={{ maxWidth: '920px' }}>
            <div className="modal-header">
              <div>
                <h2>Create Curriculum</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Default format is ready. Edit modules and class topics as needed.</p>
              </div>
              <button className="modal-close" onClick={() => setShowCreateModal(false)}>X</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Curriculum Name</label>
                <input className="form-input" placeholder="e.g. Data Analytics with AI" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Course</label>
                <select className="form-select" value={form.course} onChange={(e) => setForm((prev) => ({ ...prev, course: e.target.value }))}>
                  <option value="">Select course</option>
                  {courses.map((course) => <option key={course._id} value={course._id}>{course.title}</option>)}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {form.modules.map((module, moduleIndex) => (
                <div key={moduleIndex} className="soft-panel" style={{ padding: '14px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '10px', alignItems: 'center', marginBottom: '12px' }}>
                    <input className="form-input" value={module.title} onChange={(e) => updateModule(moduleIndex, e.target.value)} />
                    <button className="btn btn-danger btn-sm" onClick={() => removeModule(moduleIndex)} disabled={form.modules.length === 1}>Remove</button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {module.topics.map((topic, topicIndex) => (
                      <div key={topicIndex} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '8px', alignItems: 'center' }}>
                        <input className="form-input" placeholder="Class topic" value={topic.title} onChange={(e) => updateTopic(moduleIndex, topicIndex, 'title', e.target.value)} />
                        <input className="form-input" type="number" min="1" value={topic.duration} onChange={(e) => updateTopic(moduleIndex, topicIndex, 'duration', e.target.value)} />
                        <button className="btn btn-secondary btn-sm" onClick={() => removeTopic(moduleIndex, topicIndex)} disabled={module.topics.length === 1}>Remove</button>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-secondary btn-sm" style={{ marginTop: '12px' }} onClick={() => addTopic(moduleIndex)}>+ Add Class</button>
                </div>
              ))}
            </div>

            <button className="btn btn-secondary" style={{ marginTop: '14px' }} onClick={addModule}>+ Add Module</button>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateCurriculum} disabled={saving}>
                {saving ? 'Creating...' : 'Create Curriculum'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
