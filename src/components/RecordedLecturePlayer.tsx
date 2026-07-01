import { useCallback, useEffect, useRef, useState } from 'react';
import { recordedApi } from '../api';
import { useAuth } from '../context/AuthContext';

interface RecordedLectureLike {
  _id?: string;
  title: string;
  videoUrl: string;
  videoType: string;
  recordingSource?: string;
  recordingStatus?: string;
  isPlayable?: boolean;
  playbackMode?: 'protected_stream' | 'blocked_external';
  liveClass?: unknown;
}

interface RecordedLecturePlayerProps {
  lecture: RecordedLectureLike;
  initialPosition?: number;
}

const getYouTubeId = (url: string): string | null => {
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|shorts\/|watch\?v=))([^&?\s/]+)/);
  return match ? match[1] : null;
};

const getDrivePreviewUrl = (url: string) => {
  if (url.includes('/preview')) return url;
  if (url.includes('/view')) return url.replace('/view', '/preview');

  const fileId = url.match(/\/file\/d\/([^/]+)/)?.[1] || url.match(/[?&]id=([^&]+)/)?.[1];
  return fileId ? `https://drive.google.com/file/d/${fileId}/preview` : url;
};

const getZoomWebUrl = (url: string) => {
  try {
    const parsed = new URL(url);
    const meetingId = parsed.pathname.match(/\/j\/(\d+)/)?.[1] || parsed.pathname.match(/\/wc\/join\/(\d+)/)?.[1];
    if (!meetingId) return url;

    const params = new URLSearchParams();
    const password = parsed.searchParams.get('pwd');
    if (password) params.set('pwd', password);

    const query = params.toString();
    return `https://zoom.us/wc/join/${meetingId}${query ? `?${query}` : ''}`;
  } catch {
    return url;
  }
};

