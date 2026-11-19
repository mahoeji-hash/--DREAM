import React, { useState } from 'react';
import { PlayCircle, ExternalLink, Video, AlertCircle } from 'lucide-react';

interface VideoLectureEmbedProps {
  videoUrl: string;
  title?: string;
  compact?: boolean;
  className?: string;
}

export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();

  // 1. youtu.be/<id>
  const shortMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch && shortMatch[1]) return shortMatch[1];

  // 2. youtube.com/watch?v=<id>
  const watchMatch = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  // 3. youtube.com/embed/<id>
  const embedMatch = cleanUrl.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) return embedMatch[1];

  // 4. youtube.com/shorts/<id>
  const shortsMatch = cleanUrl.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

  // 5. youtube.com/live/<id>
  const liveMatch = cleanUrl.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
  if (liveMatch && liveMatch[1]) return liveMatch[1];

  return null;
}

export function isDirectVideoUrl(url: string): boolean {
  if (!url) return false;
  const clean = url.trim().toLowerCase();
  return (
    clean.endsWith('.mp4') ||
    clean.endsWith('.webm') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.mov') ||
    clean.startsWith('data:video/') ||
    clean.startsWith('blob:')
  );
}

export const VideoLectureEmbed: React.FC<VideoLectureEmbedProps> = ({
  videoUrl,
  title = '선생님의 인강 / 해설 동영상',
  compact = false,
  className = '',
}) => {
  const [loadError, setLoadError] = useState(false);

  if (!videoUrl || !videoUrl.trim()) {
    return null;
  }

  const trimmedUrl = videoUrl.trim();
  const ytId = extractYouTubeId(trimmedUrl);
  const isDirect = isDirectVideoUrl(trimmedUrl);

  return (
    <div
      className={`rounded-2xl sm:rounded-3xl border-2 border-amber-300 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-white p-3 sm:p-4 shadow-sm overflow-hidden ${className}`}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between gap-2 mb-2.5 sm:mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-xs">
            <PlayCircle className="w-4 h-4 fill-white/20 text-white" />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 block">
              {ytId ? 'YouTube 인강 강의' : isDirect ? '동영상 강의' : '인강 해설'}
            </span>
            <h4 className="text-xs sm:text-sm font-black text-slate-900 tracking-tight">
              {title}
            </h4>
          </div>
        </div>

        <a
          href={trimmedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-amber-50 text-amber-900 border border-amber-300 text-[11px] font-black flex items-center gap-1 shadow-2xs transition-colors shrink-0 active:scale-95"
          title="새 창에서 영상 원본 열기"
        >
          <span>새 탭에서 보기</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Video Content */}
      <div className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden bg-slate-950 aspect-video shadow-md border border-amber-200/60 flex items-center justify-center">
        {ytId ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${ytId}?rel=0&modestbranding=1&playsinline=1`}
            title={title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            className="w-full h-full border-0 rounded-xl sm:rounded-2xl"
          />
        ) : isDirect ? (
          <video
            src={trimmedUrl}
            controls
            playsInline
            onError={() => setLoadError(true)}
            className="w-full h-full object-contain rounded-xl sm:rounded-2xl"
          >
            해당 브라우저에서 동영상을 재생할 수 없습니다.
          </video>
        ) : loadError ? (
          <div className="p-4 text-center text-white">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto mb-2" />
            <p className="text-xs font-bold text-slate-200">
              동영상을 직접 임베드할 수 없습니다.
            </p>
            <a
              href={trimmedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-black"
            >
              링크로 직접 이동하여 시청하기 <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        ) : (
          <iframe
            src={trimmedUrl}
            title={title}
            onError={() => setLoadError(true)}
            sandbox="allow-scripts allow-same-origin allow-presentation"
            className="w-full h-full border-0 rounded-xl sm:rounded-2xl"
          />
        )}
      </div>
    </div>
  );
};

export default VideoLectureEmbed;
