import { useEffect, useState } from 'react';
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
}

interface RecordedLecturePlayerProps {
  lecture: RecordedLectureLike;
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

const getEmbedUrl = (lecture: RecordedLectureLike) => {
  const url = lecture.videoUrl.trim();
  const youtubeId = getYouTubeId(url);

  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&modestbranding=1&rel=0&disablekb=1`;
  if (lecture.videoType === 'drive' || /drive\.google\.com/i.test(url)) return getDrivePreviewUrl(url);
  if (isZoomUrl(url)) return getZoomWebUrl(url);
  return url;
};

export default function RecordedLecturePlayer({ lecture }: RecordedLecturePlayerProps) {
  const { user } = useAuth();
  const [streamToken, setStreamToken] = useState('');
  const [streamError, setStreamError] = useState('');
  const isZoomRecording = lecture.recordingSource === 'zoom' || lecture.videoType === 'zoom';
  const usesProtectedStream = Boolean(lecture._id && (lecture.playbackMode === 'protected_stream' || isZoomRecording));
  const videoUrl = usesProtectedStream && lecture._id && streamToken
    ? getProtectedStreamUrl(lecture._id, streamToken)
    : lecture.videoUrl.trim();
  const embedUrl = getEmbedUrl(lecture);
  const watermark = user ? `${user.name || user.username} • ${user.username}` : 'Protected playback';

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
          className="recorded-player-video"
          controls
          controlsList="nodownload noremoteplayback"
          disableRemotePlayback
          draggable={false}
          preload="metadata"
          title={lecture.title}
          onContextMenu={(event) => event.preventDefault()}
        >
          <source src={videoUrl} type={usesProtectedStream ? 'video/mp4' : undefined} />
        </video>
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
