import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { liveClassApi, recordedApi, assignmentApi } from '../../api';

type Tab = 'live' | 'assignments' | 'recorded';

interface LiveClass {
  _id: string; classNumber: string; topic: string; zoomLink: string;
  scheduledAt: string; duration: number; status: string;
  attendance?: string | null;
}

interface Lecture {
  _id: string; title: string; description: string; videoUrl: string; videoType: string; order: number;
}

interface Assignment {
  _id: string; title: string; description: string; dueDate: string; attachmentUrl?: string;
}

const VIDEO_TYPE_INFO: Record<string, { icon: string; label: string; color: string }> = {
  youtube: { icon: '▶️', label: 'YouTube', color: '#ff4444' },
  drive:   { icon: '📁', label: 'Google Drive', color: '#22c55e' },
  zoom:    { icon: '🎥', label: 'Zoom Recording', color: '#60a5fa' },
  other:   { icon: '🔗', label: 'Watch', color: '#6366f1' },
};

function getYouTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=))([^&\s]+)/);
  return m ? m[1] : null;
}

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('live');
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [attendingId, setAttendingId] = useState<string | null>(null);
  const [expandedLecture, setExpandedLecture] = useState<string | null>(null);

  const courseId = (user?.enrolledCourse as { _id?: string } | undefined)?._id;

  const fetchData = useCallback(async () => {
    if (!courseId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [lc, lv, as] = await Promise.all([
        liveClassApi.getMine(),
        recordedApi.getMine(),
        assignmentApi.getMine(),
      ]);
      setLiveClasses(lc.data.liveClasses);
      setLectures(lv.data.lectures);
      setAssignments(as.data.assignments);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleJoinZoom = async (cls: LiveClass) => {
    setAttendingId(cls._id);
    try {
      await liveClassApi.attend(cls._id);
      await fetchData();
    } catch { /* class may be ended */ }
    // Open zoom link
    window.open(cls.zoomLink, '_blank', 'noopener,noreferrer');
    setAttendingId(null);
  };

  const handleLogout = () => { logout(); navigate('/login'); };

  const isOverdue = (d: string) => new Date(d) < new Date();

  const tabs: { key: Tab; icon: string; label: string }[] = [
    { key: 'live',        icon: '🎥', label: 'Live Classes' },
    { key: 'assignments', icon: '📝', label: 'Assignments' },
    { key: 'recorded',    icon: '🎬', label: 'Recorded Lectures' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)' }}>
      {/* Header */}
      <header style={{ background: 'var(--bg-sidebar)', borderBottom: '1px solid var(--border-subtle)', padding: '0 32px', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '64px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, var(--accent), #818cf8)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>
              🎓
            </div>
            <div>
              <div style={{ fontWeight: '700', fontSize: '15px' }}>Brit Institute</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {user?.enrolledCourse ? (user.enrolledCourse as { title: string }).title : 'No course enrolled'}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '14px', fontWeight: '600' }}>{user?.name}</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>@{user?.username}</div>
            </div>
            <button className="btn btn-secondary btn-sm" onClick={handleLogout}>🚪 Sign Out</button>
          </div>
        </div>
      </header>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px' }}>
        {!courseId ? (
          <div className="card">
            <div className="empty-state">
              <div className="empty-icon">📚</div>
              <p>You haven't been enrolled in any course yet. Please contact your administrator.</p>
            </div>
          </div>
        ) : (
          <>
            {/* Welcome */}
            <div style={{ marginBottom: '28px' }}>
              <h1 style={{ fontSize: '26px', fontWeight: '800', marginBottom: '6px', background: 'linear-gradient(135deg, #f1f5f9, var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                Hello, {user?.name?.split(' ')[0]}! 👋
              </h1>
              <p style={{ color: 'var(--text-muted)', fontSize: '14px' }}>
                You're enrolled in <strong style={{ color: 'var(--accent)' }}>{(user?.enrolledCourse as { title: string })?.title}</strong>
              </p>
            </div>

            {/* Tabs */}
            <div className="tabs">
              {tabs.map(t => (
                <button key={t.key} className={`tab-btn${tab === t.key ? ' active' : ''}`} onClick={() => setTab(t.key)}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>

            {/* Content */}
            {loading ? (
              <div className="loading-center"><div className="spinner" /><span>Loading...</span></div>
            ) : (
              <div className="fade-in">
                {/* ── LIVE CLASSES ── */}
                {tab === 'live' && (
                  <div>
                    {liveClasses.length === 0
                      ? <div className="card"><div className="empty-state"><div className="empty-icon">🎥</div><p>No live classes scheduled for your course yet.</p></div></div>
                      : <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {liveClasses.map(cls => {
                            const isPast = cls.status === 'ended';
                            const isLive = cls.status === 'live';
                            const attended = cls.attendance === 'present';
                            const absent = cls.attendance === 'absent';
                            return (
                              <div key={cls._id} className="card" style={{ borderColor: isLive ? 'var(--danger)' : isPast && absent ? 'rgba(239,68,68,0.3)' : attended ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', flexWrap: 'wrap' }}>
                                      <span style={{ background: 'var(--accent-light)', color: 'var(--accent)', padding: '3px 10px', borderRadius: '6px', fontSize: '13px', fontWeight: '700' }}>
                                        {cls.classNumber}
                                      </span>
                                      {isLive && <span className="badge badge-live"><span className="live-dot" />  LIVE NOW</span>}
                                      {cls.status === 'scheduled' && <span className="badge badge-scheduled">📅 Scheduled</span>}
                                      {isPast && attended && <span className="badge badge-present">✅ Attended</span>}
                                      {isPast && absent && <span className="badge badge-absent">🔴 Absent</span>}
                                    </div>
                                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '6px' }}>{cls.topic}</h3>
                                    <p style={{ color: 'var(--text-muted)', fontSize: '13px' }}>
                                      📅 {new Date(cls.scheduledAt).toLocaleString()} &nbsp;•&nbsp; ⏱️ {cls.duration} minutes
                                    </p>
                                  </div>
                                  <div>
                                    {!isPast ? (
                                      <button
                                        className="btn btn-zoom"
                                        onClick={() => handleJoinZoom(cls)}
                                        disabled={!!attendingId}
                                      >
                                        {attendingId === cls._id ? '⏳ Joining...' : '📹 Join on Zoom'}
                                      </button>
                                    ) : absent ? (
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '28px' }}>❌</div>
                                        <div style={{ fontSize: '12px', color: 'var(--danger)', marginTop: '4px' }}>Missed</div>
                                      </div>
                                    ) : (
                                      <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '28px' }}>✅</div>
                                        <div style={{ fontSize: '12px', color: 'var(--success)', marginTop: '4px' }}>Attended</div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                    }
                  </div>
                )}

                {/* ── ASSIGNMENTS ── */}
                {tab === 'assignments' && (
                  <div>
                    {assignments.length === 0
                      ? <div className="card"><div className="empty-state"><div className="empty-icon">📝</div><p>No assignments yet for your course.</p></div></div>
                      : <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {assignments.map(a => {
                            const overdue = isOverdue(a.dueDate);
                            return (
                              <div key={a._id} className="card" style={{ borderColor: overdue ? 'rgba(239,68,68,0.3)' : 'var(--border-subtle)' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                                      <span style={{ fontSize: '20px' }}>📝</span>
                                      {overdue
                                        ? <span className="badge badge-overdue">⏰ Overdue</span>
                                        : <span className="badge badge-scheduled">📅 Upcoming</span>}
                                    </div>
                                    <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>{a.title}</h3>
                                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.6', marginBottom: '10px' }}>{a.description}</p>
                                    <p style={{ fontSize: '13px', color: overdue ? 'var(--danger)' : 'var(--text-muted)' }}>
                                      📅 Due: <strong>{new Date(a.dueDate).toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                                    </p>
                                  </div>
                                  {a.attachmentUrl && (
                                    <a href={a.attachmentUrl} target="_blank" rel="noreferrer" className="btn btn-secondary">
                                      📎 View Attachment
                                    </a>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                    }
                  </div>
                )}

                {/* ── RECORDED LECTURES ── */}
                {tab === 'recorded' && (
                  <div>
                    {lectures.length === 0
                      ? <div className="card"><div className="empty-state"><div className="empty-icon">🎬</div><p>No recorded lectures available yet.</p></div></div>
                      : <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                          {lectures.map((l, idx) => {
                            const typeInfo = VIDEO_TYPE_INFO[l.videoType] || VIDEO_TYPE_INFO.other;
                            const ytId = l.videoType === 'youtube' ? getYouTubeId(l.videoUrl) : null;
                            const isExpanded = expandedLecture === l._id;
                            return (
                              <div key={l._id} className="card" style={{ overflow: 'hidden' }}>
                                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '16px', flex: 1 }}>
                                    <div style={{ width: '48px', height: '48px', background: `${typeInfo.color}20`, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                                      {typeInfo.icon}
                                    </div>
                                    <div>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>#{idx + 1}</span>
                                        <span className={`badge badge-${l.videoType}`}>{typeInfo.label}</span>
                                      </div>
                                      <h3 style={{ fontSize: '16px', fontWeight: '700', marginBottom: '4px' }}>{l.title}</h3>
                                      {l.description && <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{l.description}</p>}
                                    </div>
                                  </div>
                                  <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                                    {ytId && (
                                      <button className="btn btn-secondary btn-sm" onClick={() => setExpandedLecture(isExpanded ? null : l._id)}>
                                        {isExpanded ? '🔼 Collapse' : '▶️ Watch'}
                                      </button>
                                    )}
                                    <a href={l.videoUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
                                      {typeInfo.icon} Open
                                    </a>
                                  </div>
                                </div>
                                {isExpanded && ytId && (
                                  <div style={{ marginTop: '16px' }}>
                                    <iframe
                                      className="video-embed"
                                      src={`https://www.youtube.com/embed/${ytId}?autoplay=1`}
                                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                      allowFullScreen
                                      title={l.title}
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                    }
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
