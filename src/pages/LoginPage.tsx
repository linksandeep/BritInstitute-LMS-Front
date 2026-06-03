import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BrandLogo from '../components/BrandLogo';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Navigate once user state actually flushes — avoids React 18 batching race
  useEffect(() => {
    if (user) {
      navigate(
        user.role === 'superadmin' ? '/superadmin' : user.role === 'student' ? '/dashboard' : '/admin',
        { replace: true }
      );
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username, password);
      // Navigation happens via the useEffect above once user state updates
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(msg || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-shell">
      <section className="login-hero" aria-label="Brit Institute LMS welcome">
        <div className="login-hero-card">
          <BrandLogo subtitle="Career LMS" />
          <div className="login-hero-copy">
            <p className="login-kicker">Smart LMS for career growth</p>
            <h1>Learn, practise, and get ready for your next job.</h1>
            <p>Track classes, live projects, mock interviews, resume and LinkedIn optimization, and placement progress from one friendly student portal.</p>
          </div>

          <div className="login-feature-strip" aria-label="Student success tools">
            <span>Live classes</span>
            <span>LIVE projects</span>
            <span>Resume and LinkedIn optimization</span>
            <span>Placement progress</span>
          </div>
        </div>
      </section>

      <aside className="login-panel" aria-label="Sign in form">
        <div className="login-card">
          <div className="login-card-header">
            <BrandLogo subtitle="LMS Portal" />
            <div>
              <p className="login-card-eyebrow">Secure access</p>
              <h2>Enter your career dashboard</h2>
              <p>Continue to classes, live projects, placement tools, and student progress.</p>
            </div>
          </div>

          {error && (
            <div className="alert alert-error">
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">Username</label>
              <input
                id="username"
                className="form-input"
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="password">Password</label>
              <div className="password-field">
                <input
                  id="password"
                  className="form-input"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 5.2A9.8 9.8 0 0 1 12 5c5 0 8.5 4.4 9.6 6a12.8 12.8 0 0 1-3 3.5" />
                      <path d="M6.4 6.6A13.3 13.3 0 0 0 2.4 12c1.1 1.6 4.6 6 9.6 6 1.5 0 2.9-.4 4.1-1" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.4 12S5.9 6 12 6s9.6 6 9.6 6-3.5 6-9.6 6-9.6-6-9.6-6Z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
            <button
              id="login-btn"
              type="submit"
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '15px', marginTop: '6px' }}
              disabled={loading}
            >
              {loading ? (
                <><span className="spinner" style={{ width: '18px', height: '18px', borderWidth: '2px' }} /> Signing in...</>
              ) : 'Sign In'}
            </button>
          </form>

          <p className="login-help-text">
            Account credentials are provided by your teacher, admin, or super admin
          </p>

          <div className="login-trust-row" aria-label="Portal capabilities">
            <span>Live LMS</span>
            <span>Placement tools</span>
            <span>Progress AI</span>
          </div>
        </div>
      </aside>
    </main>
  );
}
