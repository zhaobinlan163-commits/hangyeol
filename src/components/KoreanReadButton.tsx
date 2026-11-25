import { Loader2, Volume2 } from 'lucide-react';

interface KoreanReadButtonProps {
  text: string;
  speakKorean: (text: string, opts?: { slow?: boolean }) => Promise<void>;
  isKeyLoading?: (text: string, slow?: boolean) => boolean;
  isKeyPlaying?: (text: string, slow?: boolean) => boolean;
  showSlow?: boolean;
  compact?: boolean;
  label?: string;
}

export function KoreanReadButton({
  text,
  speakKorean,
  isKeyLoading,
  isKeyPlaying,
  showSlow = false,
  compact = false,
  label = '朗读',
}: KoreanReadButtonProps) {
  const cleaned = text.trim();
  if (!cleaned) return null;

  const loadingNormal = isKeyLoading ? isKeyLoading(cleaned, false) : false;
  const playingNormal = isKeyPlaying ? isKeyPlaying(cleaned, false) : false;
  const loadingSlow = isKeyLoading ? isKeyLoading(cleaned, true) : false;
  const playingSlow = isKeyPlaying ? isKeyPlaying(cleaned, true) : false;

  return (
    <span className="inline-flex items-center gap-1 shrink-0">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void speakKorean(cleaned, { slow: false });
        }}
        aria-label={`朗读韩语：${cleaned}`}
        className={`inline-flex items-center gap-1 font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
          compact
            ? 'px-2 py-1 text-[11px] text-blue-700 bg-blue-50 hover:bg-blue-100'
            : 'px-2.5 py-1.5 text-xs text-blue-700 bg-blue-50 hover:bg-blue-100'
        }`}
      >
        {loadingNormal ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
        ) : (
          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
        )}
        <span>{playingNormal ? '播放中' : label}</span>
      </button>

      {showSlow && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            void speakKorean(cleaned, { slow: true });
          }}
          aria-label={`慢速跟读韩语：${cleaned}`}
          className={`inline-flex items-center gap-1 font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            compact
              ? 'px-2 py-1 text-[11px] text-slate-700 bg-slate-100 hover:bg-slate-200'
              : 'px-2.5 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-slate-200'
          }`}
        >
          {loadingSlow ? (
            <Loader2 className="w-3 h-3 animate-spin" aria-hidden="true" />
          ) : null}
          <span>{playingSlow ? '慢读中' : '慢速'}</span>
        </button>
      )}
    </span>
  );
}
