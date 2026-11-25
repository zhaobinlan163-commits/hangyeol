import type { SubtitleCue } from '../types/learning';

export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const url = new URL(withProtocol);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();

    if (host === 'youtu.be') {
      const candidate = url.pathname.replace(/^\//, '').split('/')[0];
      return /^[a-zA-Z0-9_-]{11}$/.test(candidate) ? candidate : null;
    }

    if (host === 'youtube.com' || host === 'm.youtube.com' || host === 'music.youtube.com') {
      const vParam = url.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
        return vParam;
      }
      const pathMatch = url.pathname.match(/^\/(?:embed|shorts|live)\/([a-zA-Z0-9_-]{11})/);
      if (pathMatch) {
        return pathMatch[1];
      }
    }
  } catch {
    return null;
  }

  return null;
}

export function formatSeconds(totalSec: number): string {
  const safe = Math.max(0, Math.floor(totalSec));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseTimestampToSeconds(ts: string): number | null {
  // Handle VTT trailing settings like "00:00:05.000 align:start position:0%"
  const firstToken = ts.trim().split(/\s+/)[0] || '';
  const clean = firstToken.replace(',', '.');
  const parts = clean.split(':').map((p) => Number(p));
  if (parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) {
    return Math.floor(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  }
  if (parts.length === 2) {
    return Math.floor(parts[0] * 60 + parts[1]);
  }
  return null;
}

function stripVttInlineTags(line: string): string {
  return line
    .replace(/<\d{2}:\d{2}(?::\d{2})?[.,]\d{3}>/g, '')
    .replace(/<\/?[^>]+(>|$)/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses WebVTT (.vtt), SRT (.srt), YouTube Transcript "[00:12] 한국어" lines, or plain multi-line Korean transcripts into SubtitleCues.
 */
export function parseTranscriptText(rawText: string): SubtitleCue[] {
  const text = rawText
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n')
    .trim();
  if (!text) return [];

  // Format A: SRT or WebVTT blocks containing "-->"
  if (text.includes('-->')) {
    const blocks = text.split(/\n\s*\n/);
    const cues: SubtitleCue[] = [];
    for (let i = 0; i < blocks.length; i++) {
      const lines = blocks[i].split('\n').map((l) => l.trim()).filter(Boolean);
      if (lines.length === 0) continue;
      if (lines[0].startsWith('WEBVTT') || lines[0].startsWith('NOTE') || lines[0].startsWith('STYLE')) {
        const timeIdx = lines.findIndex((l) => l.includes('-->'));
        if (timeIdx === -1) continue;
      }
      const timeLineIdx = lines.findIndex((l) => l.includes('-->'));
      if (timeLineIdx === -1) continue;
      const [startRaw, endRaw] = lines[timeLineIdx].split('-->');
      const startSec = parseTimestampToSeconds(startRaw) ?? i * 5;
      const endSec = parseTimestampToSeconds(endRaw) ?? startSec + 4;
      const contentLines = lines
        .slice(timeLineIdx + 1)
        .map(stripVttInlineTags)
        .filter(Boolean);
      if (contentLines.length === 0) continue;

      const korean = contentLines[0];
      const chinese = contentLines[1] || '';
      const prev = cues[cues.length - 1];
      if (prev && prev.korean === korean) {
        prev.endSec = Math.max(prev.endSec, endSec);
        continue;
      }

      cues.push({
        id: `srt-${i}-${startSec}`,
        startSec,
        endSec: Math.max(endSec, startSec + 1),
        korean,
        chinese,
      });
    }
    if (cues.length > 0) return cues;
  }

  // Format B: YouTube Copy-Paste Transcript ("0:12" on its own line followed by text, OR "[00:12] text")
  const rawLines = text
    .split('\n')
    .map((l) => stripVttInlineTags(l))
    .filter((l) => l && !/^WEBVTT$/i.test(l) && !/^Kind:/i.test(l) && !/^Language:/i.test(l));
  const cues: SubtitleCue[] = [];
  let pendingTimestamp: number | null = null;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    const standaloneTs = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?$/);
    if (standaloneTs) {
      pendingTimestamp = parseTimestampToSeconds(standaloneTs[1]);
      continue;
    }

    const match = line.match(/^\[?(\d{1,2}:\d{2}(?::\d{2})?)\]?\s+(.+)$/);
    if (match) {
      const startSec = parseTimestampToSeconds(match[1]) ?? i * 5;
      pendingTimestamp = null;
      cues.push({
        id: `line-${i}-${startSec}`,
        startSec,
        endSec: startSec + 5,
        korean: match[2].trim(),
        chinese: '',
      });
    } else {
      const startSec = pendingTimestamp ?? i * 5;
      pendingTimestamp = null;
      cues.push({
        id: `plain-${i}-${startSec}`,
        startSec,
        endSec: startSec + 5,
        korean: line,
        chinese: '',
      });
    }
  }
  return cues;
}

export function normalizeKoreanInput(value: string): string {
  return value.trim().replace(/\s+/g, ' ').replace(/[.?!~。？！]+$/g, '');
}

export function containsHangul(value: string): boolean {
  return /[\uAC00-\uD7A3\u1100-\u11FF\u3130-\u318F]/.test(value);
}

export function getTodayDateKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}
