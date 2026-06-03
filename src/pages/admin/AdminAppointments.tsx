import React, { useEffect, useState } from 'react';
import { sessionApi } from '../../api';

interface Booking {
  _id: string;
  student: { name: string; username: string };
  mentor: { name: string; username: string };
  topic: string;
  dateTime: string;
  duration?: number;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  meetingLink?: string;
  zoomStartUrl?: string;
  createdAt: string;
}

const toDateTimeInputValue = (value: string) => {
  const date = new Date(value);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

export default function AdminAppointments() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [meetLinkInput, setMeetLinkInput] = useState<{ [key: string]: string }>({});
  const [scheduleInput, setScheduleInput] = useState<{ [key: string]: string }>({});

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const res = await sessionApi.adminGetAll();
      setBookings(res.data.bookings);
      const nextScheduleInput: { [key: string]: string } = {};
      res.data.bookings.forEach((booking: Booking) => {
        nextScheduleInput[booking._id] = toDateTimeInputValue(booking.dateTime);
      });
      setScheduleInput(nextScheduleInput);
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
      const apiError = err as { response?: { data?: { message?: string } } };
      alert(apiError.response?.data?.message || 'Failed to update booking status');
    } finally {
      setUpdating(null);
    }
  };

  const handleReschedule = async (id: string) => {
    if (!scheduleInput[id]) {
      alert('Please select a new date and time first.');
      return;
    }

    setUpdating(id);
    try {
      await sessionApi.adminUpdate(id, { dateTime: new Date(scheduleInput[id]).toISOString() });
      await fetchBookings();
    } catch (err) {
      const apiError = err as { response?: { data?: { message?: string } } };
      alert(apiError.response?.data?.message || 'Failed to reschedule booking');
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
                      {b.duration || 30} min • Requested: {new Date(b.createdAt).toLocaleDateString()}
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
                          <div className="actions-row" style={{ alignItems: 'stretch' }}>
                            <input
                              type="datetime-local"
                              className="form-input"
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                              value={scheduleInput[b._id] || ''}
                              onChange={e => setScheduleInput(p => ({ ...p, [b._id]: e.target.value }))}
                            />
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleReschedule(b._id)}
                              disabled={updating === b._id}
                            >
                              Reschedule
                            </button>
                          </div>
                          <input
                            className="form-input"
                            style={{ padding: '6px 10px', fontSize: '12px' }}
                            placeholder="Optional Zoom link override"
                            value={meetLinkInput[b._id] || ''}
                            onChange={e => setMeetLinkInput(p => ({ ...p, [b._id]: e.target.value }))}
                          />
                          <div className="actions-row">
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleUpdateStatus(b._id, 'accepted')}
                              disabled={updating === b._id}
                            >
                              Accept & Create Zoom
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
                          <div className="actions-row" style={{ alignItems: 'stretch' }}>
                            <input
                              type="datetime-local"
                              className="form-input"
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                              value={scheduleInput[b._id] || ''}
                              onChange={e => setScheduleInput(p => ({ ...p, [b._id]: e.target.value }))}
                            />
                            <button
                              className="btn btn-secondary btn-sm"
                              onClick={() => handleReschedule(b._id)}
                              disabled={updating === b._id}
                            >
                              Reschedule
                            </button>
                          </div>
                          {b.meetingLink ? (
                            <>
                              <a href={b.meetingLink} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--accent)', textDecoration: 'none' }}>
                                🔗 Join Zoom
                              </a>
                              {b.zoomStartUrl && (
                                <a href={b.zoomStartUrl} target="_blank" rel="noreferrer" style={{ fontSize: '12px', color: 'var(--success)', textDecoration: 'none' }}>
                                  ▶ Start as Host
                                </a>
                              )}
                            </>
                          ) : (
                            <input
                              className="form-input"
                              style={{ padding: '6px 10px', fontSize: '12px' }}
                              placeholder="Add Zoom link"
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
                                 Update Zoom Link
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
