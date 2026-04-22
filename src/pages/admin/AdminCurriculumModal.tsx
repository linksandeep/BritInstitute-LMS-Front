import React, { useEffect, useState } from 'react';
import { curriculumApi } from '../../api';

interface Topic {
  _id?: string;
  title: string;
  duration: number;
  scheduledAt?: string;
  meetingLink?: string;
  liveClassId?: string;
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

export default function AdminCurriculumModal({ batchId, batchName, onClose }: Props) {
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [templates, setTemplates] = useState<Curriculum[]>([]);
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
      const [curriculumRes, templateRes] = await Promise.all([
        curriculumApi.getByBatch(batchId).catch(() => ({ data: { curriculum: null } })),
        curriculumApi.getDefaults(),
      ]);
      setCurriculum(curriculumRes.data.curriculum || null);
      setTemplates(templateRes.data.curriculums || []);
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
      topics[topicIndex] = { ...topics[topicIndex], [field]: value };
      module.topics = topics;
      modules[moduleIndex] = module;
      return { ...prev, modules };
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
      <div className="modal" style={{ maxWidth: '860px', maxHeight: '90vh', overflowY: 'auto' }}>
        <div className="modal-header" style={{ position: 'sticky', top: 0, background: 'var(--bg-secondary)', zIndex: 10, paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
          <div>
            <h2>📚 Manage Curriculum</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>
              Batch: <span style={{ color: 'var(--accent)' }}>{batchName}</span>
            </p>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

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
                  <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>Each batch can have only one curriculum. Assigning another template replaces the current one for the whole batch.</div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) auto', gap: '12px', alignItems: 'end' }}>
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
                {curriculum.modules.map((module, moduleIndex) => (
                  <div key={module._id || moduleIndex} className="card section-shell" style={{ padding: '18px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '16px' }}>
                      <h3 style={{ fontSize: '16px', fontWeight: '700', color: 'var(--accent)' }}>
                        {module.title}
                      </h3>
                      <span className="badge badge-scheduled">{module.topics.length} classes</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {module.topics.map((topic, topicIndex) => (
                        <div
                          key={topic._id || `${moduleIndex}-${topicIndex}`}
                          className="soft-panel"
                          style={{ padding: '14px', display: 'grid', gridTemplateColumns: 'minmax(220px, 1fr) 1fr 1fr', gap: '12px' }}
                        >
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
                            <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>
                              Duration: {topic.duration} mins
                            </div>
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
                          <div>
                            <label style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                              Google Meet Link
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              style={{ padding: '6px 10px', fontSize: '13px' }}
                              placeholder="https://meet.google.com/..."
                              value={topic.meetingLink || ''}
                              onChange={(e) => handleTopicChange(moduleIndex, topicIndex, 'meetingLink', e.target.value)}
                            />
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

        <div className="modal-actions" style={{ position: 'sticky', bottom: 0, background: 'var(--bg-secondary)', padding: '16px 0 0 0', marginTop: '16px', borderTop: '1px solid var(--border-subtle)', zIndex: 10 }}>
          <button className="btn btn-secondary" onClick={onClose} disabled={saving || assigning}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving || assigning || loading || !curriculum}>
            {saving ? 'Saving...' : '✓ Save Curriculum & Classes'}
          </button>
        </div>
      </div>
    </div>
  );
}
