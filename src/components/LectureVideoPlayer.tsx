import React, { useState } from 'react';
import { Play, ExternalLink, Video, AlertCircle, Sparkles } from 'lucide-react';

interface LectureVideoPlayerProps {
  videoUrl: string;
  title?: string;
  className?: string;
  autoPlay?: boolean;
}

export function parseVideoUrl(url: string): {
  type: 'youtube' | 'direct_video' | 'link';
  embedUrl?: string;
  rawUrl: string;
} {
  if (!url) return { type: 'link', rawUrl: '' };
  const trimmed = url.trim();

  // YouTube formats:
  // https://www.youtube.com/watch?v=dQw4w9WgXcQ
  // https://youtu.be/dQw4w9WgXcQ
  // https://www.youtube.com/shorts/dQw4w9WgXcQ
  // https://www.youtube.com/embed/dQw4w9WgXcQ
  const ytMatch = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/i
  );
  if (ytMatch && ytMatch[1]) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?rel=0&modestbranding=1`,
      rawUrl: trimmed,
    };
  }

  // Direct video file / Data URL / Blob
  if (
    trimmed.startsWith('data:video') ||
    trimmed.startsWith('blob:') ||
    /\.(mp4|webm|ogg|mov)(\?.*)?$/i.test(trimmed)
  ) {
    return {
      type: 'direct_video',
      embedUrl: trimmed,
      rawUrl: trimmed,
    };
  }

  return {
    type: 'link',
    embedUrl: trimmed,
    rawUrl: trimmed,
  };
}

export const LectureVideoPlayer: React.FC<LectureVideoPlayerProps> = ({
  videoUrl,
  title = '선생님 인강 동영상 해설',
  className = '',
}) => {
  const [loadError, setLoadError] = useState(false);
  const parsed = parseVideoUrl(videoUrl);

  if (!videoUrl || !videoUrl.trim()) return null;

  return (
    <div
      className={`rounded-3xl overflow-hidden border-2 border-amber-300 bg-slate-900 shadow-md ${className}`}
    >
      {/* Top Banner Bar */}
      <div className="px-4 py-2.5 bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-white/20 flex items-center justify-center">
            <Video className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-xs sm:text-sm font-black tracking-tight">{title}</span>
        </div>

        <a
          href={parsed.rawUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2.5 py-1 rounded-lg bg-black/20 hover:bg-black/30 active:scale-95 text-white text-[11px] font-bold flex items-center gap-1 transition-all"
          title="새 탭에서 동영상 열기"
        >
          <span>새 창으로 열기</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {/* Video Content */}
      <div className="relative w-full aspect-video bg-black flex items-center justify-center">
        {parsed.type === 'youtube' && parsed.embedUrl && !loadError ? (
          <iframe
            src={parsed.embedUrl}
            title={title}
            className="w-full h-full border-0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
            onError={() => setLoadError(true)}
          />
        ) : parsed.type === 'direct_video' && parsed.embedUrl && !loadError ? (
          <video
            src={parsed.embedUrl}
            controls
            playsInline
            controlsList="nodownload"
            className="w-full h-full object-contain"
            onError={() => setLoadError(true)}
          />
        ) : (
          <div className="p-6 text-center text-white flex flex-col items-center justify-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-400/40 text-amber-400 flex items-center justify-center text-2xl">
              🎬
            </div>
            <div>
              <p className="text-sm font-bold text-slate-200">외부 인강 동영상 링크</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm truncate">{parsed.rawUrl}</p>
            </div>
            <a
              href={parsed.rawUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 text-white text-xs font-black rounded-xl shadow-md flex items-center gap-1.5 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>인강 동영상 보러가기</span>
            </a>
          </div>
        )}
      </div>

      {/* Bottom Sub-bar */}
      <div className="px-4 py-2 bg-slate-950/80 text-[11px] font-medium text-slate-400 flex items-center justify-between">
        <span className="flex items-center gap-1 text-amber-300 font-bold">
          <Sparkles className="w-3 h-3 text-amber-400" />
          언제든 반복 재생하며 인강 풀이를 확인할 수 있습니다
        </span>
        <span className="text-[10px] text-slate-400">
          {parsed.type === 'youtube'
            ? 'YouTube HD'
            : parsed.type === 'direct_video'
            ? '동영상 플레이어'
            : '웹 링크'}
        </span>
      </div>
    </div>
  );
};

export default LectureVideoPlayer;
