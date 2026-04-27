import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { label: 'Dashboard', path: '/superadmin' },
  { label: 'Teachers', path: '/superadmin/teachers' },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: '264px',
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #f8fbff, #f2f7fd)',
          borderRight: '1px solid var(--border-subtle)',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
          position: 'sticky',
          top: 0,
          height: '100vh',
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '24px 20px 18px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="soft-panel" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(5,150,105,0.12), rgba(16,185,129,0.04))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, #059669, #10b981)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0, boxShadow: '0 10px 24px rgba(16,185,129,0.18)' }}>
                S
              </div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '16px', color: 'var(--text-primary)' }}>Brit Institute</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Super Admin</div>
              </div>
            </div>
          </div>
        </div>

        <nav style={{ padding: '18px 12px', flex: 1 }}>
          {navItems.map((item) => {
            const active = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  textDecoration: 'none',
                  marginBottom: '6px',
                  color: active ? '#fff' : 'var(--text-secondary)',
                  background: active ? 'linear-gradient(135deg, #059669, #10b981)' : 'transparent',
                  fontWeight: active ? '700' : '500',
                  fontSize: '14px',
                  transition: 'all 0.2s ease',
                  boxShadow: active ? '0 10px 24px rgba(16,185,129,0.2)' : 'none',
                  border: active ? '1px solid rgba(16,185,129,0.2)' : '1px solid transparent',
                }}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div className="soft-panel" style={{ padding: '14px', marginBottom: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '6px' }}>Signed in as</div>
            <div style={{ fontSize: '14px', fontWeight: '700' }}>{user?.name}</div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>Super Admin</div>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }}>
            Sign Out
          </button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '36px', minWidth: 0, overflowY: 'auto' }}>
        <div className="slide-in">{children}</div>
      </main>
    </div>
  );
}
