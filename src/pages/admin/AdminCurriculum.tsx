import React, { useEffect, useMemo, useState } from 'react';
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
  _id?: string;
  title: string;
  duration: number;
}

interface CurriculumModuleDraft {
  _id?: string;
  title: string;
  topics: CurriculumTopicDraft[];
}

interface UsageBatch {
  _id: string;
  name: string;
  isActive: boolean;
  studentCount: number;
}

interface CurriculumTemplate {
  _id: string;
  title: string;
  course?: Course;
  modules: CurriculumModuleDraft[];
  isArchived?: boolean;
  usageCount?: number;
  usageBatches?: UsageBatch[];
}

const defaultCurriculumModules: CurriculumModuleDraft[] = [
  {
    title: 'Module 1: Excel for Data Analysis',
    topics: [
      { title: 'Class 1 (Week 1 - Saturday): Program Kickoff & Data Analyst Role', duration: 120 },
      { title: 'Class 2 (Week 1 - Sunday): Excel Data Types, Cleaning & Validation', duration: 120 },
    ],
  },
  {
    title: 'Module 2: Power BI & Data Visualization',
    topics: [
      { title: 'Class 1: Power BI Introduction & Data Connections', duration: 120 },
      { title: 'Class 2: Power Query Transformations', duration: 120 },
    ],
  },
];

const createEmptyForm = () => ({
  id: '',
  title: '',
  course: '',
  modules: defaultCurriculumModules.map((module) => ({
    title: module.title,
    topics: module.topics.map((topic) => ({ ...topic })),
  })),
});

const getTemplateStats = (template: CurriculumTemplate) => {
  const moduleCount = template.modules.length;
  const classCount = template.modules.reduce((sum, module) => sum + module.topics.length, 0);
  const totalMinutes = template.modules.reduce(
    (sum, module) => sum + module.topics.reduce((topicSum, topic) => topicSum + Number(topic.duration || 0), 0),
    0
  );
  const hours = Math.round(totalMinutes / 60);

  return { moduleCount, classCount, hours };
};

