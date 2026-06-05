import React, { useEffect, useMemo, useState } from 'react';
import { liveClassApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { formatUkDateTime, formatUkTime } from '../utils/ukTime';

interface Batch {
  _id: string;
  name: string;
}

interface LiveClass {
  _id: string;
  classNumber: string;
  topic: string;
  meetingLink: string;
  zoomStartUrl?: string;
  scheduledAt: string;
  duration: number;
  status: string;
  batch?: Batch;
}

const REMINDER_BEFORE_MINUTES = 10;
const DISMISSED_KEY = 'brit_dismissed_meeting_reminders';

const readDismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || '[]');
  } catch {
    return [];
  }
};

export default function MeetingReminderPopup() {
  const { user, loading } = useAuth();
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [dismissed, setDismissed] = useState<string[]>(readDismissed);
  const [now, setNow] = useState(new Date());

  const isStaff = user ? ['admin', 'teacher', 'superadmin'].includes(user.role) : false;

  useEffect(() => {
    if (!user || loading) return;

    let cancelled = false;
    const fetchClasses = async () => {
      try {
        const res = isStaff ? await liveClassApi.getAll() : await liveClassApi.getMine();
        if (!cancelled) setClasses(res.data.liveClasses || []);
      } catch (err) {
        console.error('Failed to load meeting reminders', err);
      }
    };

    fetchClasses();
    const interval = window.setInterval(fetchClasses, 30_000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [isStaff, loading, user]);

  useEffect(() => {
    const interval = window.setInterval(() => setNow(new Date()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  const reminderClass = useMemo(() => {
    return classes
      .filter((cls) => {
        if (dismissed.includes(cls._id) || cls.status === 'ended') return false;

        const startsAt = new Date(cls.scheduledAt);
        const endsAt = new Date(startsAt.getTime() + cls.duration * 60 * 1000);
        if (cls.status !== 'live' && endsAt < now) return false;
        const reminderAt = new Date(startsAt.getTime() - REMINDER_BEFORE_MINUTES * 60 * 1000);
        return now >= reminderAt;
      })
      .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())[0];
  }, [classes, dismissed, now]);

  if (!user || loading || !reminderClass) return null;

  const startsAt = new Date(reminderClass.scheduledAt);
  const endsAt = new Date(startsAt.getTime() + reminderClass.duration * 60 * 1000);
  const isOngoing = reminderClass.status === 'live' || (startsAt <= now && endsAt >= now);
  const meetingUrl = isStaff && reminderClass.zoomStartUrl ? reminderClass.zoomStartUrl : reminderClass.meetingLink;

  const closeReminder = () => {
    const next = Array.from(new Set([...dismissed, reminderClass._id]));
    setDismissed(next);
    localStorage.setItem(DISMISSED_KEY, JSON.stringify(next));
  };

  const openMeeting = async () => {
    if (!isStaff) {
      try {
        await liveClassApi.attend(reminderClass._id);
      } catch (err) {
        console.error('Failed to mark attendance from reminder', err);
      }
    }
    window.open(meetingUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="meeting-reminder-overlay" role="dialog" aria-modal="true" aria-labelledby="meeting-reminder-title">
      <div className="meeting-reminder">
        <button className="modal-close meeting-reminder-close" aria-label="Close meeting reminder" onClick={closeReminder}>✕</button>
        <div className="meeting-reminder-status">
          <span className={`badge ${isOngoing ? 'badge-live' : 'badge-overdue'}`}>
            {isOngoing ? 'Going on' : 'Starting soon'}
          </span>
        </div>
        <h2 id="meeting-reminder-title">{reminderClass.topic}</h2>
        <p className="meeting-reminder-meta">
          {reminderClass.classNumber}
          {reminderClass.batch?.name ? ` • ${reminderClass.batch.name}` : ''}
        </p>
        <div className="meeting-reminder-time">
          <div>
            <span>Starts</span>
            <strong>{formatUkDateTime(startsAt)}</strong>
          </div>
          <div>
            <span>Ends</span>
            <strong>{reminderClass.status === 'ended' ? 'Closed' : formatUkTime(endsAt)}</strong>
          </div>
        </div>
        <button className="btn btn-zoom meeting-reminder-action" onClick={openMeeting}>
          {isStaff ? 'Start Zoom Meeting' : isOngoing ? 'Rejoin Class' : 'Join Class'}
        </button>
      </div>
    </div>
  );
}
