import React, { useEffect, useState } from 'react';
import { adminApi, curriculumApi } from '../../api';

interface Teacher {
  _id: string;
  name: string;
  username: string;
}

interface Topic {
  _id?: string;
  title: string;
  duration: number;
  scheduledAt?: string;
  meetingLink?: string;
  liveClassId?: string;
  instructor?: string | Teacher;
}

interface Module {
  _id?: string;
  title: string;
  topics: Topic[];
}

interface Curriculum {
  _id: string;
  title: string;
  modules: Module[];
  course?: { _id: string; title: string };
}

interface Props {
  batchId: string;
  batchName: string;
  onClose: () => void;
}

const toInput = (value?: string) => {
  if (!value) return '';
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
};

const getInstructorId = (instructor?: string | Teacher) => {
  if (!instructor) return '';
  return typeof instructor === 'string' ? instructor : instructor._id;
};

export default function AdminCurriculumModal({ batchId, batchName, onClose }: Props) {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [templates, setTemplates] = useState<Curriculum[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    void fetchData();
  }, [batchId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError('');
      const [curriculumRes, templateRes, teacherRes] = await Promise.all([
        curriculumApi.getByBatch(batchId).catch(() => ({ data: { curriculum: null } })),
        curriculumApi.getDefaults(),
        adminApi.getTeachers().catch(() => ({ data: { teachers: [] } })),
      ]);
      setCurriculum(curriculumRes.data.curriculum || null);
      setTemplates(templateRes.data.curriculums || []);
      setTeachers(teacherRes.data.teachers || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load curriculum');
    } finally {
      setLoading(false);
    }
  };

  const handleTopicChange = (moduleIndex: number, topicIndex: number, field: keyof Topic, value: string) => {
    setCurriculum((prev) => {
      if (!prev) return prev;
      const modules = [...prev.modules];
      const module = { ...modules[moduleIndex] };
      const topics = [...module.topics];
      topics[topicIndex] = {
        ...topics[topicIndex],
        [field]: field === 'duration' ? Math.max(Number(value) || 1, 1) : value,
      };
      module.topics = topics;
      modules[moduleIndex] = module;
      return { ...prev, modules };
    });
  };

  const handleModuleTitleChange = (moduleIndex: number, value: string) => {
    setCurriculum((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: prev.modules.map((module, index) => index === moduleIndex ? { ...module, title: value } : module),
      };
    });
  };

  const addModule = () => {
    setCurriculum((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: [
          ...prev.modules,
          {
            title: `Module ${prev.modules.length + 1}: Batch Adjustment`,
            topics: [{ title: 'New batch class', duration: 120 }],
          },
        ],
      };
    });
  };

  const removeModule = (moduleIndex: number) => {
    setCurriculum((prev) => {
      if (!prev || prev.modules.length === 1) return prev;
      return { ...prev, modules: prev.modules.filter((_, index) => index !== moduleIndex) };
    });
  };

  const addTopic = (moduleIndex: number) => {
    setCurriculum((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: prev.modules.map((module, index) => index === moduleIndex
          ? {
              ...module,
              topics: [
                ...module.topics,
                { title: `Class ${module.topics.length + 1}: Batch extra session`, duration: 120 },
              ],
            }
          : module),
      };
    });
  };

  const removeTopic = (moduleIndex: number, topicIndex: number) => {
    setCurriculum((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        modules: prev.modules.map((module, index) => {
          if (index !== moduleIndex || module.topics.length === 1) return module;
          return { ...module, topics: module.topics.filter((_, tIndex) => tIndex !== topicIndex) };
        }),
      };
    });
  };

  const handleAssignTemplate = async () => {
    if (!selectedTemplateId) return;
    try {
      setAssigning(true);
      setError('');
      const res = await curriculumApi.assignTemplate(batchId, { curriculumId: selectedTemplateId });
      setCurriculum(res.data.curriculum);
      setSelectedTemplateId('');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to assign curriculum');
    } finally {
      setAssigning(false);
    }
  };

  const handleSave = async () => {
    if (!curriculum) return;
    try {
      setSaving(true);
      setError('');
      await curriculumApi.updateByBatch(batchId, {
        title: curriculum.title,
        modules: curriculum.modules.map((module) => ({
          ...module,
          topics: module.topics.map((topic) => ({
            ...topic,
            scheduledAt: topic.scheduledAt || undefined,
            meetingLink: topic.meetingLink || '',
            instructor: getInstructorId(topic.instructor) || undefined,
          })),
        })),
      });
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save curriculum');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: '1040px', width: 'calc(100vw - 48px)', height: '90vh', padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div className="modal-header" style={{ padding: '22px 28px', background: 'var(--bg-secondary)', borderBottom: '1px solid var(--border-subtle)', marginBottom: 0 }}>
          <div>
            <h2>📚 Manage Curriculum</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Batch: <span style={{ color: 'var(--accent)' }}>{batchName}</span>
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div style={{ padding: '22px 28px 110px', overflowY: 'auto', flex: 1 }}>
        {error && <div className="alert alert-error">⚠️ {error}</div>}

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto' }} />
            <p style={{ marginTop: '10px', color: 'var(--text-muted)' }}>Loading Curriculum...</p>
          </div>
        ) : (
          <>
            <div className="card surface-hero" style={{ padding: '20px', marginBottom: '16px' }}>
              <div style={{ position: 'relative', zIndex: 1 }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Batch Curriculum Assignment</div>
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                    Assign a master template once, then customize this batch copy below. Schedule, instructor, extra classes, and meeting links do not change the original template.
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 1fr) minmax(180px, auto)', gap: '12px', alignItems: 'end' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Assign Curriculum Template</label>
                    <select
                      className="form-select"
                      value={selectedTemplateId}
                      onChange={(e) => setSelectedTemplateId(e.target.value)}
                    >
                      <option value="">— Select curriculum —</option>
                      {templates.map((template) => (
                        <option key={template._id} value={template._id}>
                          {template.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={handleAssignTemplate}
                    disabled={!selectedTemplateId || assigning}
                    style={{ justifyContent: 'center', minHeight: '46px' }}
                  >
                    {assigning ? 'Applying...' : 'Replace Curriculum'}
                  </button>
                </div>
              </div>
            </div>

            {!curriculum ? (
              <div className="empty-state">No curriculum is assigned to this batch yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div className="soft-panel" style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>Batch-Specific Schedule Overrides</div>
                    <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Use this section for holidays, reschedules, different batch timings, instructor changes, and additional sessions.</div>
                  </div>
                  <button className="btn btn-secondary btn-sm" onClick={addModule}>+ Add Batch Module</button>
                </div>
                {curriculum.modules.map((module, moduleIndex) => (
                  <div key={module._id || moduleIndex} className="card section-shell" style={{ padding: '18px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) auto', gap: '14px', alignItems: 'center', marginBottom: '16px' }}>
                      <div>
                        <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          Module Name
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          style={{ color: 'var(--accent)', fontWeight: 800 }}
                          value={module.title}
                          onChange={(e) => handleModuleTitleChange(moduleIndex, e.target.value)}
                        />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                        <span className="badge badge-scheduled">{module.topics.length} classes</span>
                        <button className="btn btn-secondary btn-sm" onClick={() => addTopic(moduleIndex)}>+ Add Class</button>
                        <button className="btn btn-danger btn-sm" onClick={() => removeModule(moduleIndex)} disabled={curriculum.modules.length === 1}>Remove Module</button>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {module.topics.map((topic, topicIndex) => (
                        <div
                          key={topic._id || `${moduleIndex}-${topicIndex}`}
                          className="soft-panel"
                          style={{ padding: '14px', display: 'flex', flexDirection: 'column', gap: '12px' }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                            <span className="badge badge-other">Class {topicIndex + 1}</span>
                            <button className="btn btn-secondary btn-sm" onClick={() => removeTopic(moduleIndex, topicIndex)} disabled={module.topics.length === 1}>Remove Class</button>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1.4fr) 120px minmax(170px, 0.8fr) minmax(210px, 1fr)', gap: '12px', alignItems: 'start' }}>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                Class Name
                              </label>
                              <input
                                type="text"
                                className="form-input"
                                style={{ padding: '6px 10px', fontSize: '13px' }}
                                value={topic.title}
                                onChange={(e) => handleTopicChange(moduleIndex, topicIndex, 'title', e.target.value)}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                Duration
                              </label>
                              <input
                                type="number"
                                min="1"
                                className="form-input"
                                style={{ padding: '6px 10px', fontSize: '13px' }}
                                value={topic.duration}
                                onChange={(e) => handleTopicChange(moduleIndex, topicIndex, 'duration', e.target.value)}
                              />
                              <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '5px' }}>minutes</div>
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                Instructor
                              </label>
                              <select
                                className="form-select"
                                style={{ padding: '6px 10px', fontSize: '13px' }}
                                value={getInstructorId(topic.instructor)}
                                onChange={(e) => handleTopicChange(moduleIndex, topicIndex, 'instructor', e.target.value)}
                              >
                                <option value="">Not assigned</option>
                                {teachers.map((teacher) => (
                                  <option key={teacher._id} value={teacher._id}>{teacher.name}</option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                Date & Time
                              </label>
                              <input
                                type="datetime-local"
                                className="form-input"
                                style={{ padding: '6px 10px', fontSize: '13px' }}
                                value={toInput(topic.scheduledAt)}
                                onChange={(e) => handleTopicChange(
                                  moduleIndex,
                                  topicIndex,
                                  'scheduledAt',
                                  e.target.value ? new Date(e.target.value).toISOString() : ''
                                )}
                              />
                            </div>
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) 170px', gap: '12px', alignItems: 'end' }}>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                Meeting Link
                              </label>
                              <input
                                type="url"
                                className="form-input"
                                placeholder="Paste Zoom/Google Meet link or leave empty to auto-create Zoom"
                                style={{ padding: '6px 10px', fontSize: '13px' }}
                                value={topic.meetingLink || ''}
                                onChange={(e) => handleTopicChange(moduleIndex, topicIndex, 'meetingLink', e.target.value)}
                              />
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                                Meeting Status
                              </label>
                              <div
                                className={`badge ${topic.meetingLink ? 'badge-zoom' : topic.scheduledAt ? 'badge-scheduled' : 'badge-ended'}`}
                                style={{ height: '36px', justifyContent: 'center', width: '100%' }}
                              >
                                {topic.meetingLink ? 'Link ready' : topic.scheduledAt ? 'Auto Zoom on save' : 'Not scheduled'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        </div>

        <div className="modal-actions" style={{ background: 'var(--bg-secondary)', padding: '16px 28px', borderTop: '1px solid var(--border-subtle)', marginTop: 0, zIndex: 10, boxShadow: '0 -14px 28px rgba(15, 23, 42, 0.08)' }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving || assigning}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || assigning || loading || !curriculum}>
            {saving ? 'Saving...' : '✓ Save Curriculum & Classes'}
          </button>
        </div>
      </div>
    </div>
  );
}
