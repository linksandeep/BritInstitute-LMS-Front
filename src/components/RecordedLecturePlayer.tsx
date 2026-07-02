import { useCallback, useEffect, useRef, useState } from 'react';
import { foundationApi, recordedApi } from '../api';
import { useAuth } from '../context/AuthContext';

interface ZoomChapter {
  start: number;
  title: string;
  text: string;
}

interface ZoomTranscriptItem {
  start: number;
  speaker?: string;
  text: string;
}

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
  zoomSummary?: string;
  zoomChapters?: ZoomChapter[];
  zoomTranscript?: ZoomTranscriptItem[];
  zoomDownloadUrl?: string;
  zoomShareUrl?: string;
  zoomPlayUrl?: string;
}

interface RecordedLecturePlayerProps {
  lecture: RecordedLectureLike;
  initialPosition?: number;
  streamKind?: 'recorded' | 'foundation';
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

const getProtectedStreamUrl = (kind: 'recorded' | 'foundation', lectureId: string, streamToken: string) =>
  `${API_URL}/${kind === 'foundation' ? 'foundation' : 'recorded'}/${lectureId}/stream?streamToken=${encodeURIComponent(streamToken)}`;

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

export default function RecordedLecturePlayer({ lecture, initialPosition = 0, streamKind = 'recorded' }: RecordedLecturePlayerProps) {
  const { user } = useAuth();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const lastSavedPositionRef = useRef(Math.max(0, initialPosition));
  const [streamToken, setStreamToken] = useState('');
  const [streamError, setStreamError] = useState('');
  const [videoError, setVideoError] = useState('');
  const [streamResource, setStreamResource] = useState<RecordedLectureLike | null>(null);
  const [prepareSeconds, setPrepareSeconds] = useState(0);
  const [zoomStartTime, setZoomStartTime] = useState(0);
  const [insightTab, setInsightTab] = useState<'summary' | 'chapters' | 'transcript'>('chapters');
  const [resumePosition, setResumePosition] = useState(Math.max(0, initialPosition));
  const [showResume, setShowResume] = useState(initialPosition >= 2);
  const isZoomRecording = lecture.recordingSource === 'zoom' || Boolean(lecture._id && lecture.videoType === 'zoom' && lecture.liveClass);
  
  const isFoundationZoom =
  streamKind === "foundation" &&
  lecture.videoType === "zoom";

  const usesProtectedStream = Boolean(
    lecture._id &&
    (
      lecture.playbackMode === "protected_stream" ||
      isZoomRecording ||
      isFoundationZoom
    )
  );
 

  const preparingMessage = isFoundationZoom ? 'Preparing native Zoom playback...' : 'Preparing protected playback...';
  const videoUrl = usesProtectedStream && lecture._id && streamToken
    ? getProtectedStreamUrl(streamKind, lecture._id, streamToken)
    : lecture.videoUrl.trim();
  const embedUrl = getEmbedUrl(lecture);
  const watermark = user ? `${user.name || user.username} • ${user.username}` : 'Protected playback';

  const savePosition = useCallback((position: number, isCompleted = false) => {
    if (streamKind !== 'recorded' || !lecture._id || !Number.isFinite(position)) return;
    const safePosition = Math.max(0, position);
    lastSavedPositionRef.current = safePosition;
    recordedApi.updateProgress(lecture._id, {
      watchDuration: Math.floor(safePosition),
      isCompleted,
      playbackPosition: isCompleted ? 0 : safePosition,
    }).catch(() => undefined);
  }, [lecture._id, streamKind]);

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
    const safePosition = Math.max(0, position);
    setZoomStartTime(Math.floor(safePosition));
    video.currentTime = Math.min(safePosition, Number.isFinite(video.duration) ? Math.max(0, video.duration - 1) : safePosition);
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
      setVideoError('');
      setStreamResource(null);
      setPrepareSeconds(0);
      return;
    }

    let cancelled = false;
    setStreamToken('');
    setStreamError('');
    setVideoError('');
    setStreamResource(null);
    setPrepareSeconds(0);

    const tokenRequest = streamKind === 'foundation'
      ? foundationApi.getStreamToken(lecture._id)
      : recordedApi.getStreamToken(lecture._id);

    tokenRequest
      .then((res) => {
        if (!cancelled) {
          setStreamToken(res.data.streamToken || '');
          if (res.data.resource) setStreamResource(res.data.resource);
        }
      })
      .catch((err: unknown) => {
        const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
        if (!cancelled) {
          setStreamError(message || (isFoundationZoom
            ? 'Zoom did not return an MP4 file for this Foundation recording. Use a Zoom cloud recording from the connected Zoom account, or paste the Zoom recording download link instead of the Zoom play/share page.'
            : 'Protected playback could not be prepared. Please refresh and try again.'));
        }
      });

