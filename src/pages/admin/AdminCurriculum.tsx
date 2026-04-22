import React, { useEffect, useState } from 'react';
import { batchApi } from '../../api';
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

export default function AdminCurriculum() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);

  const activeBatches = batches.filter((batch) => batch.isActive).length;
  const totalStudents = batches.reduce((sum, batch) => sum + (batch.students?.length || 0), 0);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await batchApi.getAll();
        setBatches(res.data.batches || []);
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Curriculum</h1>
          <p className="page-subtitle">One batch has one curriculum. Reassigning a template replaces the current batch curriculum for every student in that batch.</p>
        </div>
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
                    Choose one curriculum template per batch, then fine-tune class names, dates, and Google Meet links without affecting other batches.
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
    </div>
  );
}
