interface RecordedLectureLike {
  _id?: string;
  title: string;
  videoUrl: string;
  videoType: string;
  recordingSource?: string;
  recordingStatus?: string;
  isPlayable?: boolean;
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

const getProtectedStreamUrl = (lectureId: string) => {
  const token = localStorage.getItem('brit_token') || '';
  return `${API_URL}/recorded/${lectureId}/stream?token=${encodeURIComponent(token)}`;
};

const getEmbedUrl = (lecture: RecordedLectureLike) => {
  const url = lecture.videoUrl.trim();
  const youtubeId = getYouTubeId(url);

  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}?autoplay=1&modestbranding=1`;
  if (lecture.videoType === 'drive' || /drive\.google\.com/i.test(url)) return getDrivePreviewUrl(url);
  if (isZoomUrl(url)) return getZoomWebUrl(url);
  return url;
};

export default function RecordedLecturePlayer({ lecture }: RecordedLecturePlayerProps) {
  const isZoomRecording = lecture.recordingSource === 'zoom' || lecture.videoType === 'zoom';
  const videoUrl = isZoomRecording && lecture._id
    ? getProtectedStreamUrl(lecture._id)
    : lecture.videoUrl.trim();
  const embedUrl = getEmbedUrl(lecture);

  if (isZoomRecording && (lecture.recordingStatus !== 'available' || lecture.isPlayable !== true)) {
    return (
      <div className="recorded-player-empty">
        Zoom recording is still processing. It will appear here automatically when Zoom finishes.
      </div>
    );
  }

  if (!videoUrl) {
    return (
      <div className="recorded-player-empty">
        Recording link is not available yet.
      </div>
    );
  }

  if (isZoomRecording || isDirectVideoUrl(videoUrl)) {
    return (
      <div className="recorded-player">
        <video className="recorded-player-video" controls preload="metadata" title={lecture.title}>
          <source src={videoUrl} type={isZoomRecording ? 'video/mp4' : undefined} />
        </video>
      </div>
    );
  }

  return (
    <div className="recorded-player">
      <iframe
        className="recorded-player-frame"
        src={embedUrl}
        title={lecture.title}
        allow="autoplay; fullscreen; picture-in-picture; clipboard-write; encrypted-media"
        allowFullScreen
      />
    </div>
  );
}