    return () => { cancelled = true; };
  }, [lecture._id, streamKind, usesProtectedStream]);

  useEffect(() => {
    if (!usesProtectedStream || streamToken || streamError) return;
    const timer = window.setInterval(() => {
      setPrepareSeconds((seconds) => seconds + 1);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [streamError, streamToken, usesProtectedStream]);

  useEffect(() => {
    const insightLecture = streamResource || lecture;
    if (insightTab === 'chapters' && !(insightLecture.zoomChapters || []).length) {
      setInsightTab(insightLecture.zoomSummary ? 'summary' : 'transcript');
    }
    if (insightTab === 'transcript' && !(insightLecture.zoomTranscript || []).length) {
      setInsightTab((insightLecture.zoomChapters || []).length ? 'chapters' : 'summary');
    }
  }, [insightTab, lecture, streamResource]);

  const renderZoomInsights = () => {
    const insightLecture = streamResource || lecture;
    const chapters = insightLecture.zoomChapters || [];
    const transcript = insightLecture.zoomTranscript || [];
    if (!insightLecture.zoomSummary && chapters.length === 0 && transcript.length === 0) return null;

    return (
      <div className="recorded-player-insights">
        <div className="recorded-insight-tabs" role="tablist" aria-label="Recording insights">
          {insightLecture.zoomSummary && (
            <button
              className={insightTab === 'summary' ? 'active' : ''}
              onClick={() => setInsightTab('summary')}
              type="button"
            >
              Summary
            </button>
          )}
          {chapters.length > 0 && (
            <button
              className={insightTab === 'chapters' ? 'active' : ''}
              onClick={() => setInsightTab('chapters')}
              type="button"
            >
              Smart Chapters
            </button>
          )}
          {transcript.length > 0 && (
            <button
              className={insightTab === 'transcript' ? 'active' : ''}
              onClick={() => setInsightTab('transcript')}
              type="button"
            >
              Transcript
            </button>
          )}
        </div>

        {insightTab === 'summary' && insightLecture.zoomSummary && (
          <section className="recorded-player-summary recorded-insight-panel">
            <p>{insightLecture.zoomSummary}</p>
          </section>
        )}

        {insightTab === 'chapters' && chapters.length > 0 && (
          <section className="recorded-player-chapters recorded-insight-panel">
            <div className="recorded-chapter-list">
              {chapters.map((chapter, index) => (
                <button
                  key={`${chapter.start}-${index}`}
                  className={`recorded-chapter-card ${Math.floor(chapter.start) === zoomStartTime ? 'active' : ''}`}
                  onClick={() => startPlayback(chapter.start)}
                  type="button"
                >
                  <span>From {formatPlaybackPosition(chapter.start)}</span>
                  <strong>{chapter.title}</strong>
                  {chapter.text && <small>{chapter.text}</small>}
                </button>
              ))}
            </div>
          </section>
        )}

        {insightTab === 'transcript' && transcript.length > 0 && (
          <section className="recorded-transcript-panel recorded-insight-panel">
            <div className="recorded-transcript-list">
              {transcript.slice(0, 180).map((item, index) => (
                <button
                  key={`${item.start}-${index}`}
                  className={`recorded-transcript-row ${Math.floor(item.start) === zoomStartTime ? 'active' : ''}`}
                  onClick={() => startPlayback(item.start)}
                  type="button"
                >
                  <span>{formatPlaybackPosition(item.start)}</span>
                  <p>{item.text}</p>
                </button>
              ))}
            </div>
          </section>
        )}
      </div>
    );
  };

  if (!isFoundationZoom && isZoomRecording && (lecture.recordingStatus !== 'available' || lecture.isPlayable !== true)) {
    return (
      <div className="recorded-player-empty">
        Zoom recording is still processing. It will appear here automatically when Zoom finishes.
      </div>
    );
  }

  if (usesProtectedStream && !streamToken) {
    return (
      <div className="recorded-player-empty">
        {streamError || `${preparingMessage}${prepareSeconds >= 3 ? ` (${prepareSeconds}s)` : ''}`}
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
      <>
        <div className="recorded-player protected-player" onContextMenu={(event) => event.preventDefault()}>
          {videoError && (
            <div className="recorded-player-error">
              {videoError}
            </div>
          )}
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
            onLoadedMetadata={() => setVideoError('')}
            onError={() => setVideoError(isFoundationZoom
              ? 'Zoom playback could not start yet. Please close and reopen this video once.'
              : 'This recording could not be loaded. Please refresh and try again.')}
            onPause={() => {
              const video = videoRef.current;
              if (video && !video.ended) savePosition(video.currentTime);
            }}
            onEnded={() => savePosition(0, true)}
          >
            <source src={videoUrl} type={usesProtectedStream || isFoundationZoom ? 'video/mp4' : undefined} />
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
        {renderZoomInsights()}
      </>
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
