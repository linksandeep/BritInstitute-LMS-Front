import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { liveClassApi, recordedApi, assignmentApi, sessionApi, curriculumApi, studentPortalApi } from '../../api';
import BrandLogo from '../../components/BrandLogo';
import RecordedLecturePlayer from '../../components/RecordedLecturePlayer';
import ChangePasswordForm from '../../components/ChangePasswordForm';

type MainView = 'dashboard' | 'curriculum' | 'sessions' | 'performance' | 'certificates' | 'assistant' | 'settings';
type DashboardTab = 'live' | 'assignments' | 'recorded';

interface LiveClass {
  _id: string; classNumber: string; topic: string; meetingLink: string;
  scheduledAt: string; duration: number; status: string;
  attendance?: string | null;
}

interface Lecture {
  _id: string; title: string; description: string; videoUrl: string; videoType: string; order: number;
  recordingSource?: string; recordingStatus?: string;
  isPlayable?: boolean;
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

interface MentorSlot {
  dateTime: string;
  label: string;
  status: 'available' | 'booked' | 'past';
  bookingId?: string;
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

interface StudentPortalSummary {
  metrics: {
    learningProgress: number;
    attendanceRate: number;
    recordingCompletion: number;
    assignmentCompletion: number;
    totalLiveClasses: number;
    ongoingClasses: number;
    upcomingClasses: number;
    attendedClasses: number;
    missedClasses: number;
    finishedClasses: number;
    totalLectures: number;
    completedLectures: number;
    totalAssignments: number;
    submittedAssignments: number;
    pendingAssignments: number;
    curriculumTopics: number;
    scheduledTopics: number;
    mentoringSessions: number;
  };
  announcements: string[];
  recommendations: { title: string; action: string }[];
  certificate: {
    status: 'eligible' | 'locked';
    isEligible: boolean;
    requirements: { label: string; value: number; target: number; passed: boolean }[];
    request?: { id: string; status: 'pending' | 'approved' | 'rejected' | 'issued'; requestedAt: string } | null;
  };
}

interface StudyPlan {
  prompt: string;
  response: string;
  steps: string[];
}

const VIDEO_TYPE_INFO: Record<string, { icon: string; label: string; color: string }> = {
  youtube:     { icon: 'YT', label: 'YouTube', color: '#dc2626' },
  drive:       { icon: 'DR', label: 'Google Drive', color: '#059669' },
  google_meet: { icon: 'MR', label: 'Meet Recording', color: '#2563eb' },
  zoom:        { icon: 'CR', label: 'Class Recording', color: '#2457d3' },
  other:       { icon: 'LN', label: 'External Link', color: '#7c3aed' },
};

const formatDateTime = (value: string) =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const formatShortDate = (value: string) =>
  new Date(value).toLocaleDateString([], {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

const toDateInputValue = (value?: string | Date) => {
  const date = value ? new Date(value) : new Date();
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60 * 1000);
  return local.toISOString().slice(0, 10);
};

const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

export default function StudentDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [view, setView] = useState<MainView>('dashboard');
  const [dashTab, setDashTab] = useState<DashboardTab>('live');

  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [curriculum, setCurriculum] = useState<Curriculum | null>(null);
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [portalSummary, setPortalSummary] = useState<StudentPortalSummary | null>(null);
  const [portalError, setPortalError] = useState('');

  const [loading, setLoading] = useState(true);
  const [attendingId, setAttendingId] = useState<string | null>(null);
  const [expandedLecture, setExpandedLecture] = useState<string | null>(null);
  const [watchTime, setWatchTime] = useState<Record<string, number>>({});

  const [showBookingModal, setShowBookingModal] = useState(false);
  const [reschedulingBooking, setReschedulingBooking] = useState<Booking | null>(null);
  const [bookingForm, setBookingForm] = useState({ mentor: '', topic: '', date: toDateInputValue(), dateTime: '' });
  const [mentorSlots, setMentorSlots] = useState<MentorSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [bookingSaving, setBookingSaving] = useState(false);
  const [bookingError, setBookingError] = useState('');
  const [submissionModal, setSubmissionModal] = useState<Assignment | null>(null);
  const [submissionSaving, setSubmissionSaving] = useState(false);
  const [submissionError, setSubmissionError] = useState('');
  const [submissionForm, setSubmissionForm] = useState({ driveLink: '', fileLink: '', repoLink: '', notes: '' });
  const [assistantDraft, setAssistantDraft] = useState('');
  const [assistantAnswer, setAssistantAnswer] = useState<StudyPlan | null>(null);
  const [assistantLoading, setAssistantLoading] = useState(false);
  const [assistantError, setAssistantError] = useState('');
  const [certificateRequesting, setCertificateRequesting] = useState(false);
  const [certificateMessage, setCertificateMessage] = useState('');

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const courseId = (user?.enrolledCourse as { _id?: string } | undefined)?._id;
  const courseTitle = (user?.enrolledCourse as { title?: string } | undefined)?.title || 'Your programme';

  const fetchData = useCallback(async () => {
    if (!courseId) { setLoading(false); return; }
    setLoading(true);
    try {
      const [lc, lv, as, bs, ms, curr, summary] = await Promise.all([
        liveClassApi.getMine(),
        recordedApi.getMine(),
        assignmentApi.getMine(),
        sessionApi.getAll(),
        sessionApi.getMentors(),
        curriculumApi.getMine().catch(() => ({ data: { curriculum: null } })),
        studentPortalApi.getSummary().catch(() => ({ data: { summary: null } })),
      ]);
      setLiveClasses(lc.data.liveClasses);
      setLectures(lv.data.lectures);
      setAssignments(as.data.assignments);
      setBookings(bs.data.bookings);
      setMentors(ms.data.mentors);
      setCurriculum(curr.data.curriculum);
      setPortalSummary(summary.data.summary);
      setPortalError(summary.data.summary ? '' : 'Some student insight widgets could not load from the backend.');

      const wt: Record<string, number> = {};
      lv.data.lectures.forEach((l: Lecture) => { wt[l._id] = l.watchDuration || 0; });
      setWatchTime(wt);
    } catch (err) {
      console.error(err);
    } finally { setLoading(false); }
  }, [courseId]);

  useEffect(() => { fetchData(); }, [fetchData]);

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
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [expandedLecture]);

