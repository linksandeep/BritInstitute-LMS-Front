import { useEffect, useMemo, useState } from 'react';
import { adminApi } from '../../api';

interface ActivityUser {
  id: string;
  name: string;
  username: string;
  role: 'student' | 'teacher';
  totalSeconds: number;
  averageSessionSeconds: number;
  loginCount: number;
  lastLoginAt?: string;
  lastLogoutAt?: string;
  lastActiveAt?: string;
  recentSessions: Array<{
    id: string;
    loginAt: string;
    logoutAt?: string;
    lastActiveAt: string;
    durationSeconds: number;
    status: string;
    logoutReason?: string;
  }>;
}

interface ActivityResponse {
  summary: {
    totalUsersTracked: number;
    totalSessions: number;
    totalSeconds: number;
    averageSessionSeconds: number;
    daily: { sessions: number; totalSeconds: number; averageSessionSeconds: number };
    weekly: { sessions: number; totalSeconds: number; averageSessionSeconds: number };
    monthly: { sessions: number; totalSeconds: number; averageSessionSeconds: number };
  };
  mostActiveStudents: ActivityUser[];
  mostActiveTeachers: ActivityUser[];
  users: ActivityUser[];
}

const formatDuration = (seconds = 0) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const formatDate = (value?: string) => {
  if (!value) return 'Not recorded';
  return new Date(value).toLocaleString();
};

export default function AdminActivity() {
  const [activity, setActivity] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | 'student' | 'teacher'>('all');

  const loadActivity = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await adminApi.getActivity();
      setActivity(res.data.activity);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(message || 'Unable to load activity analytics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActivity();
  }, []);

  const filteredUsers = useMemo(() => {
    if (!activity) return [];
    if (roleFilter === 'all') return activity.users;
    return activity.users.filter((user) => user.role === roleFilter);
  }, [activity, roleFilter]);

  if (loading) {
    return <div className="loading-center"><div className="spinner" /><span>Loading activity...</span></div>;
  }

  if (error) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!activity) return null;

  const statCards = [
    { label: 'Tracked Users', value: String(activity.summary.totalUsersTracked), help: 'Students and teachers' },
    { label: 'Total LMS Time', value: formatDuration(activity.summary.totalSeconds), help: `${activity.summary.totalSessions} sessions` },
    { label: 'Avg. Session', value: formatDuration(activity.summary.averageSessionSeconds), help: 'Across all sessions' },
    { label: 'Today', value: formatDuration(activity.summary.daily.totalSeconds), help: `${activity.summary.daily.sessions} sessions` },
  ];

  const rangeCards = [
    { label: 'Daily Usage', range: activity.summary.daily },
    { label: 'Weekly Usage', range: activity.summary.weekly },
    { label: 'Monthly Usage', range: activity.summary.monthly },
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Activity Analytics</h1>
          <p className="page-subtitle">Track login activity, LMS time, session history, and engagement trends.</p>
        </div>
        <button className="btn btn-secondary" onClick={loadActivity}>Refresh</button>
      </div>

      <div className="grid-4" style={{ marginBottom: '20px' }}>
        {statCards.map((card) => (
          <div className="stat-card" key={card.label}>
            <div>
              <div className="stat-label">{card.label}</div>
              <div className="stat-value">{card.value}</div>
              <div className="text-muted">{card.help}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid-3" style={{ marginBottom: '20px' }}>
        {rangeCards.map((card) => (
          <div className="card" key={card.label}>
            <div className="metric-label">{card.label}</div>
            <div className="metric-value">{formatDuration(card.range.totalSeconds)}</div>
            <div className="metric-help">{card.range.sessions} sessions • Avg {formatDuration(card.range.averageSessionSeconds)}</div>
          </div>
        ))}
      </div>

      <div className="grid-2" style={{ marginBottom: '20px' }}>
        <ActivityList title="Most Active Students" users={activity.mostActiveStudents} />
        <ActivityList title="Most Active Teachers" users={activity.mostActiveTeachers} />
      </div>

      <div className="card">
        <div className="page-header" style={{ marginBottom: '18px' }}>
          <div>
            <h2 style={{ fontSize: '20px' }}>User Activity</h2>
            <p className="page-subtitle">Last login, logout, active timestamp, login count, and session history.</p>
          </div>
          <div className="tabs" style={{ marginBottom: 0, minWidth: '280px' }}>
            {(['all', 'student', 'teacher'] as const).map((role) => (
              <button key={role} className={`tab-btn ${roleFilter === role ? 'active' : ''}`} onClick={() => setRoleFilter(role)}>
                {role === 'all' ? 'All' : role === 'student' ? 'Students' : 'Teachers'}
              </button>
            ))}
          </div>
        </div>

        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Total Time</th>
                <th>Avg Session</th>
                <th>Logins</th>
                <th>Last Login</th>
                <th>Last Logout</th>
                <th>Last Active</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <strong>{user.name}</strong>
                    <div className="text-muted">@{user.username}</div>
                  </td>
                  <td><span className="badge badge-other">{user.role}</span></td>
                  <td>{formatDuration(user.totalSeconds)}</td>
                  <td>{formatDuration(user.averageSessionSeconds)}</td>
                  <td>{user.loginCount}</td>
                  <td>{formatDate(user.lastLoginAt)}</td>
                  <td>{formatDate(user.lastLogoutAt)}</td>
                  <td>{formatDate(user.lastActiveAt)}</td>
                </tr>
              ))}
              {!filteredUsers.length && (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '28px' }}>No activity recorded yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function ActivityList({ title, users }: { title: string; users: ActivityUser[] }) {
  return (
    <div className="card">
      <h2 style={{ fontSize: '18px', marginBottom: '14px' }}>{title}</h2>
      <div style={{ display: 'grid', gap: '10px' }}>
        {users.length ? users.slice(0, 5).map((user) => (
          <div key={user.id} className="soft-panel" style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
            <div>
              <strong>{user.name}</strong>
              <div className="text-muted">@{user.username} • {user.loginCount} logins</div>
            </div>
            <strong>{formatDuration(user.totalSeconds)}</strong>
          </div>
        )) : <div className="text-muted">No activity yet</div>}
      </div>
    </div>
  );
}
