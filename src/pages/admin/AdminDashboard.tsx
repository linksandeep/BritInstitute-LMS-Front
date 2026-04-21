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
    { icon: '👥', label: 'Total Students', value: stats.totalStudents, color: '#6366f1', bg: 'rgba(99,102,241,0.1)' },
    { icon: '🗂️', label: 'Total Batches',  value: stats.totalBatches,  color: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
    { icon: '📚', label: 'Total Courses',  value: stats.totalCourses,  color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
    { icon: '🎥', label: 'Upcoming Classes', value: upcomingClasses.length, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  ];

  return (
    <div className="fade-in">
      {/* Welcome */}
      <div style={{ marginBottom: '32px' }}>
        <h1 className="page-title">Welcome back, {user?.name}!</h1>
        <p className="page-subtitle">Here's what's happening at Brit Institute today.</p>
      </div>

      {/* Stats */}
      <div className="grid-4" style={{ marginBottom: '32px' }}>
        {statCards.map((s, i) => (
          <div key={i} className="stat-card">
            <div className="stat-icon" style={{ background: s.bg, color: s.color }}>{s.icon}</div>
            <div>
              <div className="stat-value">{Number(s.value).toLocaleString()}</div>
              <div className="stat-label">{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div style={{ marginBottom: '32px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Quick Actions</h2>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {[
            { label: '+ Add Student', path: '/admin/users', emoji: '👤' },
            { label: '+ Create Batch', path: '/admin/batches', emoji: '🗂️' },
            { label: '+ Create Course', path: '/admin/courses', emoji: '📚' },
            { label: '+ Schedule Class', path: '/admin/live-classes', emoji: '🎥' },
            { label: '+ Add Recording', path: '/admin/recorded', emoji: '🎬' },
            { label: '+ New Assignment', path: '/admin/assignments', emoji: '📝' },
          ].map(a => (
            <button key={a.path} className="btn btn-secondary" onClick={() => navigate(a.path)}>
              {a.emoji} {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming classes */}
      <div>
        <h2 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '16px' }}>Upcoming Live Classes</h2>
        {upcomingClasses.length === 0 ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">📅</div>
              <p>No upcoming classes scheduled. <button className="btn btn-primary btn-sm" style={{ marginLeft: '10px' }} onClick={() => navigate('/admin/live-classes')}>Schedule Now</button></p>
            </div>
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
