import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { liveClassApi, recordedApi, assignmentApi, sessionApi, curriculumApi } from '../../api';

type MainView = 'dashboard' | 'curriculum' | 'sessions' | 'settings';
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
  submission?: {
    _id: string;
    driveLink?: string;
    fileLink?: string;
    repoLink?: string;
    notes?: string;
    status: 'submitted' | 'late';
    submittedAt: string;
  } | null;
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

interface CurriculumTopic {
  _id: string;
  title: string;
  duration: number;
  scheduledAt?: string;
  meetingLink?: string;
}

interface CurriculumModule {
  _id: string;
  title: string;
  topics: CurriculumTopic[];
}

interface Curriculum {
  _id: string;
  title: string;
  modules: CurriculumModule[];
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
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
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
  const [submissionModal, setSubmissionModal] = useState<Assignment | null>(null);
  const [submissionSaving, setSubmissionSaving] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [submissionForm, setSubmissionForm] = useState({ driveLink: '', fileLink: '', repoLink: '', notes: '' });

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const courseId = (user?.enrolledCourse as { _id?: string } | undefined)?._id;

  const fetchData = useCallback(async () => {
    if (!courseId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [lc, lv, as, bs, ms, curr] = await Promise.all([
        liveClassApi.getMine(),
        recordedApi.getMine(),
        assignmentApi.getMine(),
        sessionApi.getAll(),
        sessionApi.getMentors(),
        curriculumApi.getMine().catch(() => ({ data: { curriculum: null } })),
      ]);
      setLiveClasses(lc.data.liveClasses);
      setLectures(lv.data.lectures);
      setAssignments(as.data.assignments);
      setBookings(bs.data.bookings);
      setMentors(ms.data.mentors);
      setCurriculum(curr.data.curriculum);
      
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

  const openSubmissionModal = (assignment: Assignment) => {
    setSubmissionModal(assignment);
    setSubmissionError('');
    setSubmissionForm({
      driveLink: assignment.submission?.driveLink || '',
      fileLink: assignment.submission?.fileLink || '',
      repoLink: assignment.submission?.repoLink || '',
      notes: assignment.submission?.notes || '',
    });
  };

  const handleSubmitAssignment = async () => {
    if (!submissionModal) return;
    if (!submissionForm.driveLink && !submissionForm.fileLink && !submissionForm.repoLink && !submissionForm.notes) {
      setSubmissionError('Add at least one link or note before submitting.');
      return;
    }
    setSubmissionSaving(true);
    setSubmissionError('');
    try {
      await assignmentApi.submit(submissionModal._id, submissionForm);
      await fetchData();
      setSubmissionModal(null);
    } catch (err: any) {
      setSubmissionError(err.response?.data?.message || 'Failed to submit assignment');
    } finally {
      setSubmissionSaving(false);
    }
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const now = new Date();
  const upcomingClasses = liveClasses
    .filter((cls) => new Date(cls.scheduledAt) >= now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);
  const attendedClasses = liveClasses
    .filter((cls) => new Date(cls.scheduledAt) < now && cls.attendance === 'present')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 5);
  const missedClasses = liveClasses
    .filter((cls) => new Date(cls.scheduledAt) < now && cls.attendance !== 'present')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 5);

  const sidebarItems = [
    { id: 'dashboard', icon: '🏠', label: 'Dashboard' },
    { id: 'curriculum', icon: '📚', label: 'Curriculum' },
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
      <aside style={{ width: '284px', background: 'linear-gradient(180deg, #f8fbff, #f2f7fd)', borderRight: '1px solid var(--border-subtle)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        <div style={{ padding: '28px 22px 18px' }}>
          <div className="soft-panel" style={{ padding: '16px', background: 'linear-gradient(135deg, rgba(29,155,240,0.12), rgba(58,183,255,0.04))' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '44px', height: '44px', background: 'linear-gradient(135deg, var(--accent), #3ab7ff)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', boxShadow: '0 10px 24px rgba(29,155,240,0.22)' }}>🎓</div>
              <div>
                <div style={{ fontWeight: '800', fontSize: '18px', color: 'var(--text-primary)' }}>Brit Institute</div>
                <div style={{ fontSize: '11px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Student Workspace</div>
              </div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '6px 14px' }}>
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id as MainView)}
              style={{
                width: '100%', padding: '13px 16px', borderRadius: '12px', border: '1px solid transparent', background: view === item.id ? 'linear-gradient(135deg, rgba(29,155,240,0.16), rgba(58,183,255,0.08))' : 'transparent',
                display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', transition: 'all 0.2s ease', marginBottom: '6px',
                color: view === item.id ? 'var(--text-primary)' : 'var(--text-secondary)', fontWeight: view === item.id ? '700' : '500',
                boxShadow: view === item.id ? '0 10px 24px rgba(15,23,42,0.08)' : 'none',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '18px' }}>{item.icon}</span>
              <span>{item.label}</span>
              {view === item.id && <div style={{ marginLeft: 'auto', width: '8px', height: '8px', borderRadius: '50%', background: 'var(--accent)' }} />}
            </button>
          ))}
        </nav>