  useEffect(() => {
    if (!showBookingModal || !bookingForm.mentor || !bookingForm.date) {
      setMentorSlots([]);
      return;
    }

    let ignore = false;
    setSlotsLoading(true);
    setBookingError('');

    sessionApi.getAvailability(bookingForm.mentor, bookingForm.date)
      .then((res) => {
        if (!ignore) setMentorSlots(res.data.slots || []);
      })
      .catch((err: any) => {
        if (!ignore) {
          setMentorSlots([]);
          setBookingError(err.response?.data?.message || 'Unable to load available slots.');
        }
      })
      .finally(() => {
        if (!ignore) setSlotsLoading(false);
      });

    return () => { ignore = true; };
  }, [bookingForm.date, bookingForm.mentor, showBookingModal]);

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

  const closeBookingModal = () => {
    setShowBookingModal(false);
    setReschedulingBooking(null);
    setBookingError('');
    setMentorSlots([]);
    setBookingForm({ mentor: '', topic: '', date: toDateInputValue(), dateTime: '' });
  };

  const openBookingModal = (booking?: Booking) => {
    setBookingError('');
    setMentorSlots([]);
    setReschedulingBooking(booking || null);
    setBookingForm({
      mentor: booking?.mentor?._id || '',
      topic: booking?.topic || '',
      date: toDateInputValue(booking?.dateTime),
      dateTime: booking?.dateTime || '',
    });
    setShowBookingModal(true);
  };

  const handleBookingFieldChange = (field: 'mentor' | 'topic' | 'date', value: string) => {
    setBookingError('');
    setBookingForm(prev => ({
      ...prev,
      [field]: value,
      dateTime: field === 'topic' ? prev.dateTime : '',
    }));
  };

