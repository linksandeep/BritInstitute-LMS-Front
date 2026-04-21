import React, { useEffect, useState } from 'react';
import { sessionApi } from '../../api';

interface Booking {
  _id: string;
  student: { name: string; username: string };
  mentor: { name: string; username: string };
  topic: string;
  dateTime: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  meetingLink?: string;
  createdAt: string;
}

export default function AdminAppointments() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [meetLinkInput, setMeetLinkInput] = useState<{ [key: string]: string }>({});

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await sessionApi.adminGetAll();
      setBookings(res.data.bookings);
    } catch (err) {
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdating(id);
    try {
      const payload: any = { status };
      if (status === 'accepted' && meetLinkInput[id]) {
        payload.meetingLink = meetLinkInput[id];
      }
      await sessionApi.adminUpdate(id, payload);
      await fetchBookings();
      // Clear input after success
      setMeetLinkInput(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
    } catch (err) {
      alert('Failed to update booking status');
    } finally {
      setUpdating(null);
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'pending': return 'badge-scheduled';
      case 'accepted': return 'badge-present';
      case 'completed': return 'badge-live';
      case 'cancelled': return 'badge-absent';
      default: return '';
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointments</h1>
          <p className="page-subtitle">Manage 1:1 student mentoring sessions</p>
        </div>
        <button className="btn btn-secondary" onClick={fetchBookings}>Refresh</button>
      </div>

      {error ? (
        <div className="alert alert-error">⚠️ {error}</div>
      ) : bookings.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-icon">🗓️</div>
            <p>No appointment requests found.</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>Student</th>
                <th>Mentor</th>
                <th>Topic</th>
                <th>Scheduled At</th>
                <th>Status</th>
                <th>Meet Link / Actions</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map(b => (
                <tr key={b._id}>
                  <td>
                    <div style={{ fontWeight: '600' }}>{b.student?.name}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{b.student?.username}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px' }}>{b.mentor?.name}</div>
                  </td>
                  <td>
                    <div style={{ fontWeight: '500', maxWidth: '200px' }}>{b.topic}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {b._id.slice(-6)}</div>
                  </td>
                  <td>
                    <div style={{ fontSize: '13px' }}>{new Date(b.dateTime).toLocaleString()}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Requested: {new Date(b.createdAt).toLocaleDateString()}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${getStatusBadgeClass(b.status)}`} style={{ textTransform: 'capitalize' }}>
                      {b.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {b.status === 'pending' && (
                        <>
                          <input
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            placeholder="Add Meet Link (optional)"
                            value={meetLinkInput[b._id] || ''}
                            onChange={e => setMeetLinkInput(p => ({ ...p, [b._id]: e.target.value }))}
                          />
                          <div className="actions-row">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleUpdateStatus(b._id, 'accepted')}
                              disabled={updating === b._id}
                            >
                              Accept
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleUpdateStatus(b._id, 'cancelled')}
                              disabled={updating === b._id}
                            >
                              Reject
                            </button>
                          </div>
                        </>
                      )}
                      {b.status === 'accepted' && (
                        <>
                          {b.meetingLink ? (
                            <a href={b.meetingLink} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>
                               🔗 Open Meet
                            </a>
                          ) : (
                            <input
                              className="form-input"
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                              placeholder="Add Meet Link"
                              value={meetLinkInput[b._id] || ''}
                              onChange={e => setMeetLinkInput(p => ({ ...p, [b._id]: e.target.value }))}
                            />
                          )}
                          <div className="actions-row">
                            {!b.meetingLink && (
                               <button 
                                 className="btn btn-secondary btn-sm"
                                 onClick={() => handleUpdateStatus(b._id, 'accepted')}
                                 disabled={!meetLinkInput[b._id]}
                               >
                                 Update Link
                               </button>
                            )}
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleUpdateStatus(b._id, 'completed')}
                              disabled={updating === b._id}
                            >
                              Mark Completed
                            </button>
                          </div>
                        </>
                      )}
                      {(b.status === 'completed' || b.status === 'cancelled') && (
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          No further actions.
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
