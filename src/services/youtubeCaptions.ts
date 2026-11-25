import type { SubtitleCue } from '../types/learning.ts';

export interface YouTubeCaptionTrack {
  baseUrl: string;
  vssId?: string;
  languageCode?: string;
  kind?: string;
  name?: { simpleText?: string; runs?: Array<{ text?: string }> };
}

export interface YouTubeCaptionsResult {
  videoId: string;
  found: boolean;
  trackLanguage: string;
  trackName: string;
  cues: SubtitleCue[];
  message: string;
}

function extractBalancedArray(raw: string, openIdx: number): string | null {
  if (openIdx < 0 || raw[openIdx] !== '[') return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = openIdx; i < raw.length; i++) {
    const ch = raw[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
    } else if (ch === '[') {
      depth += 1;
    } else if (ch === ']') {
      depth -= 1;
      if (depth === 0) {
        return raw.slice(openIdx, i + 1);
      }
    }
  }
  return null;
}

export function extractYouTubeCaptionTracksFromHtml(html: string): YouTubeCaptionTrack[] {
  const marker = '"captionTracks":';
  const idx = html.indexOf(marker);
  if (idx === -1) return [];
  const arrStart = html.indexOf('[', idx + marker.length);
  if (arrStart === -1) return [];
  const arrayJson = extractBalancedArray(html, arrStart);
  if (!arrayJson) return [];
  try {
    const parsed = JSON.parse(arrayJson);
    return Array.isArray(parsed) ? (parsed as YouTubeCaptionTrack[]) : [];
  } catch {
    return [];
  }
}

export function pickPreferredKoreanTrack(tracks: YouTubeCaptionTrack[]): YouTubeCaptionTrack | null {
  if (tracks.length === 0) return null;
  // Priority: manual Korean (.ko) -> Korean languageCode without asr -> auto-generated Korean (a.ko) -> any ko-* -> first track
  const manualKo = tracks.find(
    (t) => t.vssId === '.ko' || (t.languageCode?.startsWith('ko') && t.kind !== 'asr')
  );
  if (manualKo) return manualKo;

  const autoKo = tracks.find(
    (t) => t.vssId === 'a.ko' || t.languageCode?.startsWith('ko')
  );
  if (autoKo) return autoKo;

  return tracks[0];
}

export function isAllowedYouTubeCaptionUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host.endsWith('.googlevideo.com')
    );
  } catch {
    return false;
  }
}

export function parseYouTubeJson3Events(payload: unknown): SubtitleCue[] {
  const obj = (payload && typeof payload === 'object' ? payload : {}) as {
    events?: Array<{
      tStartMs?: number;
      dDurationMs?: number;
      segs?: Array<{ utf8?: string }>;
    }>;
  };
  const events = Array.isArray(obj.events) ? obj.events : [];
  const cues: SubtitleCue[] = [];

  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (!ev || !Array.isArray(ev.segs)) continue;
    const text = ev.segs
      .map((s) => (typeof s?.utf8 === 'string' ? s.utf8 : ''))
      .join('')
      .replace(/\s+/g, ' ')
      .trim();

    if (!text || text === '\n') continue;

    const startSec = Math.max(0, Math.floor((ev.tStartMs ?? 0) / 1000));
    const durSec = Math.max(2, Math.ceil((ev.dDurationMs ?? 3000) / 1000));
    const prev = cues[cues.length - 1];
    if (prev && prev.korean === text) {
      continue;
    }

    cues.push({
      id: `yt-${i}-${startSec}`,
      startSec,
      endSec: startSec + durSec,
      korean: text,
      chinese: '',
    });

    if (cues.length >= 300) break;
  }

  return cues;
}

export async function fetchYouTubeKoreanCaptions(videoId: string): Promise<YouTubeCaptionsResult> {
  if (!/^[a-zA-Z0-9_-]{11}$/.test(videoId)) {
    return {
      videoId,
      found: false,
      trackLanguage: '',
      trackName: '',
      cues: [],
      message: '无效的 YouTube 视频 ID。',
    };
  }

  try {
    const watchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=ko`;
    const watchResp = await fetch(watchUrl, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
        'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!watchResp.ok) {
      return {
        videoId,
        found: false,
        trackLanguage: '',
        trackName: '',
        cues: [],
        message: '未能从 YouTube 自动获取字幕，请使用下方“导入字幕”粘贴文字转写或上传 .srt/.vtt 文件。',
      };
    }

    const html = await watchResp.text();
    const tracks = extractYouTubeCaptionTracksFromHtml(html);
    const preferred = pickPreferredKoreanTrack(tracks);

    if (!preferred || !preferred.baseUrl || !isAllowedYouTubeCaptionUrl(preferred.baseUrl)) {
      return {
        videoId,
        found: false,
        trackLanguage: '',
        trackName: '',
        cues: [],
        message: '该视频暂未检测到可自动抓取的公开字幕轨，请参考下方 3 步指引复制 YouTube 字幕或上传 .srt/.vtt 文件。',
      };
    }

    const trackUrl = new URL(preferred.baseUrl);
    trackUrl.searchParams.set('fmt', 'json3');

    const captionResp = await fetch(trackUrl.toString(), {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(8000),
    });

    if (!captionResp.ok) {
      return {
        videoId,
        found: false,
        trackLanguage: preferred.languageCode || '',
        trackName: preferred.name?.simpleText || preferred.name?.runs?.[0]?.text || '',
        cues: [],
        message: 'YouTube 字幕轨下载受限，请复制视频页面“显示内容转写”文本粘贴导入。',
      };
    }

    const json3 = await captionResp.json();
    const cues = parseYouTubeJson3Events(json3);
    const trackName =
      preferred.name?.simpleText ||
      preferred.name?.runs?.map((r) => r.text || '').join('') ||
      preferred.languageCode ||
      '字幕';

    if (cues.length === 0) {
      return {
        videoId,
        found: false,
        trackLanguage: preferred.languageCode || '',
        trackName,
        cues: [],
        message: '字幕内容为空，请手动复制或上传 .srt/.vtt 字幕文件。',
      };
    }

    return {
      videoId,
      found: true,
      trackLanguage: preferred.languageCode || '',
      trackName,
      cues,
      message: `已自动导入 ${cues.length} 条 YouTube 字幕（${trackName}）`,
    };
  } catch {
    return {
      videoId,
      found: false,
      trackLanguage: '',
      trackName: '',
      cues: [],
      message: '自动抓取 YouTube 字幕超时或受限，请按下方 3 步复制“内容转写”或上传 .srt/.vtt 文件导入。',
    };
  }
}
