import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { icon: '📊', label: 'Dashboard',   path: '/admin' },
  { icon: '🗂️', label: 'Batches',     path: '/admin/batches' },
  { icon: '👥', label: 'Students',    path: '/admin/users' },
  { icon: '📚', label: 'Courses',     path: '/admin/courses' },
  { icon: '🎥', label: 'Live Classes', path: '/admin/live-classes' },
  { icon: '🎬', label: 'Recorded',    path: '/admin/recorded' },
  { icon: '📝', label: 'Assignments', path: '/admin/assignments' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Sidebar */}
      <aside style={{
        width: '240px', minHeight: '100vh', background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border-subtle)', display: 'flex',
        flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        {/* Brand */}
        <div style={{ padding: '24px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, var(--accent), #818cf8)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>
              🎓
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>Brit Institute</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Admin Panel</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ padding: '16px 12px', flex: 1 }}>
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px',
                  borderRadius: '8px', textDecoration: 'none', marginBottom: '4px',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  background: active ? 'linear-gradient(135deg, var(--accent), #818cf8)' : 'transparent',
                  fontWeight: active ? '600' : '400', fontSize: '14px',
                  transition: 'all 0.2s ease',
                  boxShadow: active ? '0 4px 12px var(--accent-glow)' : 'none',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--accent-light)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ background: 'var(--bg-card)', borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
            <div style={{ fontSize: '13px', fontWeight: '600' }}>{user?.name}</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>Administrator</div>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-secondary btn-sm"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, padding: '32px', minWidth: 0, overflowY: 'auto' }}>
        <div className="slide-in">{children}</div>
      </main>
    </div>
  );
}
