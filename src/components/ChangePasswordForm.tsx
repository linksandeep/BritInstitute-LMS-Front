import React, { useState } from 'react';
import { authApi } from '../api';

const initialForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

const passwordHelpText = 'Use at least 8 characters with uppercase, lowercase, and a number.';

export default function ChangePasswordForm({ onSuccess }: { onSuccess?: () => void }) {
  const [form, setForm] = useState(initialForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');

    if (!form.currentPassword || !form.newPassword || !form.confirmPassword) {
      setError('Please complete all password fields.');
      return;
    }

    if (form.newPassword !== form.confirmPassword) {
      setError('New password and confirmation do not match.');
      return;
    }

    setSaving(true);
    try {
      const res = await authApi.changePassword(form);
      setMessage(res.data.message || 'Password updated successfully.');
      setForm(initialForm);
      onSuccess?.();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Unable to update password. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form className="change-password-form" onSubmit={handleSubmit}>
      <div>
        <span className="student-eyebrow">Security</span>
        <h2>Change password</h2>
        <p>Update your login password. You will use the new password the next time you sign in.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <div className="student-form-grid">
        <div className="form-group">
          <label className="form-label" htmlFor="current-password">Current Password</label>
          <input
            id="current-password"
            className="form-input"
            type="password"
            value={form.currentPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
            autoComplete="current-password"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="new-password">New Password</label>
          <input
            id="new-password"
            className="form-input"
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, newPassword: e.target.value }))}
            autoComplete="new-password"
          />
        </div>
        <div className="form-group">
          <label className="form-label" htmlFor="confirm-password">Confirm New Password</label>
          <input
            id="confirm-password"
            className="form-input"
            type="password"
            value={form.confirmPassword}
            onChange={(e) => setForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
            autoComplete="new-password"
          />
        </div>
      </div>

      <div className="change-password-actions">
        <small>{passwordHelpText}</small>
        <button className="btn btn-primary" type="submit" disabled={saving}>
          {saving ? 'Updating...' : 'Update Password'}
        </button>
      </div>
    </form>
  );
}
