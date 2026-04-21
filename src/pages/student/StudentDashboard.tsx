import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { liveClassApi, recordedApi, assignmentApi, sessionApi } from '../../api';

type MainView = 'dashboard' | 'sessions' | 'settings';
type DashboardTab = 'live' | 'assignments' | 'recorded';

interface LiveClass {
  _id: string; classNumber: string; topic: string; meetingLink: string;
  scheduledAt: string; duration: number; status: string;
  attendance?: string | null;
}

interface Lecture {
  _id: string; title: string; description: string; videoUrl: string; videoType: string; order: number;
  isCompleted?: boolean; watchDuration?: number;
}

interface Assignment {
  _id: string; title: string; description: string; dueDate: string; attachmentUrl?: string;
}

interface Mentor { _id: string; name: string; username: string }
interface Booking {
  _id: string;
  mentor: Mentor;
  topic: string;
  dateTime: string;
  status: 'pending' | 'accepted' | 'completed' | 'cancelled';
  meetingLink?: string;
}

const VIDEO_TYPE_INFO: Record<string, { icon: string; label: string; color: string }> = {
  youtube:     { icon: '▶️', label: 'YouTube', color: '#ff4444' },
  drive:       { icon: '📁', label: 'Google Drive', color: '#22c55e' },
  google_meet: { icon: '🎥', label: 'Meet Recording', color: '#60a5fa' },
  other:       { icon: '🔗', label: 'Watch', color: '#6366f1' },
};

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([^&\s]+)/);
  return m ? m[1] : null;
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  // Navigation State
  const [view, setView] = useState<MainView>('dashboard');
  const [dashTab, setDashTab] = useState<DashboardTab>('live');

  // Data State
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [attendingId, setAttendingId] = useState<string | null>(null);
  const [expandedLecture, setExpandedLecture] = useState<string | null>(null);
  const [watchTime, setWatchTime] = useState<Record<string, number>>({});
  
  // Booking Form State
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingForm, setBookingForm] = useState({ mentor: '', topic: '', dateTime: '' });
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingError, setBookingError] = useState('');

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const courseId = (user?.enrolledCourse as { _id?: string } | undefined)?._id;

  const fetchData = useCallback(async () => {
    if (!courseId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [lc, lv, as, bs, ms] = await Promise.all([
        liveClassApi.getMine(),
        recordedApi.getMine(),
        assignmentApi.getMine(),
        sessionApi.getAll(),
        sessionApi.getMentors(),
      ]);
      setLiveClasses(lc.data.liveClasses);
      setLectures(lv.data.lectures);
      setAssignments(as.data.assignments);
      setBookings(bs.data.bookings);
      setMentors(ms.data.mentors);
      
      const wt: Record<string, number> = {};
      lv.data.lectures.forEach((l: Lecture) => { wt[l._id] = l.watchDuration || 0; });
      setWatchTime(wt);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Video Tracking Sync
  useEffect(() => {
    if (expandedLecture) {
      timerRef.current = setInterval(() => {
        setWatchTime(prev => {
          const current = (prev[expandedLecture] || 0) + 1;
          if (current % 10 === 0 || current === 600) {
            recordedApi.updateProgress(expandedLecture, { watchDuration: current, isCompleted: current >= 600 }).catch(console.error);
          }
          return { ...prev, [expandedLecture]: current };
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [expandedLecture]);

  const handleJoinMeet = async (cls: LiveClass) => {
    setAttendingId(cls._id);
    try {
      await liveClassApi.attend(cls._id);
      await fetchData();
      window.open(cls.meetingLink, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to join class');
    } finally {
      setAttendingId(null);
    }
  };

  const handleCreateBooking = async () => {
    if (!bookingForm.mentor || !bookingForm.topic || !bookingForm.dateTime) {
      setBookingError('Please fill all fields');
      return;
    }
    setBookingSaving(true); setBookingError('');
    try {
      await sessionApi.create(bookingForm);
      await fetchData();
      setShowBookingModal(false);
      setBookingForm({ mentor: '', topic: '', dateTime: '' });
    } catch (err: any) {
      setBookingError(err.response?.data?.message || 'Failed to book session');
    } finally {
      setBookingSaving(false);
    }
  };

  const handleCancelBooking = async (id: string) => {
    if (!confirm('Are you sure you want to cancel this session?')) return;
    try {
      await sessionApi.cancel(id);
      await fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to cancel session');
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const sidebarItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'sessions',  icon: '🤝', label: 'One-to-One' },
    { id: 'settings',  icon: '⚙️', label: 'Settings' },
  ];

  if (!courseId && !loading) {
     return (
       <div className="loading-center">
         <div className="card" style={{ maxWidth: '400px', textAlign: 'center' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>📚</div>
            <h3>Not Enrolled</h3>
            <p style={{ color: 'var(--text-muted)' }}>You haven't been enrolled in any course yet.</p>
            <button className="btn btn-secondary btn-sm" style={{ marginTop: '20px' }} onClick={handleLogout}>Sign Out</button>
         </div>
       </div>
     );
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* ── SIDEBAR (MENU BAR) ── */}
      <aside style={{ width: '280px', background: 'var(--bg-sidebar)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '32px 24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '40px', height: '40px', background: 'linear-gradient(135deg, var(--accent), #818cf8)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>🎓</div>
          <div>
            <div style={{ fontWeight: '800', fontSize: '18px', color: 'var(--text-primary)' }}>Brit Institute</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>LMS Student</div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '0 16px' }}>
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id as MainView)}
              style={{
                width: '100%', padding: '12px 16px', borderRadius: '12px', border: 'none', background: view === item.id ? 'rgba(99,102,241,0.1)' : 'transparent',
                display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '4px',
                color: view === item.id ? 'var(--accent)' : 'var(--text-secondary)', fontWeight: view === item.id ? '700' : '500',
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span>{item.label}</span>
              {view === item.id && <div style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: 'var(--accent)' }} />}
            </button>
          ))}
        </nav>

        <div style={{ padding: '24px', borderTop: '1px solid var(--border-subtle)' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <div style={{ width: '32px', height: '32px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px' }}>
                {user?.name?.charAt(0)}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Student Account</div>
              </div>
           </div>
           <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>🚪 Sign Out</button>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <main style={{ flex: 1, padding: '40px', maxWidth: '1200px', margin: '0 auto' }}>
        {loading ? (
          <div className="loading-center"><div className="spinner" /><span>Preparing your dashboard...</span></div>
        ) : (
          <div className="fade-in">
            
            {/* ───── DASHBOARD VIEW (LIVE, RECORDED, ASSIGNMENTS) ───── */}
            {view === 'dashboard' && (
              <>
                <div style={{ marginBottom: '32px' }}>
                  <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>Course Dashboard</h1>
                  <p style={{ color: 'var(--text-muted)' }}>Welcome back! You're currently studying <strong style={{ color: 'var(--accent)' }}>{(user?.enrolledCourse as { title: string })?.title}</strong></p>
                </div>

                <div className="tabs" style={{ marginBottom: '24px' }}>
                  {[
                    { key: 'live', icon: '🎥', label: 'Live Classes' },
                    { key: 'recorded', icon: '🎬', label: 'Recorded Lectures' },
                    { key: 'assignments', icon: '📝', label: 'Assignments' }
                  ].map(t => (
                    <button key={t.key} className={`tab-btn${dashTab === t.key ? ' active' : ''}`} onClick={() => setDashTab(t.key as DashboardTab)}>
                      {t.icon} {t.label}
                    </button>
                  ))}
                </div>

                {/* Dashboard Tabs Content */}
                {dashTab === 'live' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {liveClasses.length === 0 ? (
                       <div className="card"><div className="empty-state"><div className="empty-icon">🎥</div><p>No live classes scheduled for your course yet.</p></div></div>
                    ) : liveClasses.map(cls => (
                      <div key={cls._id} className="card" style={{ borderLeft: cls.status === 'live' ? '4px solid var(--danger)' : '1px solid var(--border-subtle)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <span className="badge badge-scheduled" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{cls.classNumber}</span>
                              {cls.status === 'live' && <span className="badge badge-live"><span className="live-dot" /> LIVE NOW</span>}
                              {cls.attendance === 'present' && <span className="badge badge-present">✅ Attended</span>}
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{cls.topic}</h3>
                            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📅 {new Date(cls.scheduledAt).toLocaleString()} &nbsp;•&nbsp; ⏱️ {cls.duration}m</p>
                          </div>
                          {cls.status !== 'ended' ? (
                             <button className="btn btn-zoom" style={{ background: 'var(--accent)' }} onClick={() => handleJoinMeet(cls)} disabled={!!attendingId}>
                               {attendingId === cls._id ? '⏳ Joining...' : '📹 Join Google Meet'}
                             </button>
                          ) : (
                            <div style={{ textAlign: 'center' }}>{cls.attendance === 'present' ? '✅' : '🔴'}<div style={{ fontSize: '10px' }}>{cls.attendance === 'present' ? 'Attended' : 'Missed'}</div></div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {dashTab === 'recorded' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {lectures.length === 0 ? (
                      <div className="card"><div className="empty-state"><div className="empty-icon">🎬</div><p>No recorded lectures yet.</p></div></div>
                    ) : lectures.map((l, idx) => {
                      const typeInfo = VIDEO_TYPE_INFO[l.videoType] || VIDEO_TYPE_INFO.other;
                      const ytId = l.videoType === 'youtube' ? getYouTubeId(l.videoUrl) : null;
                      const isExpanded = expandedLecture === l._id;
                      const currentDuration = watchTime[l._id] || 0;
                      const isCompleted = l.isCompleted || currentDuration >= 600;
                      return (
                        <div key={l._id} className="card" style={{ overflow: 'hidden', borderLeft: isCompleted ? '4px solid var(--success)' : '1px solid var(--border-subtle)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                             <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                <div style={{ width: '48px', height: '48px', background: `${typeInfo.color}15`, color: typeInfo.color, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>{isCompleted ? '✅' : typeInfo.icon}</div>
                                <div>
                                   <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '2px' }}>Lecture #{idx+1} • {typeInfo.label}</div>
                                   <h3 style={{ fontSize: '16px', fontWeight: '700' }}>{l.title}</h3>
                                   {!isCompleted && currentDuration > 0 && (
                                     <div style={{ marginTop: '8px', width: '160px', height: '4px', background: 'var(--bg-primary)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${(currentDuration/600)*100}%`, background: 'var(--accent)' }} />
                                     </div>
                                   )}
                                </div>
                             </div>
                             <button className="btn btn-secondary btn-sm" onClick={() => setExpandedLecture(isExpanded ? null : l._id)}>{isExpanded ? 'Collapse' : 'Watch'}</button>
                          </div>
                          {isExpanded && (
                            <div style={{ marginTop: '20px', borderRadius: '12px', overflow: 'hidden', background: '#000' }}>
                               {l.videoType === 'youtube' && ytId ? (
                                  <iframe className="video-embed" src={`https://www.youtube.com/embed/${ytId}?autoplay=1&modestbranding=1`} allowFullScreen />
                               ) : l.videoType === 'drive' ? (
                                  <iframe src={l.videoUrl.replace('/view', '/preview')} width="100%" height="450" frameBorder="0" allow="autoplay" />
                               ) : (
                                 <div style={{ padding: '40px', textAlign: 'center', color: '#fff' }}>Secure Link: <a href={l.videoUrl} target="_blank" style={{ color: 'var(--accent)' }}>Open Player</a></div>
                               )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {dashTab === 'assignments' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {assignments.length === 0 ? (
                       <div className="card"><div className="empty-state"><div className="empty-icon">📝</div><p>No assignments yet.</p></div></div>
                    ) : assignments.map(a => (
                      <div key={a._id} className="card">
                        <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>{a.title}</h3>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>{a.description}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>⏰ Due Date: <strong>{new Date(a.dueDate).toLocaleDateString()}</strong></span>
                          {a.attachmentUrl && <a href={a.attachmentUrl} target="_blank" className="btn btn-secondary btn-sm">📎 View Attachment</a>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ───── ONE-TO-ONE SESSIONS VIEW ───── */}
            {view === 'sessions' && (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '32px' }}>
                  <div>
                    <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px' }}>One-to-One Sessions</h1>
                    <p style={{ color: 'var(--text-muted)' }}>Book private mentoring sessions with our experts.</p>
                  </div>
                  <button className="btn btn-primary" onClick={() => { setBookingError(''); setShowBookingModal(true); }}>+ Book New Session</button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {bookings.length === 0 ? (
                    <div className="card">
                      <div className="empty-state" style={{ padding: '40px' }}>
                        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🤝</div>
                        <h3>No Sessions Scheduled</h3>
                        <p style={{ maxWidth: '300px', margin: '0 auto 20px' }}>Need help with something specific? Book a 1:1 session with a mentor!</p>
                        <button className="btn btn-primary btn-sm" onClick={() => setShowBookingModal(true)}>Book First Session</button>
                      </div>
                    </div>
                  ) : bookings.map(b => (
                    <div key={b._id} className="card" style={{ borderLeft: `4px solid ${b.status === 'accepted' ? 'var(--success)' : b.status === 'pending' ? 'var(--warning)' : 'var(--border-subtle)'}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                             <span className={`badge badge-${b.status}`} style={{ textTransform: 'capitalize' }}>{b.status}</span>
                             <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>#{b._id.slice(-6)}</span>
                          </div>
                          <h3 style={{ fontSize: '18px', fontWeight: '800', marginBottom: '4px' }}>{b.topic}</h3>
                          <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)' }}>
                             <span>👤 Mentor: <strong>{b.mentor.name}</strong></span>
                             <span>📅 {new Date(b.dateTime).toLocaleString()}</span>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '8px' }}>
                           {b.status === 'accepted' && b.meetingLink && (
                              <button className="btn btn-primary btn-sm" onClick={() => window.open(b.meetingLink, '_blank')}>📹 Join Session</button>
                           )}
                           {(b.status === 'pending' || b.status === 'accepted') && (
                              <button className="btn btn-danger btn-sm" onClick={() => handleCancelBooking(b._id)}>Cancel</button>
                           )}
                        </div>
                      </div>
                      {b.status === 'accepted' && !b.meetingLink && (
                        <div style={{ marginTop: '12px', background: 'rgba(52,211,153,0.1)', color: '#059669', padding: '10px', borderRadius: '8px', fontSize: '12px' }}>
                          🎉 Your session is confirmed! The mentor will add the meeting link shortly.
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* ───── SETTINGS VIEW ───── */}
            {view === 'settings' && (
               <div className="card" style={{ maxWidth: '600px' }}>
                 <h2 style={{ marginBottom: '24px' }}>Account Settings</h2>
                 <div className="form-group">
                   <label className="form-label">Full Name</label>
                   <input className="form-input" value={user?.name} disabled />
                 </div>
                 <div className="form-group">
                   <label className="form-label">Username</label>
                   <input className="form-input" value={user?.username} disabled />
                 </div>
                 <div className="alert alert-info">Profile editing is currently managed by the administrator. Contact support for changes.</div>
               </div>
            )}

          </div>
        )}
      </main>

      {/* ── BOOKING MODAL ── */}
      {showBookingModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowBookingModal(false); }}>
          <div className="modal" style={{ maxWidth: '480px' }}>
            <div className="modal-header">
              <h2>📅 Book 1:1 Session</h2>
              <button className="modal-close" onClick={() => setShowBookingModal(false)}>✕</button>
            </div>
            {bookingError && <div className="alert alert-error">⚠️ {bookingError}</div>}
            <div className="form-group">
              <label className="form-label">Select Mentor</label>
              <select className="form-select" value={bookingForm.mentor} onChange={e => setBookingForm(f => ({ ...f, mentor: e.target.value }))}>
                <option value="">— Pick your mentor —</option>
                {mentors.map(m => <option key={m._id} value={m._id}>{m.name} (@{m.username})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">What do you want to discuss?</label>
              <input className="form-input" placeholder="e.g. Doubts in Python Basics" value={bookingForm.topic} onChange={e => setBookingForm(f => ({ ...f, topic: e.target.value }))} />
            </div>
            <div className="form-group">
              <label className="form-label">Preferred Date & Time</label>
              <input type="datetime-local" className="form-input" value={bookingForm.dateTime} onChange={e => setBookingForm(f => ({ ...f, dateTime: e.target.value }))} />
            </div>
            <div className="modal-actions">
               <button className="btn btn-secondary" onClick={() => setShowBookingModal(false)}>Cancel</button>
               <button className="btn btn-primary" onClick={handleCreateBooking} disabled={bookingSaving}>
                 {bookingSaving ? 'Booking...' : 'Confirm Booking'}
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