const isDirectVideoUrl = (url: string) => /\.(mp4|webm|ogg)(?:$|[?#])/i.test(url);
const isZoomUrl = (url: string) => /(^|\.)zoom\.us\//i.test(url);
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

const getProtectedStreamUrl = (lectureId: string, streamToken: string) =>
  `${API_URL}/recorded/${lectureId}/stream?streamToken=${encodeURIComponent(streamToken)}`;

const formatPlaybackPosition = (seconds: number) => {
  const wholeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(wholeSeconds / 60);
  const remainingSeconds = String(wholeSeconds % 60).padStart(2, '0');
  return `${minutes}:${remainingSeconds}`;
};

const getEmbedUrl = (lecture: RecordedLectureLike) => {
  const url = lecture.videoUrl.trim();
  const youtubeId = getYouTubeId(url);

  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&modestbranding=1&rel=0&disablekb=1`;
  if (lecture.videoType === 'drive' || /drive\.google\.com/i.test(url)) return getDrivePreviewUrl(url);
  if (isZoomUrl(url)) return getZoomWebUrl(url);
  return url;
};

export default function RecordedLecturePlayer({ lecture, initialPosition = 0 }: RecordedLecturePlayerProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedPositionRef = useRef(Math.max(0, initialPosition));
  const [streamToken, setStreamToken] = useState('');
  const [streamError, setStreamError] = useState('');
  const [resumePosition, setResumePosition] = useState(Math.max(0, initialPosition));
  const [showResume, setShowResume] = useState(initialPosition >= 2);
  const isZoomRecording = lecture.recordingSource === 'zoom' || Boolean(lecture._id && lecture.videoType === 'zoom' && lecture.liveClass);
  const usesProtectedStream = Boolean(lecture._id && (lecture.playbackMode === 'protected_stream' || isZoomRecording));
  const videoUrl = usesProtectedStream && lecture._id && streamToken
    ? getProtectedStreamUrl(lecture._id, streamToken)
    : lecture.videoUrl.trim();
  const embedUrl = getEmbedUrl(lecture);
  const watermark = user ? `${user.name || user.username} • ${user.username}` : 'Protected playback';

  const savePosition = useCallback((position: number, isCompleted = false) => {
    if (!lecture._id || !Number.isFinite(position)) return;
    const safePosition = Math.max(0, position);
    lastSavedPositionRef.current = safePosition;
    recordedApi.updateProgress(lecture._id, {
      watchDuration: Math.floor(safePosition),
      isCompleted,
      playbackPosition: isCompleted ? 0 : safePosition,
    }).catch(() => undefined);
  }, [lecture._id]);

  useEffect(() => {
    setResumePosition(Math.max(0, initialPosition));
    setShowResume(initialPosition >= 2);
    lastSavedPositionRef.current = Math.max(0, initialPosition);
  }, [initialPosition, lecture._id]);

  useEffect(() => {
    const saveCurrentPosition = () => {
      const video = videoRef.current;
      if (video && Number.isFinite(video.currentTime)) savePosition(video.currentTime);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        const video = videoRef.current;
        if (!video || !Number.isFinite(video.currentTime)) return;
        const position = video.currentTime;
        savePosition(position);
        video.pause();
        setResumePosition(position);
        setShowResume(position >= 2);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', saveCurrentPosition);
    return () => {
      saveCurrentPosition();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', saveCurrentPosition);
    };
  }, [savePosition]);

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    if (Math.abs(video.currentTime - lastSavedPositionRef.current) >= 5) {
      savePosition(video.currentTime);
    }
  };

  const startPlayback = async (position: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.min(Math.max(0, position), Number.isFinite(video.duration) ? Math.max(0, video.duration - 1) : position);
    setShowResume(false);
    try {
      await video.play();
    } catch {
      // Native controls remain available if the browser blocks programmatic playback.
    }
  };

  useEffect(() => {
    if (!usesProtectedStream || !lecture._id) {
      setStreamToken('');
      setStreamError('');
      return;
    }

    let cancelled = false;
    setStreamToken('');
    setStreamError('');

    recordedApi.getStreamToken(lecture._id)
      .then((res) => {
        if (!cancelled) setStreamToken(res.data.streamToken || '');
      })
      .catch(() => {
        if (!cancelled) setStreamError('Protected playback could not be prepared. Please refresh and try again.');
      });

    return () => { cancelled = true; };
  }, [lecture._id, usesProtectedStream]);

  if (isZoomRecording && (lecture.recordingStatus !== 'available' || lecture.isPlayable !== true)) {
    return (
      <div className="recorded-player-empty">
        Zoom recording is still processing. It will appear here automatically when Zoom finishes.
      </div>
    );
  }

  if (usesProtectedStream && !streamToken) {
    return (
      <div className="recorded-player-empty">
        {streamError || 'Preparing protected playback...'}
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="recorded-player-empty">
        {lecture.playbackMode === 'blocked_external'
          ? 'This recording uses an external provider and cannot be played in protected LMS mode. Ask the institute team to upload it as a protected LMS or Zoom recording.'
          : 'Recording link is not available yet.'}
      </div>
    );
  }

  if (usesProtectedStream || isDirectVideoUrl(videoUrl)) {
    return (
      <div className="recorded-player protected-player" onContextMenu={(event) => event.preventDefault()}>
        <video
          ref={videoRef}
          className="recorded-player-video"
          controls
          controlsList="nodownload noremoteplayback"
          disableRemotePlayback
          draggable={false}
          preload="metadata"
          title={lecture.title}
          onContextMenu={(event) => event.preventDefault()}
          onTimeUpdate={handleTimeUpdate}
          onPause={() => {
            const video = videoRef.current;
            if (video && !video.ended) savePosition(video.currentTime);
          }}
          onEnded={() => savePosition(0, true)}
        >
          <source src={videoUrl} type={usesProtectedStream ? 'video/mp4' : undefined} />
        </video>
        {showResume && (
          <div className="recorded-player-resume">
            <button className="btn btn-primary" onClick={() => startPlayback(resumePosition)}>
              Resume from {formatPlaybackPosition(resumePosition)}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={() => startPlayback(0)}>
              Start over
            </button>
          </div>
        )}
        <div className="recorded-player-watermark" aria-hidden="true">{watermark}</div>
      </div>
    );
  }

  return (
    <div className="recorded-player protected-player" onContextMenu={(event) => event.preventDefault()}>
      <iframe
        className="recorded-player-frame"
        src={embedUrl}
        title={lecture.title}
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
        allowFullScreen
        draggable={false}
        referrerPolicy="strict-origin-when-cross-origin"
        sandbox="allow-scripts allow-same-origin allow-presentation allow-forms"
      />
      <div className="recorded-player-watermark" aria-hidden="true">{watermark}</div>
    </div>
  );
}