        <div style={{ padding: '24px', borderTop: '1px solid var(--border-subtle)' }}>
           <div className="soft-panel" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '14px' }}>
              <div style={{ width: '32px', height: '32px', background: 'var(--accent-light)', color: 'var(--accent)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: '800', fontSize: '14px' }}>
                {user?.name?.charAt(0)}
              </div>
              <div style={{ overflow: 'hidden' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Student Account</div>
              </div>
           </div>
           <button className="btn btn-secondary btn-sm" style={{ width: '100%', justifyContent: 'center' }} onClick={handleLogout}>🚪 Sign Out</button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '36px 40px', maxWidth: '1280px', margin: '0 auto' }}>
        {loading ? (
          <div className="loading-center"><div className="spinner" /><span>Preparing your dashboard...</span></div>
        ) : (
          <div className="fade-in">
            {view === 'dashboard' && (
              <>
                <div className="card surface-hero" style={{ padding: '28px', marginBottom: '24px' }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Learning Dashboard</div>
                    <h1 style={{ fontSize: '30px', fontWeight: '800', marginBottom: '8px' }}>Course progress at a glance</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Welcome back. You are currently enrolled in <strong style={{ color: 'var(--text-primary)' }}>{(user?.enrolledCourse as { title: string })?.title}</strong>.</p>
                  </div>
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
                    <div className="metric-grid">
                      <div className="metric-card">
                        <div className="metric-label">Upcoming</div>
                        <div className="metric-value" style={{ color: 'var(--info)' }}>{upcomingClasses.length}</div>
                        <div className="metric-help">Next scheduled classes</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-label">Attended</div>
                        <div className="metric-value" style={{ color: 'var(--success)' }}>{attendedClasses.length}</div>
                        <div className="metric-help">Recent completed classes</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-label">Missed</div>
                        <div className="metric-value" style={{ color: 'var(--danger)' }}>{missedClasses.length}</div>
                        <div className="metric-help">Classes needing follow-up</div>
                      </div>
                    </div>

                    {liveClasses.length === 0 ? (
                      <div className="card"><div className="empty-state"><div className="empty-icon">🎥</div><p>No live classes scheduled for your course yet.</p></div></div>
                    ) : (
                      <>
                        <div className="card section-shell">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Upcoming Classes</h3>
                            <span className="badge badge-scheduled">Next 5</span>
                          </div>
                          {upcomingClasses.length === 0 ? (
                            <div className="empty-state" style={{ padding: '20px' }}>
                              <div className="empty-icon">📅</div>
                              <p>No upcoming classes scheduled.</p>
                            </div>
                          ) : upcomingClasses.map(cls => (
                            <div key={cls._id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span className="badge badge-scheduled" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{cls.classNumber}</span>
                                    <span className="badge badge-scheduled">Upcoming</span>
                                  </div>
                                  <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{cls.topic}</h3>
                                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📅 {new Date(cls.scheduledAt).toLocaleString()} &nbsp;•&nbsp; ⏱️ {cls.duration}m</p>
                                </div>
                                <button className="btn btn-zoom" style={{ background: 'var(--accent)' }} onClick={() => handleJoinMeet(cls)} disabled={!!attendingId}>
                                  {attendingId === cls._id ? '⏳ Joining...' : '📹 Join Google Meet'}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="card section-shell">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Attended Classes</h3>
                            <span className="badge badge-present">Last 5</span>
                          </div>
                          {attendedClasses.length === 0 ? (
                            <div className="empty-state" style={{ padding: '20px' }}>
                              <div className="empty-icon">✅</div>
                              <p>No attended classes yet.</p>
                            </div>
                          ) : attendedClasses.map(cls => (
                            <div key={cls._id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span className="badge badge-scheduled" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{cls.classNumber}</span>
                                    <span className="badge badge-present">✅ Attended</span>
                                  </div>
                                  <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{cls.topic}</h3>
                                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📅 {new Date(cls.scheduledAt).toLocaleString()} &nbsp;•&nbsp; ⏱️ {cls.duration}m</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  ✅
                                  <div style={{ fontSize: '10px' }}>Attended</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="card section-shell">
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                            <h3 style={{ fontSize: '18px', fontWeight: '700' }}>Missed Classes</h3>
                            <span className="badge badge-absent">Last 5</span>
                          </div>
                          {missedClasses.length === 0 ? (
                            <div className="empty-state" style={{ padding: '20px' }}>
                              <div className="empty-icon">🎯</div>
                              <p>No missed classes. Great work.</p>
                            </div>
                          ) : missedClasses.map(cls => (
                            <div key={cls._id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <span className="badge badge-scheduled" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{cls.classNumber}</span>
                                    <span className="badge badge-absent">🔴 Missed</span>
                                  </div>
                                  <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '4px' }}>{cls.topic}</h3>
                                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>📅 {new Date(cls.scheduledAt).toLocaleString()} &nbsp;•&nbsp; ⏱️ {cls.duration}m</p>
                                </div>
                                <div style={{ textAlign: 'center' }}>
                                  🔴
                                  <div style={{ fontSize: '10px' }}>Missed</div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
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
                    ) : assignments.map(a => {
                      const overdue = new Date(a.dueDate) < new Date();
                      return (
                        <div key={a._id} className="card section-shell">
                          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', marginBottom: '12px' }}>
                            <div>
                              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
                                {a.submission ? (
                                  <span className={`badge ${a.submission.status === 'late' ? 'badge-overdue' : 'badge-present'}`}>
                                    {a.submission.status === 'late' ? 'Submitted Late' : 'Submitted'}
                                  </span>
                                ) : overdue ? (
                                  <span className="badge badge-overdue">Overdue</span>
                                ) : (
                                  <span className="badge badge-scheduled">Pending</span>
                                )}
                              </div>
                              <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>{a.title}</h3>
                            </div>
                            <button className="btn btn-primary btn-sm" onClick={() => openSubmissionModal(a)}>
                              {a.submission ? 'Update Submission' : 'Submit Work'}
                            </button>
                          </div>
                          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '16px' }}>{a.description}</p>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                            <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Due Date: <strong>{new Date(a.dueDate).toLocaleDateString()}</strong></span>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {a.attachmentUrl && <a href={a.attachmentUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">View Attachment</a>}
                              {a.submission?.driveLink && <a href={a.submission.driveLink} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Your Drive Link</a>}
                            </div>
                          </div>
                          {a.submission && (
                            <div className="soft-panel" style={{ padding: '12px', marginTop: '14px' }}>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '4px' }}>
                                Last submitted: {new Date(a.submission.submittedAt).toLocaleString()}
                              </div>
                              {a.submission.notes && <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>{a.submission.notes}</div>}
                            </div>
                          )}
                        </div>
                      );
                    })}
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

            {view === 'curriculum' && (
              <>
                <div className="card surface-hero" style={{ padding: '28px', marginBottom: '24px' }}>
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>Curriculum</div>
                    <h1 style={{ fontSize: '30px', fontWeight: '800', marginBottom: '8px' }}>Your batch learning roadmap</h1>
                    <p style={{ color: 'var(--text-secondary)' }}>Track your modules, class schedule, and Google Meet readiness in one place.</p>
                  </div>
                </div>

                {!curriculum || curriculum.modules.length === 0 ? (
                  <div className="card"><div className="empty-state"><div className="empty-icon">📚</div><p>No curriculum is available for your batch yet.</p></div></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    <div className="metric-grid">
                      <div className="metric-card">
                        <div className="metric-label">Modules</div>
                        <div className="metric-value">{curriculum.modules.length}</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-label">Classes</div>
                        <div className="metric-value">{curriculum.modules.reduce((sum, module) => sum + module.topics.length, 0)}</div>
                      </div>
                      <div className="metric-card">
                        <div className="metric-label">Scheduled</div>
                        <div className="metric-value">{curriculum.modules.reduce((sum, module) => sum + module.topics.filter((topic) => !!topic.scheduledAt).length, 0)}</div>
                      </div>
                    </div>

                    {curriculum.modules.map((module, moduleIndex) => (
                      <div key={module._id || moduleIndex} className="card section-shell" style={{ padding: '22px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                          <h3 style={{ fontSize: '18px', fontWeight: '800', color: 'var(--accent)' }}>{module.title}</h3>
                          <span className="badge badge-scheduled">{module.topics.length} classes</span>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {module.topics.map((topic, topicIndex) => (
                            <div key={topic._id || topicIndex} style={{ background: 'linear-gradient(180deg, rgba(255,255,255,0.02), transparent)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px' }}>
                              <div>
                                <div style={{ fontSize: '15px', fontWeight: '700', marginBottom: '4px' }}>{topic.title}</div>
                                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                                  {topic.scheduledAt ? `📅 ${new Date(topic.scheduledAt).toLocaleString()}` : 'Schedule will be updated by your teacher'}
                                </div>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                <span className="badge badge-scheduled">{topic.duration} mins</span>
                                {topic.meetingLink ? <span className="badge badge-present">Meet Ready</span> : <span className="badge badge-ended">Meet Pending</span>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                 <div className="alert alert-info">Profile editing is currently managed by your teacher or super admin. Contact support for changes.</div>
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

      {submissionModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setSubmissionModal(null); }}>
          <div className="modal" style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <div>
                <h2>{submissionModal.submission ? 'Update Assignment Submission' : 'Submit Assignment'}</h2>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>{submissionModal.title}</p>
              </div>
              <button className="modal-close" onClick={() => setSubmissionModal(null)}>X</button>
            </div>

            {submissionError && <div className="alert alert-error">{submissionError}</div>}

            <div className="form-group">
              <label className="form-label">Google Drive Link</label>
              <input
                className="form-input"
                placeholder="https://drive.google.com/..."
                value={submissionForm.driveLink}
                onChange={e => setSubmissionForm(f => ({ ...f, driveLink: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">File Link</label>
              <input
                className="form-input"
                placeholder="PDF, Docs, OneDrive, Dropbox, etc."
                value={submissionForm.fileLink}
                onChange={e => setSubmissionForm(f => ({ ...f, fileLink: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Repository / Project Link</label>
              <input
                className="form-input"
                placeholder="GitHub, GitLab, deployed project link..."
                value={submissionForm.repoLink}
                onChange={e => setSubmissionForm(f => ({ ...f, repoLink: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Notes for Teacher</label>
              <textarea
                className="form-textarea"
                rows={4}
                placeholder="Explain what you submitted, blockers, or anything your teacher should review..."
                value={submissionForm.notes}
                onChange={e => setSubmissionForm(f => ({ ...f, notes: e.target.value }))}
              />
            </div>

            <div className="alert alert-info">
              Submitting after the due date will automatically be marked as late. You can update your submission later.
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setSubmissionModal(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSubmitAssignment} disabled={submissionSaving}>
                {submissionSaving ? 'Submitting...' : (submissionModal.submission ? 'Update Submission' : 'Submit Assignment')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
