import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adminApi, liveClassApi } from '../../api';

interface Stats { totalStudents: number; totalCourses: number; totalBatches: number; }

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats>({ totalStudents: 0, totalCourses: 0, totalBatches: 0 });
  const [upcomingClasses, setUpcomingClasses] = useState<unknown[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, classesRes] = await Promise.all([
          adminApi.getStats(),
          liveClassApi.getAll(),
        ]);
        setStats(statsRes.data.stats);
        // Upcoming = scheduled only
        const all = classesRes.data.liveClasses as { status: string; scheduledAt: string; classNumber: string; topic: string; course: { title: string } }[];
        setUpcomingClasses(all.filter(c => c.status === 'scheduled').slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div className="loading-center"><div className="spinner" /><span>Loading dashboard...</span></div>
  );

  const statCards = [
    { icon: '👥', label: 'Total Students', value: stats.totalStudents, color: '#1d4ed8', bg: 'rgba(29,78,216,0.08)', help: 'Active learner records' },
    { icon: '🗂️', label: 'Total Batches',  value: stats.totalBatches,  color: '#d97706', bg: 'rgba(217,119,6,0.08)', help: 'Program delivery groups' },
    { icon: '📚', label: 'Total Courses',  value: stats.totalCourses,  color: '#059669', bg: 'rgba(5,150,105,0.08)', help: 'Published learning tracks' },
    { icon: '🎥', label: 'Upcoming Classes', value: upcomingClasses.length, color: '#0284c7', bg: 'rgba(2,132,199,0.08)', help: 'Scheduled live sessions' },
  ];

  return (
    <div className="fade-in">
      <div className="card surface-hero" style={{ padding: '30px', marginBottom: '28px' }}>
        <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '24px', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
              Teacher Overview
            </div>
            <h1 style={{ fontSize: '34px', lineHeight: 1.1, fontWeight: 800, color: 'var(--text-primary)', marginBottom: '10px' }}>
              Welcome back, {user?.name}!
            </h1>
            <p style={{ fontSize: '15px', color: 'var(--text-secondary)', maxWidth: '720px' }}>
              Here is the current operating snapshot for Brit Institute, including learner volume, active batches, and upcoming live sessions.
            </p>
          </div>

          <div className="soft-panel" style={{ padding: '16px 18px', minWidth: '220px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>
              Today
            </div>
            <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
              {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
              Teacher workspace is ready for batch and curriculum operations.
            </div>
          </div>
        </div>
      </div>

      <div className="grid-4" style={{ marginBottom: '32px' }}>
        {statCards.map((s, i) => (
          <div key={i} className="stat-card" style={{ alignItems: 'flex-start' }}>
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div style={{ flex: 1 }}>
              <div className="stat-value">{Number(s.value).toLocaleString()}</div>
              <div className="stat-label">{s.label}</div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '6px' }}>{s.help}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="card section-shell" style={{ marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '19px', fontWeight: '800', marginBottom: '4px', color: 'var(--text-primary)' }}>Quick Actions</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Jump straight into common teaching and mentoring tasks.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: '+ Add Student', path: '/teacher/users', emoji: '👤' },
            { label: '+ Create Batch', path: '/teacher/batches', emoji: '🗂️' },
            { label: '+ Create Course', path: '/teacher/courses', emoji: '📚' },
            { label: '+ Schedule Class', path: '/teacher/live-classes', emoji: '🎥' },
            { label: '+ Add Recording', path: '/teacher/recorded', emoji: '🎬' },
            { label: '+ New Assignment', path: '/teacher/assignments', emoji: '📝' },
          ].map(a => (
            <button key={a.path} className="btn btn-secondary" onClick={() => navigate(a.path)}>
              {a.emoji} {a.label}
            </button>
          ))}
        </div>
      </div>

      <div className="card section-shell">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px', gap: '16px', flexWrap: 'wrap' }}>
          <div>
            <h2 style={{ fontSize: '19px', fontWeight: '800', marginBottom: '4px', color: 'var(--text-primary)' }}>Upcoming Live Classes</h2>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>The next scheduled classes across your active operations.</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => navigate('/teacher/live-classes')}>
            Open Live Classes
          </button>
        </div>
        {upcomingClasses.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <p>No upcoming classes scheduled.</p>
            <button className="btn btn-primary btn-sm" style={{ marginTop: '12px' }} onClick={() => navigate('/teacher/live-classes')}>
              Schedule Now
            </button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Class</th>
                  <th>Topic</th>
                  <th>Course</th>
                  <th>Scheduled At</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {(upcomingClasses as { classNumber: string; topic: string; course: { title: string }; scheduledAt: string; status: string }[]).map((cls, i) => (
                  <tr key={i}>
                    <td><strong>{cls.classNumber}</strong></td>
                    <td>{cls.topic}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{cls.course?.title || '—'}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{new Date(cls.scheduledAt).toLocaleString()}</td>
                    <td><span className={`badge badge-${cls.status}`}>{cls.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