  const handleCreateBooking = async () => {
    if (!bookingForm.mentor || !bookingForm.topic || !bookingForm.dateTime) {
      setBookingError('Please choose a mentor, topic, date, and available time slot.');
      return;
    }
    setBookingSaving(true); setBookingError('');
    try {
      const payload = {
        mentor: bookingForm.mentor,
        topic: bookingForm.topic,
        dateTime: bookingForm.dateTime,
        duration: 30,
      };

      if (reschedulingBooking) {
        await sessionApi.reschedule(reschedulingBooking._id, payload);
      } else {
        await sessionApi.create(payload);
      }

      await fetchData();
      closeBookingModal();
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
  const getClassEndAt = (cls: LiveClass) => new Date(new Date(cls.scheduledAt).getTime() + cls.duration * 60 * 1000);
  const isClassOngoing = (cls: LiveClass) => {
    const scheduledAt = new Date(cls.scheduledAt);
    return cls.status !== 'ended' && (cls.status === 'live' || (scheduledAt <= now && getClassEndAt(cls) >= now));
  };
  const isClassFinished = (cls: LiveClass) => cls.status === 'ended' || (cls.status !== 'live' && getClassEndAt(cls) < now);

  const ongoingClasses = liveClasses
    .filter(isClassOngoing)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
  const upcomingClasses = liveClasses
    .filter((cls) => cls.status !== 'ended' && new Date(cls.scheduledAt) > now)
    .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
    .slice(0, 5);
  const attendedClasses = liveClasses
    .filter((cls) => isClassFinished(cls) && cls.attendance === 'present')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 5);
  const missedClasses = liveClasses
    .filter((cls) => isClassFinished(cls) && cls.attendance !== 'present')
    .sort((a, b) => new Date(b.scheduledAt).getTime() - new Date(a.scheduledAt).getTime())
    .slice(0, 5);

  const localFinishedClassCount = attendedClasses.length + missedClasses.length;
  const localAttendanceRate = localFinishedClassCount ? Math.round((attendedClasses.length / localFinishedClassCount) * 100) : 0;
  const localSubmittedAssignments = assignments.filter(a => !!a.submission).length;
  const localPendingAssignments = assignments.length - localSubmittedAssignments;
  const localCompletedLectures = lectures.filter(l => l.isCompleted || (watchTime[l._id] || 0) >= 600).length;
  const localCurriculumTopics = curriculum?.modules.reduce((sum, module) => sum + module.topics.length, 0) || 0;
  const localScheduledTopics = curriculum?.modules.reduce((sum, module) => sum + module.topics.filter(topic => !!topic.scheduledAt).length, 0) || 0;
  const totalTrackedItems = Math.max(1, liveClasses.length + lectures.length + assignments.length);
  const localLearningProgress = clampPercent(Math.round(((attendedClasses.length + localCompletedLectures + localSubmittedAssignments) / totalTrackedItems) * 100));
  const metrics = portalSummary?.metrics;
  const finishedClassCount = metrics?.finishedClasses ?? localFinishedClassCount;
  const attendanceRate = metrics?.attendanceRate ?? localAttendanceRate;
  const submittedAssignments = metrics?.submittedAssignments ?? localSubmittedAssignments;
  const pendingAssignments = metrics?.pendingAssignments ?? localPendingAssignments;
  const completedLectures = metrics?.completedLectures ?? localCompletedLectures;
  const curriculumTopics = metrics?.curriculumTopics ?? localCurriculumTopics;
  const scheduledTopics = metrics?.scheduledTopics ?? localScheduledTopics;
  const learningProgress = metrics?.learningProgress ?? localLearningProgress;
  const recordingCompletion = metrics?.recordingCompletion ?? (lectures.length ? Math.round((completedLectures / lectures.length) * 100) : 0);
  const assignmentCompletion = metrics?.assignmentCompletion ?? (assignments.length ? Math.round((submittedAssignments / assignments.length) * 100) : 0);
  const totalLectures = metrics?.totalLectures ?? lectures.length;
  const totalAssignments = metrics?.totalAssignments ?? assignments.length;
  const mentoringSessions = metrics?.mentoringSessions ?? bookings.length;
  const nextClass = ongoingClasses[0] || upcomingClasses[0] || null;
  const certificateReady = portalSummary?.certificate.isEligible ?? (learningProgress >= 80 && attendanceRate >= 70);
  const certificateRequest = portalSummary?.certificate.request || null;

  const sidebarItems: { id: MainView; code: string; label: string }[] = [
    { id: 'dashboard', code: 'DB', label: 'Dashboard' },
    { id: 'curriculum', code: 'RD', label: 'Roadmap' },
    { id: 'sessions', code: 'MT', label: 'Mentoring' },
    { id: 'performance', code: 'AN', label: 'Analytics' },
    { id: 'certificates', code: 'CF', label: 'Certificates' },
    { id: 'assistant', code: 'AI', label: 'Study Assistant' },
    { id: 'settings', code: 'ST', label: 'Settings' },
  ];

  const fallbackAnnouncements = [
    pendingAssignments > 0
      ? `${pendingAssignments} assignment${pendingAssignments === 1 ? '' : 's'} waiting for submission.`
      : 'All visible assignments are submitted.',
    nextClass
      ? `Next class: ${nextClass.topic} at ${formatDateTime(nextClass.scheduledAt)}.`
      : 'Your next class schedule will appear here once published.',
    totalLectures > 0
      ? `${totalLectures} class recording${totalLectures === 1 ? '' : 's'} available for revision.`
      : 'Class recordings will unlock after completed sessions.',
  ];
  const announcements = portalSummary?.announcements?.length ? portalSummary.announcements : fallbackAnnouncements;
  const recommendations = portalSummary?.recommendations?.length
    ? portalSummary.recommendations
    : [
      { title: 'Revision', action: totalLectures > completedLectures ? 'Continue recorded lectures' : 'Keep notes warm' },
      { title: 'Practice', action: pendingAssignments > 0 ? 'Submit pending assignment work' : 'Prepare portfolio evidence' },
      { title: 'Mentoring', action: mentoringSessions > 0 ? 'Review mentor feedback' : 'Book a doubt clearing session' },
      { title: 'Class readiness', action: nextClass ? `Prepare for ${nextClass.classNumber}` : 'Watch for the next schedule' },
    ];
  const selectedSlot = mentorSlots.find(slot => slot.dateTime === bookingForm.dateTime);

  const requestStudyPlan = async (prompt: string) => {
    const cleanPrompt = prompt.trim();
    if (!cleanPrompt) {
      setAssistantError('Please enter a study goal or choose a prompt.');
      return;
    }
    setAssistantLoading(true);
    setAssistantError('');
    try {
      const res = await studentPortalApi.createStudyPlan({ prompt: cleanPrompt });
      setAssistantAnswer(res.data.plan);
    } catch (err: any) {
      setAssistantError(err.response?.data?.message || 'Unable to generate study plan. Please try again.');
    } finally {
      setAssistantLoading(false);
    }
  };

  const handleAssistantPrompt = async (prompt: string) => {
    setAssistantDraft(prompt);
    await requestStudyPlan(prompt);
  };

  const handleAssistantSubmit = async () => {
    await requestStudyPlan(assistantDraft);
  };

  const handleCertificateRequest = async () => {
    setCertificateRequesting(true);
    setCertificateMessage('');
    try {
      const res = await studentPortalApi.requestCertificate();
      setCertificateMessage(res.data.message || 'Certificate request submitted for review.');
      await fetchData();
    } catch (err: any) {
      setCertificateMessage(err.response?.data?.message || 'Unable to request certificate. Please try again.');
    } finally {
      setCertificateRequesting(false);
    }
  };

  if (!courseId && !loading) {
    return (
      <div className="student-shell student-shell-standalone">
        <section className="student-empty-card">
          <div className="student-empty-mark">NE</div>
          <h2>Not Enrolled</h2>
          <p>You have not been enrolled in a course yet. Contact your institute team to activate your workspace.</p>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Sign Out</button>
        </section>
      </div>
    );
  }

  const renderClassRow = (cls: LiveClass, state: 'live' | 'upcoming' | 'attended' | 'missed') => {
    const statusLabel = state === 'live' ? 'Going on' : state === 'upcoming' ? 'Upcoming' : state === 'attended' ? 'Attended' : 'Missed';
    const canJoin = state === 'live' || state === 'upcoming';

    return (
      <article key={cls._id} className={`student-schedule-row ${state}`}>
        <div className="student-schedule-date">
          <span>{new Date(cls.scheduledAt).toLocaleDateString([], { month: 'short' })}</span>
          <strong>{new Date(cls.scheduledAt).toLocaleDateString([], { day: '2-digit' })}</strong>
        </div>
        <div className="student-schedule-body">
          <div className="student-row-meta">
            <span className="student-pill primary">{cls.classNumber}</span>
            <span className={`student-pill ${state}`}>{statusLabel}</span>
            {cls.attendance === 'present' && <span className="student-pill success">Attendance marked</span>}
          </div>
          <h3>{cls.topic}</h3>
          <p>
            {state === 'live'
              ? `Started ${formatDateTime(cls.scheduledAt)} • Live until teacher ends the session`
              : `${formatDateTime(cls.scheduledAt)} • ${cls.duration} minutes`}
          </p>
        </div>
        {canJoin ? (
          <button className="btn btn-primary btn-sm student-action-btn" onClick={() => handleJoinMeet(cls)} disabled={!!attendingId}>
            {attendingId === cls._id ? 'Joining...' : state === 'live' ? 'Rejoin Class' : 'Join Class'}
          </button>
        ) : (
          <span className={`student-status-chip ${state === 'attended' ? 'success' : 'danger'}`}>
            {state === 'attended' ? 'Present' : 'Absent'}
          </span>
        )}
      </article>
    );
  };

  const renderLiveClasses = () => (
    <div className="student-stack">
      <div className="student-kpi-grid">
        <div className="student-kpi-card urgent">
          <span>Going on</span>
          <strong>{ongoingClasses.length}</strong>
          <small>Classes currently live</small>
        </div>
        <div className="student-kpi-card">
          <span>Upcoming</span>
          <strong>{upcomingClasses.length}</strong>
          <small>Next scheduled classes</small>
        </div>
        <div className="student-kpi-card success">
          <span>Attendance</span>
          <strong>{attendanceRate}%</strong>
          <small>Recent completed classes</small>
        </div>
      </div>

      {liveClasses.length === 0 ? (
        <div className="student-empty-panel">
          <div className="student-empty-mark">LC</div>
          <h3>No live classes yet</h3>
          <p>Your upcoming schedule will appear here once your batch timetable is published.</p>
        </div>
      ) : (
        <>
          {ongoingClasses.length > 0 && (
            <section className="student-section-panel">
              <div className="student-section-head">
                <div>
                  <span className="student-eyebrow">Now live</span>
                  <h2>Join your active class</h2>
                </div>
                <span className="student-live-dot">Live</span>
              </div>
              {ongoingClasses.map(cls => renderClassRow(cls, 'live'))}
            </section>
          )}

          <section className="student-section-panel">
            <div className="student-section-head">
              <div>
                <span className="student-eyebrow">Schedule</span>
                <h2>Upcoming classes</h2>
              </div>
              <span className="student-pill primary">Next 5</span>
            </div>
            {upcomingClasses.length === 0 ? (
              <div className="student-inline-empty">No upcoming classes scheduled.</div>
            ) : upcomingClasses.map(cls => renderClassRow(cls, 'upcoming'))}
          </section>

          <div className="student-two-column">
            <section className="student-section-panel">
              <div className="student-section-head compact">
                <h2>Attended</h2>
                <span className="student-pill success">Last 5</span>
              </div>
              {attendedClasses.length === 0 ? (
                <div className="student-inline-empty">No attended classes yet.</div>
              ) : attendedClasses.map(cls => renderClassRow(cls, 'attended'))}
            </section>

            <section className="student-section-panel">
              <div className="student-section-head compact">
                <h2>Missed</h2>
                <span className="student-pill danger">Last 5</span>
              </div>
              {missedClasses.length === 0 ? (
                <div className="student-inline-empty">No missed classes. Keep it steady.</div>
              ) : missedClasses.map(cls => renderClassRow(cls, 'missed'))}
            </section>
          </div>
        </>
      )}
    </div>
  );

  const renderRecordedLectures = () => (
    <div className="student-stack">
      <section className="student-section-panel">
        <div className="student-section-head">
          <div>
            <span className="student-eyebrow">Revision library</span>
            <h2>Recorded lectures</h2>
          </div>
          <span className="student-pill primary">{completedLectures}/{totalLectures || 0} completed</span>
        </div>

        {lectures.length === 0 ? (
          <div className="student-empty-panel embedded">
            <div className="student-empty-mark">RC</div>
            <h3>No recordings yet</h3>
            <p>Completed live classes will appear here for batch-only revision access.</p>
          </div>
        ) : lectures.map((lecture, idx) => {
          const typeInfo = VIDEO_TYPE_INFO[lecture.videoType] || VIDEO_TYPE_INFO.other;
          const isExpanded = expandedLecture === lecture._id;
          const currentDuration = watchTime[lecture._id] || 0;
          const isCompleted = lecture.isCompleted || currentDuration >= 600;
          const progress = clampPercent(Math.round((currentDuration / 600) * 100));

          return (
            <article key={lecture._id} className={`student-recording-card${isCompleted ? ' completed' : ''}`}>
              <div className="student-recording-summary">
                <div className="student-type-mark" style={{ background: `${typeInfo.color}15`, color: typeInfo.color }}>
                  {isCompleted ? 'OK' : typeInfo.icon}
                </div>
                <div className="student-recording-copy">
                  <span>Lecture #{idx + 1} • {typeInfo.label}</span>
                  <h3>{lecture.title}</h3>
                  <div className="student-progress-track">
                    <div style={{ width: `${isCompleted ? 100 : progress}%` }} />
                  </div>
                </div>
                <button className="btn btn-secondary btn-sm" onClick={() => setExpandedLecture(isExpanded ? null : lecture._id)}>
                  {isExpanded ? 'Collapse' : 'Watch'}
                </button>
              </div>
              {isExpanded && (
                <div className="student-player-wrap">
                  <RecordedLecturePlayer lecture={lecture} />
                </div>
              )}
            </article>
          );
        })}
      </section>
    </div>
  );

  const renderAssignments = () => (
    <div className="student-stack">
      <div className="student-kpi-grid">
        <div className="student-kpi-card">
          <span>Total work</span>
          <strong>{totalAssignments}</strong>
          <small>Assignments assigned</small>
        </div>
        <div className="student-kpi-card success">
          <span>Submitted</span>
          <strong>{submittedAssignments}</strong>
          <small>Reviewed or awaiting review</small>
        </div>
        <div className="student-kpi-card warning">
          <span>Pending</span>
          <strong>{pendingAssignments}</strong>
          <small>Needs action</small>
        </div>
      </div>

      {assignments.length === 0 ? (
        <div className="student-empty-panel">
          <div className="student-empty-mark">AS</div>
          <h3>No assignments yet</h3>
          <p>Practice work and submissions will appear here once your teacher publishes them.</p>
        </div>
      ) : assignments.map(assignment => {
        const overdue = new Date(assignment.dueDate) < new Date();
        const status = assignment.submission ? assignment.submission.status : overdue ? 'overdue' : 'pending';

        return (
          <article key={assignment._id} className={`student-assignment-card ${status}`}>
            <div className="student-assignment-main">
              <div className="student-row-meta">
                {assignment.submission ? (
                  <span className={`student-pill ${assignment.submission.status === 'late' ? 'danger' : 'success'}`}>
                    {assignment.submission.status === 'late' ? 'Submitted late' : 'Submitted'}
                  </span>
                ) : overdue ? (
                  <span className="student-pill danger">Overdue</span>
                ) : (
                  <span className="student-pill warning">Pending</span>
                )}
                <span className="student-pill neutral">Due {formatShortDate(assignment.dueDate)}</span>
              </div>
              <h3>{assignment.title}</h3>
              <p>{assignment.description}</p>
              {assignment.submission && (
                <div className="student-submission-note">
                  <strong>Last submitted:</strong> {new Date(assignment.submission.submittedAt).toLocaleString()}
                  {assignment.submission.notes && <span>{assignment.submission.notes}</span>}
                </div>
              )}
            </div>
            <div className="student-card-actions">
              <button className="btn btn-primary btn-sm" onClick={() => openSubmissionModal(assignment)}>
                {assignment.submission ? 'Update Submission' : 'Submit Work'}
              </button>
              {assignment.attachmentUrl && <a href={assignment.attachmentUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">View Attachment</a>}
              {assignment.submission?.driveLink && <a href={assignment.submission.driveLink} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">Your Drive Link</a>}
            </div>
          </article>
        );
      })}
    </div>
  );

  const renderDashboard = () => (
    <>
      <section className="student-hero-panel">
        <div className="student-hero-copy">
          <span className="student-eyebrow">Brit Institute learner cockpit</span>
          <h1>Welcome back, {user?.name || 'learner'}</h1>
          <p>{courseTitle}</p>
          <div className="student-hero-actions">
            <button className="btn btn-primary" onClick={() => { setDashTab('live'); setView('dashboard'); }}>View Schedule</button>
            <button className="btn btn-secondary" onClick={() => setView('assistant')}>Open Study Assistant</button>
          </div>
        </div>
        <div className="student-readiness-card">
          <div
            className="student-readiness-ring"
            style={{ background: `conic-gradient(#2457d3 ${learningProgress}%, #e7eef8 0)` }}
          >
            <div>{learningProgress}%</div>
          </div>
          <span>Career readiness</span>
          <small>Based on classes, recordings, and submissions</small>
        </div>
      </section>

      {portalError && <div className="alert alert-error">{portalError}</div>}

      <div className="student-overview-grid">
        <div className="student-overview-card">
          <span>Attendance</span>
          <strong>{attendanceRate}%</strong>
          <small>{finishedClassCount} completed classes tracked</small>
        </div>
        <div className="student-overview-card">
          <span>Recorded Lectures</span>
          <strong>{totalLectures}</strong>
          <small>{completedLectures} completed</small>
        </div>
        <div className="student-overview-card">
          <span>Assignments</span>
          <strong>{submittedAssignments}/{totalAssignments}</strong>
          <small>{pendingAssignments} pending</small>
        </div>
        <div className="student-overview-card gold">
          <span>Curriculum</span>
          <strong>{scheduledTopics}/{curriculumTopics}</strong>
          <small>Classes scheduled</small>
        </div>
      </div>

      <div className="student-dashboard-grid">
        <section className="student-learning-panel">
          <div className="tabs student-tabs">
            {[
              { key: 'live', label: 'Live Classes' },
              { key: 'recorded', label: 'Recorded Lectures' },
              { key: 'assignments', label: 'Assignments' },
            ].map(tab => (
              <button key={tab.key} className={`tab-btn${dashTab === tab.key ? ' active' : ''}`} onClick={() => setDashTab(tab.key as DashboardTab)}>
                {tab.label}
              </button>
            ))}
          </div>

          {dashTab === 'live' && renderLiveClasses()}
          {dashTab === 'recorded' && renderRecordedLectures()}
          {dashTab === 'assignments' && renderAssignments()}
        </section>

        <aside className="student-insight-rail">
          <section className="student-next-card">
            <span className="student-eyebrow">{ongoingClasses.length > 0 ? 'Class in progress' : 'Next up'}</span>
            {nextClass ? (
              <>
                <h2>{nextClass.topic}</h2>
                <p>{formatDateTime(nextClass.scheduledAt)}</p>
                <button className="btn btn-primary btn-sm" onClick={() => handleJoinMeet(nextClass)} disabled={!!attendingId}>
                  {ongoingClasses.length > 0 ? 'Join Class' : 'Open Class'}
                </button>
              </>
            ) : (
              <>
                <h2>No class scheduled</h2>
                <p>Your timetable will update once your teacher schedules the next session.</p>
              </>
            )}
          </section>

          <section className="student-side-panel">
            <div className="student-section-head compact">
              <h2>Announcements</h2>
            </div>
            {announcements.map((item, index) => (
              <div key={item} className="student-announcement">
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{item}</p>
              </div>
            ))}
          </section>

          <section className="student-side-panel">
            <div className="student-section-head compact">
              <h2>Study focus</h2>
            </div>
            <button className="student-focus-row" onClick={() => setView('curriculum')}>
              <span>Roadmap</span>
              <strong>{curriculumTopics || 0} classes</strong>
            </button>
            <button className="student-focus-row" onClick={() => setView('performance')}>
              <span>Performance</span>
              <strong>{learningProgress}%</strong>
            </button>
            <button className="student-focus-row" onClick={() => setView('sessions')}>
              <span>Mentoring</span>
              <strong>{mentoringSessions} sessions</strong>
            </button>
          </section>
        </aside>
      </div>
    </>
  );

  const renderCurriculum = () => (
    <>
      <section className="student-page-hero">
        <span className="student-eyebrow">Learning roadmap</span>
        <h1>Your batch curriculum</h1>
        <p>Follow each module, scheduled class, and practical milestone from one clean roadmap.</p>
      </section>

      {!curriculum || curriculum.modules.length === 0 ? (
        <div className="student-empty-panel">
          <div className="student-empty-mark">CR</div>
          <h3>No curriculum available yet</h3>
          <p>Your batch roadmap will appear here once assigned by the institute team.</p>
        </div>
      ) : (
        <div className="student-stack">
          <div className="student-kpi-grid">
            <div className="student-kpi-card"><span>Modules</span><strong>{curriculum.modules.length}</strong><small>Structured learning blocks</small></div>
            <div className="student-kpi-card"><span>Classes</span><strong>{curriculumTopics}</strong><small>Total curriculum topics</small></div>
            <div className="student-kpi-card success"><span>Scheduled</span><strong>{scheduledTopics}</strong><small>Classes with dates</small></div>
          </div>

          {curriculum.modules.map((module, moduleIndex) => (
            <section key={module._id || moduleIndex} className="student-roadmap-module">
              <div className="student-module-head">
                <div>
                  <span>Module {moduleIndex + 1}</span>
                  <h2>{module.title}</h2>
                </div>
                <strong>{module.topics.length} classes</strong>
              </div>
              <div className="student-roadmap-list">
                {module.topics.map((topic, topicIndex) => (
                  <article key={topic._id || topicIndex} className="student-roadmap-item">
                    <div className="student-roadmap-index">{String(topicIndex + 1).padStart(2, '0')}</div>
                    <div>
                      <h3>{topic.title}</h3>
                      <p>{topic.scheduledAt ? `Scheduled ${formatDateTime(topic.scheduledAt)}` : 'Schedule will be updated by your teacher'}</p>
                    </div>
                    <div className="student-roadmap-tags">
                      <span className="student-pill neutral">{topic.duration} mins</span>
                      {topic.meetingLink ? <span className="student-pill success">Class Ready</span> : <span className="student-pill neutral">Class Pending</span>}
                    </div>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );

  const renderSessions = () => (
    <>
      <section className="student-page-hero split">
        <div>
          <span className="student-eyebrow">Mentor support</span>
          <h1>One-to-one sessions</h1>
          <p>Book personal guidance for doubts, projects, interview prep, and portfolio feedback.</p>
        </div>
        <button className="btn btn-primary" onClick={() => openBookingModal()}>Book New Session</button>
      </section>

      <div className="student-stack">
        {bookings.length === 0 ? (
          <div className="student-empty-panel">
            <div className="student-empty-mark">MT</div>
            <h3>No sessions scheduled</h3>
            <p>Request a focused mentor session whenever you need help with a concept or project.</p>
            <button className="btn btn-primary btn-sm" onClick={() => openBookingModal()}>Book First Session</button>
          </div>
        ) : bookings.map(booking => (
          <article key={booking._id} className={`student-session-card ${booking.status}`}>
            <div>
              <div className="student-row-meta">
                <span className={`student-pill ${booking.status === 'accepted' ? 'success' : booking.status === 'pending' ? 'warning' : 'neutral'}`}>
                  {booking.status}
                </span>
                <span className="student-pill neutral">ID {booking._id.slice(-6)}</span>
              </div>
              <h3>{booking.topic}</h3>
              <p>Mentor: <strong>{booking.mentor.name}</strong> • {formatDateTime(booking.dateTime)}</p>
            </div>
            <div className="student-card-actions">
              {booking.status === 'accepted' && booking.meetingLink && (
                <button className="btn btn-primary btn-sm" onClick={() => window.open(booking.meetingLink, '_blank')}>Join Session</button>
              )}
              {(booking.status === 'pending' || booking.status === 'accepted') && (
                <>
                  <button className="btn btn-secondary btn-sm" onClick={() => openBookingModal(booking)}>Reschedule</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleCancelBooking(booking._id)}>Cancel</button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </>
  );

  const renderPerformance = () => (
    <>
      <section className="student-page-hero">
        <span className="student-eyebrow">Performance analytics</span>
        <h1>Your learning signal</h1>
        <p>Track attendance, revision habits, submissions, and readiness in a simple performance cockpit.</p>
      </section>

      <div className="student-analytics-grid">
        {[
          { label: 'Overall progress', value: learningProgress, help: 'Combined class, recording, and assignment activity' },
          { label: 'Attendance health', value: attendanceRate, help: 'Present rate for completed classes' },
          { label: 'Recording completion', value: recordingCompletion, help: 'Recorded lectures marked complete' },
          { label: 'Assignment completion', value: assignmentCompletion, help: 'Submitted work versus assigned work' },
        ].map(item => (
          <section key={item.label} className="student-analytics-card">
            <div className="student-section-head compact">
              <h2>{item.label}</h2>
              <strong>{item.value}%</strong>
            </div>
            <div className="student-progress-track large"><div style={{ width: `${item.value}%` }} /></div>
            <p>{item.help}</p>
          </section>
        ))}
      </div>

      <section className="student-section-panel">
        <div className="student-section-head">
          <div>
            <span className="student-eyebrow">Skill habits</span>
            <h2>Recommended focus</h2>
          </div>
        </div>
        <div className="student-focus-grid">
          {recommendations.map((recommendation) => (
            <div key={recommendation.title}>
              <strong>{recommendation.title}</strong>
              <span>{recommendation.action}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );

  const renderCertificates = () => (
    <>
      <section className="student-page-hero">
        <span className="student-eyebrow">Certificates</span>
        <h1>Achievement and completion</h1>
        <p>Your certificate status is calculated from attendance, learning activity, and assignment progress.</p>
      </section>

      <section className="student-certificate-card">
        <div>
          <span className="student-eyebrow">Brit Institute</span>
          <h2>{courseTitle}</h2>
          <p>
            {certificateRequest
              ? `Certificate request status: ${certificateRequest.status}.`
              : certificateReady ? 'You are ready for certificate review.' : 'Keep progressing to unlock certificate review.'}
          </p>
          <div className="student-certificate-grid">
            <div><span>Progress</span><strong>{learningProgress}%</strong></div>
            <div><span>Attendance</span><strong>{attendanceRate}%</strong></div>
            <div><span>Assignments</span><strong>{submittedAssignments}/{totalAssignments}</strong></div>
          </div>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleCertificateRequest}
          disabled={!certificateReady || certificateRequesting || Boolean(certificateRequest && ['pending', 'approved', 'issued'].includes(certificateRequest.status))}
        >
          {certificateRequesting
            ? 'Submitting...'
            : certificateRequest?.status === 'pending'
              ? 'Request Sent'
              : certificateRequest?.status === 'approved'
                ? 'Approved'
                : certificateRequest?.status === 'issued'
                  ? 'Issued'
                  : certificateReady ? 'Request Certificate' : 'Certificate Locked'}
        </button>
      </section>

      {certificateMessage && (
        <div className={`alert ${certificateMessage.toLowerCase().includes('unable') || certificateMessage.toLowerCase().includes('not completed') ? 'alert-error' : 'alert-success'}`}>
          {certificateMessage}
        </div>
      )}

      <div className="student-two-column">
        <section className="student-section-panel">
          <div className="student-section-head compact"><h2>Requirements</h2></div>
          {(portalSummary?.certificate.requirements || [
            { label: 'Progress above 80%', value: learningProgress, target: 80, passed: learningProgress >= 80 },
            { label: 'Attendance above 70%', value: attendanceRate, target: 70, passed: attendanceRate >= 70 },
            { label: 'Assignments submitted', value: submittedAssignments, target: totalAssignments, passed: totalAssignments === 0 || submittedAssignments >= totalAssignments },
          ]).map((requirement) => (
            <div key={requirement.label} className={`student-check-row${requirement.passed ? ' complete' : ''}`}>
              <span>{requirement.label}</span>
              <strong>{requirement.label.includes('Assignments') ? `${submittedAssignments}/${totalAssignments}` : `${requirement.value}%`}</strong>
            </div>
          ))}
        </section>
        <section className="student-section-panel">
          <div className="student-section-head compact"><h2>Portfolio proof</h2></div>
          <p className="student-panel-copy">Keep your projects, notes, and submissions complete so your certificate review has strong evidence.</p>
        </section>
      </div>
    </>
  );

  const renderAssistant = () => (
    <>
      <section className="student-page-hero">
        <span className="student-eyebrow">AI study assistant</span>
        <h1>Plan your next study block</h1>
        <p>Get a quick study plan based on your current classes, recordings, and assignments.</p>
      </section>

      <section className="student-assistant-panel">
        <div className="student-prompt-grid">
          {[
            'Help me revise my latest class',
            'Plan my assignment submission',
            'Prepare me for my next live class',
          ].map(prompt => (
            <button key={prompt} onClick={() => handleAssistantPrompt(prompt)} disabled={assistantLoading}>{prompt}</button>
          ))}
        </div>
        {assistantError && <div className="alert alert-error">{assistantError}</div>}
        <textarea
          className="form-textarea student-assistant-input"
          rows={5}
          placeholder="Ask for a study plan, revision checklist, or project practice idea..."
          value={assistantDraft}
          onChange={e => setAssistantDraft(e.target.value)}
        />
        <div className="student-assistant-actions">
          <button className="btn btn-primary" onClick={handleAssistantSubmit} disabled={assistantLoading}>
            {assistantLoading ? 'Generating...' : 'Generate Study Plan'}
          </button>
          <button className="btn btn-secondary" onClick={() => { setAssistantDraft(''); setAssistantAnswer(null); setAssistantError(''); }}>Clear</button>
        </div>
        {assistantAnswer && (
          <div className="student-assistant-answer">
            <span>Suggested plan</span>
            <p>{assistantAnswer.response}</p>
            <ol>
              {assistantAnswer.steps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </div>
        )}
      </section>
    </>
  );

  const renderSettings = () => (
    <section className="student-settings-panel">
      <span className="student-eyebrow">Account</span>
      <h1>Profile settings</h1>
      <div className="student-form-grid">
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input className="form-input" value={user?.name || ''} disabled />
        </div>
        <div className="form-group">
          <label className="form-label">Username</label>
          <input className="form-input" value={user?.username || ''} disabled />
        </div>
        <div className="form-group">
          <label className="form-label">Programme</label>
          <input className="form-input" value={courseTitle} disabled />
        </div>
      </div>
      <div className="alert alert-info">Name, username, and programme are managed by your teacher or super admin.</div>
      <ChangePasswordForm />
    </section>
  );

  return (
    <div className="student-shell">
      <aside className="student-sidebar">
        <div className="student-brand-panel">
          <BrandLogo subtitle={'Student\nWorkspace'} />
        </div>

        <div className="student-sidebar-status">
          <span>Current programme</span>
          <strong>{courseTitle}</strong>
        </div>

        <nav className="student-nav">
          {sidebarItems.map(item => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`student-nav-item${view === item.id ? ' active' : ''}`}
            >
              <span className="student-nav-code">{item.code}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="student-account-card">
          <div className="student-avatar">{user?.name?.charAt(0) || 'S'}</div>
          <div>
            <strong>{user?.name}</strong>
            <span>Student Account</span>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={handleLogout}>Sign Out</button>
        </div>
      </aside>

      <main className="student-main">
        {loading ? (
          <div className="loading-center"><div className="spinner" /><span>Preparing your dashboard...</span></div>
        ) : (
          <div className="fade-in">
            {view === 'dashboard' && renderDashboard()}
            {view === 'curriculum' && renderCurriculum()}
            {view === 'sessions' && renderSessions()}
            {view === 'performance' && renderPerformance()}
            {view === 'certificates' && renderCertificates()}
            {view === 'assistant' && renderAssistant()}
            {view === 'settings' && renderSettings()}
          </div>
        )}
      </main>

      {showBookingModal && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) closeBookingModal(); }}>
          <div className="modal student-booking-modal" style={{ maxWidth: '640px' }}>
            <div className="modal-header">
              <div>
                <h2>{reschedulingBooking ? 'Reschedule 1:1 Session' : 'Book 1:1 Session'}</h2>
                <p className="student-modal-subtitle">Pick one available mentor slot. Booked slots are blocked automatically.</p>
              </div>
              <button className="modal-close" onClick={closeBookingModal}>X</button>
            </div>
            {bookingError && <div className="alert alert-error">{bookingError}</div>}
            <div className="form-group">
              <label className="form-label">Select Mentor</label>
              <select
                className="form-select"
                value={bookingForm.mentor}
                onChange={e => handleBookingFieldChange('mentor', e.target.value)}
              >
                <option value="">Select your mentor</option>
                {mentors.map(m => <option key={m._id} value={m._id}>{m.name} (@{m.username})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">What do you want to discuss?</label>
              <input
                className="form-input"
                placeholder="Example: Python basics doubt"
                value={bookingForm.topic}
                onChange={e => handleBookingFieldChange('topic', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Preferred Date</label>
              <input
                type="date"
                className="form-input"
                min={toDateInputValue()}
                value={bookingForm.date}
                onChange={e => handleBookingFieldChange('date', e.target.value)}
              />
            </div>
            <div className="form-group">
              <div className="student-slot-header">
                <label className="form-label">Available Time Slots</label>
                <div className="student-slot-legend">
                  <span><i className="available" /> Available</span>
                  <span><i className="booked" /> Booked</span>
                </div>
              </div>
              {!bookingForm.mentor ? (
                <div className="student-slot-empty">Select a mentor to see availability.</div>
              ) : slotsLoading ? (
                <div className="student-slot-empty">Loading available slots...</div>
              ) : mentorSlots.length === 0 ? (
                <div className="student-slot-empty">No slots found for this date.</div>
              ) : (
                <div className="student-slot-grid">
                  {mentorSlots.map(slot => {
                    const selected = bookingForm.dateTime === slot.dateTime;
                    const ownSlot = Boolean(reschedulingBooking && slot.bookingId === reschedulingBooking._id);
                    const unavailable = slot.status !== 'available' && !ownSlot;
                    return (
                      <button
                        key={slot.dateTime}
                        type="button"
                        className={`student-slot-btn ${ownSlot ? 'current' : slot.status}${selected ? ' selected' : ''}`}
                        disabled={unavailable}
                        onClick={() => setBookingForm(prev => ({ ...prev, dateTime: slot.dateTime }))}
                        title={ownSlot ? 'Your current session slot' : slot.status === 'booked' ? 'This slot is already occupied' : slot.status === 'past' ? 'Past slots cannot be booked' : 'Book this time'}
                      >
                        <span>{slot.label}</span>
                        <small>{ownSlot ? 'Current' : slot.status === 'available' ? 'Open' : slot.status === 'booked' ? 'Booked' : 'Past'}</small>
                      </button>
                    );
                  })}
                </div>
              )}
              {selectedSlot && (
                <div className="student-slot-selection">
                  Selected slot: <strong>{selectedSlot.label}</strong> on {formatShortDate(bookingForm.dateTime)}
                </div>
              )}
            </div>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={closeBookingModal}>Cancel</button>
              <button className="btn btn-primary" onClick={handleCreateBooking} disabled={bookingSaving || !bookingForm.dateTime}>
                {bookingSaving ? (reschedulingBooking ? 'Rescheduling...' : 'Booking...') : (reschedulingBooking ? 'Confirm Reschedule' : 'Confirm Booking')}
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
