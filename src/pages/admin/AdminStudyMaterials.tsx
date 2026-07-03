import React, { useEffect, useState } from 'react';
import { batchApi, studyMaterialApi } from '../../api';
import { formatUkDate } from '../../utils/ukTime';

interface Batch {
  _id: string;
  name: string;
  course?: { title: string };
}

interface StudyMaterial {
  _id: string;
  batch: Batch;
  title: string;
  description: string;
  materialUrl: string;
  materialType: string;
  order: number;
  createdAt: string;
}

const typeLabels: Record<string, { label: string; icon: string }> = {
  drive: { label: 'Google Drive', icon: 'DR' },
  pdf: { label: 'PDF', icon: 'PDF' },
  doc: { label: 'Document', icon: 'DOC' },
  slides: { label: 'Slides', icon: 'SL' },
  sheet: { label: 'Sheet', icon: 'SH' },
  link: { label: 'Link', icon: 'LN' },
  other: { label: 'Other', icon: 'OT' },
};

const emptyForm = { batch: '', title: '', description: '', materialUrl: '', materialType: 'drive', order: '0' };

export default function AdminStudyMaterials() {
  const [materials, setMaterials] = useState<StudyMaterial[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editMaterial, setEditMaterial] = useState<StudyMaterial | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchMaterials = async (batchFilter = selectedBatch) => {
    try {
      const [batchRes, materialRes] = await Promise.all([
        batchApi.getAll(),
        studyMaterialApi.getAll(batchFilter !== 'all' ? batchFilter : undefined),
      ]);
      setBatches(batchRes.data.batches || []);
      setMaterials(materialRes.data.materials || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMaterials('all'); }, []);

  useEffect(() => {
    if (!loading) {
      fetchMaterials(selectedBatch);
    }
  }, [selectedBatch]);

  const openCreate = () => {
    const defaultBatch = selectedBatch !== 'all' ? selectedBatch : (batches[0]?._id || '');
    setEditMaterial(null);
    setForm({ ...emptyForm, batch: defaultBatch });
    setError('');
    setShowModal(true);
  };

  const openEdit = (material: StudyMaterial) => {
    setEditMaterial(material);
    setForm({
      batch: material.batch?._id || '',
      title: material.title,
      description: material.description || '',
      materialUrl: material.materialUrl,
      materialType: material.materialType,
      order: String(material.order || 0),
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    setError('');
    if (!form.batch || !form.title || !form.materialUrl) {
      setError('Batch, title and material link are required');
      return;
    }

    setSaving(true);
    try {
      const payload = { ...form, order: Number(form.order) };
      if (editMaterial) await studyMaterialApi.update(editMaterial._id, payload);
      else await studyMaterialApi.create(payload);
      await fetchMaterials(selectedBatch);
      setShowModal(false);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this study material?')) return;
    await studyMaterialApi.delete(id);
    await fetchMaterials(selectedBatch);
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Study Material</h1>
          <p className="page-subtitle">Add Drive links and other learning resources for students</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>+ Add Material</button>
      </div>

      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="form-group" style={{ marginBottom: 0 }}>
          <label className="form-label">Filter by Batch</label>
          <select className="form-select" value={selectedBatch} onChange={e => setSelectedBatch(e.target.value)}>
            <option value="all">All batches</option>
            {batches.map(batch => (
              <option key={batch._id} value={batch._id}>
                {batch.name}{batch.course?.title ? ` - ${batch.course.title}` : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && !showModal && <div className="alert alert-error">Warning: {error}</div>}

      {materials.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">SM</div>
            <p>No study material has been added yet.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Title</th>
                <th>Batch</th>
                <th>Type</th>
                <th>Link</th>
                <th>Added</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((material) => {
                const type = typeLabels[material.materialType] || typeLabels.other;
                return (
                  <tr key={material._id}>
                    <td style={{ color: 'var(--text-muted)' }}>{material.order}</td>
                    <td>
                      <strong>{material.title}</strong>
                      {material.description && (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {material.description.slice(0, 70)}{material.description.length > 70 ? '...' : ''}
                        </p>
                      )}
                    </td>
                    <td>
                      <strong>{material.batch?.name || 'Batch not found'}</strong>
                      {material.batch?.course?.title && (
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>
                          {material.batch.course.title}
                        </p>
                      )}
                    </td>
                    <td><span className="badge badge-other">{type.icon} {type.label}</span></td>
                    <td>
                      <a className="btn btn-secondary btn-sm" href={material.materialUrl} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{formatUkDate(material.createdAt)}</td>
                    <td>
                      <div className="actions-row">
                        <button className="btn btn-secondary btn-sm" onClick={() => openEdit(material)}>Edit</button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(material._id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal">
            <div className="modal-header">
              <h2>{editMaterial ? 'Edit Study Material' : 'Add Study Material'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>X</button>
            </div>
            {error && <div className="alert alert-error">Warning: {error}</div>}
            <div className="form-group">
              <label className="form-label">Batch</label>
              <select
                className="form-select"
                value={form.batch}
                onChange={e => setForm(f => ({ ...f, batch: e.target.value }))}
              >
                <option value="">Select batch</option>
                {batches.map(batch => (
                  <option key={batch._id} value={batch._id}>
                    {batch.name}{batch.course?.title ? ` - ${batch.course.title}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Material Type</label>
                <select
                  className="form-select"
                  value={form.materialType}
                  onChange={e => setForm(f => ({ ...f, materialType: e.target.value }))}
                >
                  <option value="drive">Google Drive</option>
                  <option value="pdf">PDF</option>
                  <option value="doc">Document</option>
                  <option value="slides">Slides</option>
                  <option value="sheet">Sheet</option>
                  <option value="link">Link</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Order / Position</label>
                <input
                  className="form-input"
                  type="number"
                  min="0"
                  value={form.order}
                  onChange={e => setForm(f => ({ ...f, order: e.target.value }))}
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Title</label>
              <input
                className="form-input"
                placeholder="e.g. Excel practice workbook"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Material Link</label>
              <input
                className="form-input"
                placeholder="Paste Google Drive link or any resource URL"
                value={form.materialUrl}
                onChange={e => setForm(f => ({ ...f, materialUrl: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Short note for students..."
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : (editMaterial ? 'Update' : 'Add Material')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
