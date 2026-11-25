import { useCallback, useRef, useState } from 'react';
import { safeFetchJson } from '../utils/api';

interface AudioCacheEntry {
  rawBuffer: ArrayBuffer;
  mimeType: string;
  engine: 'standard-ko';
}

const audioCache = new Map<string, AudioCacheEntry>();

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export function useKoreanAudio() {
  const [playingKey, setPlayingKey] = useState<string | null>(null);
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [audioError, setAudioError] = useState<string | null>(null);
  const [audioNotice, setAudioNotice] = useState<string | null>(null);
  const [audioEngine, setAudioEngine] = useState<'standard-ko'>('standard-ko');

  const audioCtxRef = useRef<AudioContext | null>(null);
  const activeSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const activeHtmlAudioRef = useRef<HTMLAudioElement | null>(null);
  const activeObjectUrlRef = useRef<string | null>(null);

  const ensureUnlockedAudioContext = useCallback((): AudioContext | null => {
    if (typeof window === 'undefined') return null;
    const AudioCtxCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtxCtor) return null;

    if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
      audioCtxRef.current = new AudioCtxCtor();
    }
    if (audioCtxRef.current.state === 'suspended') {
      // Called synchronously inside the user's click gesture to unlock iframe autoplay
      audioCtxRef.current.resume().catch(() => {});
    }
    return audioCtxRef.current;
  }, []);

  const stopAudio = useCallback(() => {
    if (activeSourceRef.current) {
      try {
        activeSourceRef.current.onended = null;
        activeSourceRef.current.stop();
        activeSourceRef.current.disconnect();
      } catch {
        // Ignore already-stopped source
      }
      activeSourceRef.current = null;
    }
    if (activeHtmlAudioRef.current) {
      try {
        activeHtmlAudioRef.current.pause();
        activeHtmlAudioRef.current.currentTime = 0;
      } catch {
        // Ignore pause error
      }
      activeHtmlAudioRef.current = null;
    }
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
    setPlayingKey(null);
  }, []);

  const playWithHtmlAudio = useCallback(
    async (rawBuffer: ArrayBuffer, mimeType: string, key: string) => {
      const blob = new Blob([rawBuffer.slice(0)], { type: mimeType || 'audio/mpeg' });
      const url = URL.createObjectURL(blob);
      activeObjectUrlRef.current = url;
      const audio = new Audio(url);
      activeHtmlAudioRef.current = audio;
      audio.onended = () => {
        setPlayingKey((current) => (current === key ? null : current));
        activeHtmlAudioRef.current = null;
        if (activeObjectUrlRef.current === url) {
          URL.revokeObjectURL(url);
          activeObjectUrlRef.current = null;
        }
      };
      audio.onerror = () => {
        setPlayingKey((current) => (current === key ? null : current));
        activeHtmlAudioRef.current = null;
        setAudioError('音频解码失败，请重试。');
      };
      await audio.play();
    },
    []
  );

  const speakKorean = useCallback(
    async (text: string, options?: { slow?: boolean; voiceName?: string }) => {
      const cleaned = text.trim();
      if (!cleaned) return;
      const slow = Boolean(options?.slow);
      const voiceName = options?.voiceName || 'Kore';
      const key = `${cleaned}::${slow ? 'slow' : 'normal'}::${voiceName}`;

      if (playingKey === key) {
        stopAudio();
        return;
      }

      // Unlock AudioContext synchronously within the click gesture BEFORE any await
      const ctx = ensureUnlockedAudioContext();
      stopAudio();
      setAudioError(null);

      try {
        let entry = audioCache.get(key);
        if (!entry) {
          setLoadingKey(key);
          const data = await safeFetchJson<{
            audioBase64?: string;
            mimeType?: string;
            engine?: 'standard-ko';
          }>(
            '/api/tts',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: cleaned, slow, voiceName }),
            },
            '韩语发音生成失败'
          );

          if (!data.audioBase64) {
            throw new Error('韩语发音生成失败，请重试。');
          }

          entry = {
            rawBuffer: base64ToArrayBuffer(data.audioBase64),
            mimeType: data.mimeType || 'audio/mpeg',
            engine: 'standard-ko',
          };
          audioCache.set(key, entry);
        }

        setLoadingKey(null);
        setPlayingKey(key);
        setAudioEngine(entry.engine);

        // Primary path: Web Audio API decodeAudioData on unlocked AudioContext (works reliably inside iframes)
        if (ctx) {
          try {
            if (ctx.state === 'suspended') {
              await ctx.resume();
            }
            const decoded = await ctx.decodeAudioData(entry.rawBuffer.slice(0));
            const source = ctx.createBufferSource();
            source.buffer = decoded;
            source.connect(ctx.destination);
            activeSourceRef.current = source;
            source.onended = () => {
              setPlayingKey((current) => (current === key ? null : current));
              if (activeSourceRef.current === source) {
                activeSourceRef.current = null;
              }
            };
            source.start(0);
            return;
          } catch {
            // Fall through to HTMLAudioElement playback
          }
        }

        await playWithHtmlAudio(entry.rawBuffer, entry.mimeType, key);
      } catch (err) {
        setLoadingKey(null);
        setPlayingKey(null);
        setAudioError(err instanceof Error ? err.message : '韩语发音播放失败，请检查网络连接或浏览器音量设置。');
      }
    },
    [playingKey, ensureUnlockedAudioContext, stopAudio, playWithHtmlAudio]
  );

  const retryCloudTts = useCallback(() => {
    audioCache.clear();
    setAudioNotice(null);
    setAudioError(null);
  }, []);

  const isKeyPlaying = useCallback(
    (text: string, slow = false, voiceName = 'Kore') =>
      playingKey === `${text.trim()}::${slow ? 'slow' : 'normal'}::${voiceName}`,
    [playingKey]
  );

  const isKeyLoading = useCallback(
    (text: string, slow = false, voiceName = 'Kore') =>
      loadingKey === `${text.trim()}::${slow ? 'slow' : 'normal'}::${voiceName}`,
    [loadingKey]
  );

  return {
    speakKorean,
    stopAudio,
    isKeyPlaying,
    isKeyLoading,
    audioEngine,
    audioNotice,
    clearAudioNotice: () => setAudioNotice(null),
    retryCloudTts,
    audioError,
    clearAudioError: () => setAudioError(null),
  };
}