export default function AdminCurriculum() {
  const [templates, setTemplates] = useState<CurriculumTemplate[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<CurriculumTemplate | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [form, setForm] = useState(createEmptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const activeTemplates = templates.filter((template) => !template.isArchived);
  const totalClasses = activeTemplates.reduce((sum, template) => sum + getTemplateStats(template).classCount, 0);
  const activeBatches = batches.filter((batch) => batch.isActive).length;

  const previewTemplate = useMemo(
    () => selectedTemplate || activeTemplates[0] || templates[0] || null,
    [activeTemplates, selectedTemplate, templates]
  );

  const load = async (includeArchived = showArchived) => {
    try {
      setLoading(true);
      const [templateRes, batchRes, courseRes] = await Promise.all([
        curriculumApi.getDefaults(includeArchived),
        batchApi.getAll(),
        adminApi.getCourses(),
      ]);
      const loadedTemplates = templateRes.data.curriculums || [];
      setTemplates(loadedTemplates);
      setBatches(batchRes.data.batches || []);
      setCourses(courseRes.data.courses || []);
      setSelectedTemplate((current) => (
        current ? loadedTemplates.find((template: CurriculumTemplate) => template._id === current._id) || null : current
      ));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [showArchived]);

  const openCreateEditor = () => {
    setForm(createEmptyForm());
    setError('');
    setShowEditor(true);
  };

  const openEditEditor = (template: CurriculumTemplate) => {
    setForm({
      id: template._id,
      title: template.title,
      course: template.course?._id || '',
      modules: template.modules.map((module) => ({
        _id: module._id,
        title: module.title,
        topics: module.topics.map((topic) => ({
          _id: topic._id,
          title: topic.title,
          duration: Number(topic.duration) || 60,
        })),
      })),
    });
    setError('');
    setShowEditor(true);
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
      modules: [...prev.modules, { title: `Module ${prev.modules.length + 1}: New Module`, topics: [{ title: 'Class 1: New lesson', duration: 120 }] }],
    }));
  };

  const addTopic = (moduleIndex: number) => {
    setForm((prev) => ({
      ...prev,
      modules: prev.modules.map((module, index) => index === moduleIndex
        ? { ...module, topics: [...module.topics, { title: `Class ${module.topics.length + 1}: New lesson`, duration: 120 }] }
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

  const handleSaveTemplate = async () => {
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
      const payload = {
        title: form.title,
        course: form.course,
        modules: form.modules,
      };
      if (form.id) {
        await curriculumApi.updateDefault(form.id, payload);
      } else {
        await curriculumApi.createDefault(payload);
      }
      setShowEditor(false);
      await load();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save curriculum');
    } finally {
      setSaving(false);
    }
  };

  const duplicateTemplate = async (template: CurriculumTemplate) => {
    await curriculumApi.duplicateDefault(template._id);
    await load();
  };

  const archiveTemplate = async (template: CurriculumTemplate) => {
    await curriculumApi.archiveDefault(template._id);
    await load(true);
    setShowArchived(true);
  };

  const deleteTemplate = async (template: CurriculumTemplate) => {
    const confirmed = window.confirm(`Delete "${template.title}"? If a batch is using it, it will be archived instead.`);
    if (!confirmed) return;
    await curriculumApi.deleteDefault(template._id);
    await load();
  };

  const renderTemplateCard = (template: CurriculumTemplate) => {
    const stats = getTemplateStats(template);
    const isSelected = previewTemplate?._id === template._id;

    return (
      <div key={template._id} className="card entity-card" style={{ padding: '22px', borderColor: isSelected ? 'var(--accent)' : undefined, boxShadow: isSelected ? '0 18px 42px rgba(29, 155, 240, 0.14)' : undefined }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', alignItems: 'start', gap: '14px', marginBottom: '16px' }}>
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                fontSize: '18px',
                lineHeight: 1.32,
                fontWeight: 800,
                marginBottom: '8px',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {template.title}
            </h3>
            <div style={{ color: 'var(--text-secondary)', fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{template.course?.title || 'No course selected'}</div>
          </div>
          <span className={`badge ${template.isArchived ? 'badge-ended' : 'badge-present'}`}>
            {template.isArchived ? 'Archived' : 'Active'}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '10px', marginBottom: '14px' }}>
          <div className="soft-panel" style={{ padding: '10px 12px' }}>
            <div className="metric-label" style={{ marginBottom: '4px' }}>Modules</div>
            <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>{stats.moduleCount}</div>
          </div>
          <div className="soft-panel" style={{ padding: '10px 12px' }}>
            <div className="metric-label" style={{ marginBottom: '4px' }}>Classes</div>
            <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>{stats.classCount}</div>
          </div>
          <div className="soft-panel" style={{ padding: '10px 12px' }}>
            <div className="metric-label" style={{ marginBottom: '4px' }}>Hours</div>
            <div style={{ fontSize: '22px', fontWeight: 800, lineHeight: 1 }}>{stats.hours}</div>
          </div>
        </div>

        <div className="soft-panel" style={{ padding: '12px', marginBottom: '14px', minHeight: '72px' }}>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Batches Using This</div>
          {template.usageBatches?.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {template.usageBatches.map((batch) => (
                <span key={batch._id} className={`badge ${batch.isActive ? 'badge-scheduled' : 'badge-ended'}`}>
                  {batch.name} · {batch.studentCount}
                </span>
              ))}
            </div>
          ) : (
            <div style={{ color: 'var(--text-muted)', fontSize: '13px' }}>Not assigned to any batch yet.</div>
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: '8px' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setSelectedTemplate(template)}>Preview</button>
          <button className="btn btn-primary btn-sm" onClick={() => openEditEditor(template)}>Edit</button>
          <button className="btn btn-secondary btn-sm" onClick={() => duplicateTemplate(template)}>Duplicate</button>
          <button className="btn btn-secondary btn-sm" onClick={() => archiveTemplate(template)} disabled={template.isArchived}>Archive</button>
          <button className="btn btn-danger btn-sm" style={{ gridColumn: 'span 2' }} onClick={() => deleteTemplate(template)}>
            Delete
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Curriculum Management</h1>
          <p className="page-subtitle">Create reusable curriculum templates, preview modules and classes, then assign a saved template to any batch.</p>
        </div>
        <button className="btn btn-primary" onClick={openCreateEditor}>+ Create Curriculum</button>
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /></div>
      ) : (
        <>
          <div className="card surface-hero" style={{ padding: '28px', marginBottom: '20px' }}>
            <div style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Template Library</div>
                  <h2 style={{ fontSize: '26px', fontWeight: 800, marginBottom: '10px' }}>Manage curriculum before assigning batches</h2>
                  <p style={{ color: 'var(--text-secondary)', maxWidth: '780px' }}>
                    Build the learning journey once, keep versions organized, and reuse the same curriculum across multiple cohorts.
                  </p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)', fontWeight: 700 }}>
                  <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
                  Show archived
                </label>
              </div>
              <div className="metric-grid" style={{ marginTop: '22px' }}>
                <div className="metric-card">
                  <div className="metric-label">Active Templates</div>
                  <div className="metric-value">{activeTemplates.length}</div>
                  <div className="metric-help">Reusable curriculum templates</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Template Classes</div>
                  <div className="metric-value" style={{ color: 'var(--accent)' }}>{totalClasses}</div>
                  <div className="metric-help">Lessons available to assign</div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Active Batches</div>
                  <div className="metric-value" style={{ color: 'var(--success)' }}>{activeBatches}</div>
                  <div className="metric-help">Cohorts ready for curriculum assignment</div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Curriculum Templates</h2>
              <span className="badge badge-other">{templates.length} total</span>
            </div>
            {templates.length === 0 ? (
              <div className="card empty-state">
                <div className="empty-icon">📚</div>
                <p>No curriculum templates yet. Create your first template to start assigning batches.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '18px' }}>
                {templates.map(renderTemplateCard)}
              </div>
            )}
          </div>

          <div className="card section-shell" style={{ marginTop: '22px', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Preview</div>
                <h2 style={{ fontSize: '20px', fontWeight: 800 }}>{previewTemplate?.title || 'Select a curriculum'}</h2>
                {previewTemplate?.course && <p style={{ color: 'var(--text-secondary)', fontSize: '13px', marginTop: '4px' }}>{previewTemplate.course.title}</p>}
              </div>
              {previewTemplate && (
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                  <span className="badge badge-scheduled">{getTemplateStats(previewTemplate).moduleCount} modules</span>
                  <span className="badge badge-scheduled">{getTemplateStats(previewTemplate).classCount} classes</span>
                  <span className="badge badge-scheduled">{getTemplateStats(previewTemplate).hours} hours</span>
                </div>
              )}
            </div>

            {!previewTemplate ? (
              <div className="empty-state">Create or select a curriculum to preview its structure.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '14px', maxHeight: '430px', overflowY: 'auto', paddingRight: '4px' }}>
                {previewTemplate.modules.map((module, index) => (
                  <div key={module._id || index} className="soft-panel" style={{ padding: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '10px' }}>
                      <h3 style={{ fontSize: '15px', fontWeight: 800 }}>{module.title}</h3>
                      <span className="badge badge-other">{module.topics.length}</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {module.topics.map((topic, topicIndex) => (
                        <div key={topic._id || topicIndex} style={{ display: 'grid', gridTemplateColumns: '24px 1fr auto', gap: '8px', alignItems: 'start', fontSize: '13px', color: 'var(--text-secondary)' }}>
                          <span style={{ fontWeight: 800, color: 'var(--accent)' }}>{topicIndex + 1}</span>
                          <span>{topic.title}</span>
                          <span>{topic.duration}m</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ marginTop: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div>
                  <h2 style={{ fontSize: '22px', fontWeight: 800 }}>Batch Curriculum Assignment</h2>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>Select a batch, then assign one existing curriculum template.</p>
                </div>
              <span className="badge badge-scheduled">{batches.length} batches</span>
            </div>

            {batches.length === 0 ? (
              <div className="card empty-state">No batches available yet.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
                {batches.map((batch) => (
                  <div key={batch._id} className="card entity-card" style={{ padding: '22px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px', marginBottom: '14px' }}>
                      <div>
                        <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>{batch.name}</h3>
                        <div style={{ color: 'var(--accent)', fontSize: '13px', fontWeight: 700 }}>{batch.course?.title}</div>
                      </div>
                      <span className={`badge ${batch.isActive ? 'badge-present' : 'badge-absent'}`}>
                        {batch.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    <div className="soft-panel" style={{ padding: '12px', marginBottom: '14px' }}>
                      <div className="metric-label">Students</div>
                      <div style={{ fontSize: '22px', fontWeight: 800 }}>{batch.students?.length || 0}</div>
                    </div>
                    <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setSelectedBatch(batch)}>
                      Assign Existing Template
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {selectedBatch && (
        <AdminCurriculumModal
          batchId={selectedBatch._id}
          batchName={selectedBatch.name}
          onClose={() => {
            setSelectedBatch(null);
            void load();
          }}
        />
      )}

      {showEditor && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowEditor(false); }}>
          <div className="modal" style={{ maxWidth: '980px', maxHeight: '90vh', overflowY: 'auto' }}>
            <div className="modal-header" style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10, paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
              <div>
                <h2>{form.id ? 'Edit Curriculum Template' : 'Create Curriculum Template'}</h2>
                <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '4px' }}>Add modules and classes exactly as students should see them in the LMS.</p>
              </div>
              <button className="modal-close" onClick={() => setShowEditor(false)}>X</button>
            </div>

            {error && <div className="alert alert-error">{error}</div>}

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Curriculum Name</label>
                <input className="form-input" placeholder="e.g. UK Job-Ready Data Analyst & Applied GenAI Certification" value={form.title} onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))} />
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
                      <div key={topic._id || topicIndex} style={{ display: 'grid', gridTemplateColumns: '1fr 120px auto', gap: '8px', alignItems: 'center' }}>
                        <input className="form-input" placeholder="Class or lesson title" value={topic.title} onChange={(e) => updateTopic(moduleIndex, topicIndex, 'title', e.target.value)} />
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

            <div className="modal-actions" style={{ position: 'sticky', bottom: 0, background: 'var(--bg-secondary)', padding: '16px 0 0 0', marginTop: '16px', borderTop: '1px solid var(--border-subtle)', zIndex: 10 }}>
              <button className="btn btn-secondary" onClick={() => setShowEditor(false)} disabled={saving}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveTemplate} disabled={saving}>
                {saving ? 'Saving...' : form.id ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
