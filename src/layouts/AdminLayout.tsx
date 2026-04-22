import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { icon: '📊', label: 'Dashboard',   path: '/admin' },
  { icon: '🗂️', label: 'Batches',     path: '/admin/batches' },
  { icon: '🧭', label: 'Curriculum',  path: '/admin/curriculum' },
  { icon: '👥', label: 'Students',    path: '/admin/users' },
  { icon: '📚', label: 'Courses',     path: '/admin/courses' },
  { icon: '🎥', label: 'Live Classes', path: '/admin/live-classes' },
  { icon: '🎬', label: 'Recorded',    path: '/admin/recorded' },
  { icon: '📝', label: 'Assignments', path: '/admin/assignments' },
  { icon: '🗓️', label: 'Appointments', path: '/admin/appointments' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: '264px', minHeight: '100vh', background: 'linear-gradient(180deg, #f8fbff, #f2f7fd)',
        borderRight: '1px solid var(--border-subtle)', display: 'flex',
        flexDirection: 'column', flexShrink: 0, position: 'sticky', top: 0, height: '100vh', overflowY: 'auto',
      }}>
        <div style={{ padding: '24px 20px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="soft-panel" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(29,155,240,0.12), rgba(58,183,255,0.04))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, var(--accent), #3ab7ff)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, boxShadow: '0 10px 24px rgba(29,155,240,0.22)' }}>
              🎓
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '16px' }}>Brit Institute</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Admin Workspace</div>
              </div>
            </div>
          </div>
        </div>

        <nav style={{ padding: '18px 12px', flex: 1 }}>
          {navItems.map(item => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 14px',
                  borderRadius: '12px', textDecoration: 'none', marginBottom: '6px',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  background: active ? 'linear-gradient(135deg, var(--accent), #3ab7ff)' : 'transparent',
                  fontWeight: active ? '700' : '500', fontSize: '14px',
                  transition: 'all 0.2s ease',
                  boxShadow: active ? '0 10px 24px var(--accent-glow)' : 'none',
                  border: active ? '1px solid rgba(127,211,255,0.2)' : '1px solid transparent',
                }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--accent-light)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <span style={{ fontSize: '16px' }}>{item.icon}</span>
                <span>{item.label}</span>
                {active && <span style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: '#ffffff' }} />}
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div className="soft-panel" style={{ padding: '14px', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Signed in as</div>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>{user?.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Administrator</div>
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

      <main style={{ flex: 1, padding: '36px', minWidth: 0, overflowY: 'auto' }}>
        <div className="slide-in">{children}</div>
      </main>
    </div>
  );
}
