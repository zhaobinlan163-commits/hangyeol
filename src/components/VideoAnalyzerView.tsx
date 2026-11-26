import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  FileText,
  Link2,
  Loader2,
  Mic,
  Pause,
  Play,
  Plus,
  Search,
  Square,
  Upload,
  Volume2,
} from 'lucide-react';
import { CURATED_VIDEO_LESSONS } from '../data/seedData';
import type { ParsedSentence, ParsedToken, SubtitleCue } from '../types/learning';
import { safeFetchJson } from '../utils/api';
import { extractYouTubeId, formatSeconds, parseTranscriptText } from '../utils/korean';
import { KoreanReadButton } from './KoreanReadButton';

interface VideoAnalyzerViewProps {
  speakKorean: (text: string, opts?: { slow?: boolean }) => Promise<void>;
  isKeyLoading: (text: string, slow?: boolean) => boolean;
  isKeyPlaying: (text: string, slow?: boolean) => boolean;
  hasWordInGarden: (word: string) => boolean;
  onAddTokenToGarden: (token: ParsedToken, sourceLabel: string) => boolean;
  onActivityComplete: (xp: number) => void;
}

export function VideoAnalyzerView({
  speakKorean,
  isKeyLoading,
  isKeyPlaying,
  hasWordInGarden,
  onAddTokenToGarden,
  onActivityComplete,
}: VideoAnalyzerViewProps) {
  // Active video lesson OR external YouTube video
  const [selectedLessonId, setSelectedLessonId] = useState<string>(CURATED_VIDEO_LESSONS[0].id);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState('');
  const [youtubeUrlError, setYoutubeUrlError] = useState<string | null>(null);
  const [externalVideo, setExternalVideo] = useState<{
    videoId: string;
    title: string;
    author: string;
    cues: SubtitleCue[];
  } | null>(null);

  // Curated interactive playback state
  const [importOpen, setImportOpen] = useState(false);
  const [lessonsOpen, setLessonsOpen] = useState<boolean>(() => {
    try {
      return window.matchMedia('(min-width: 1024px)').matches;
    } catch {
      return true;
    }
  });
  const [playerOpen, setPlayerOpen] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<0.75 | 1>(1);

  // Active subtitle cue & live parsed output
  const [activeCueId, setActiveCueId] = useState<string>(CURATED_VIDEO_LESSONS[0].cues[0].id);
  const [parsedResult, setParsedResult] = useState<ParsedSentence | null>(
    CURATED_VIDEO_LESSONS[0].cues[0].preParsed ?? null
  );
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState<string | null>(null);

  // Quick real-time sentence capture bar (paste any sentence from YouTube/Netflix/Bilibili)
  const [quickSentence, setQuickSentence] = useState('');
  const [quickSentenceError, setQuickSentenceError] = useState<string | null>(null);

  // Transcript / SRT / VTT import drawer
  const [showTranscriptImporter, setShowTranscriptImporter] = useState(false);
  const [transcriptDraft, setTranscriptDraft] = useState('');
  const [transcriptError, setTranscriptError] = useState<string | null>(null);
  const [isLoadingYouTube, setIsLoadingYouTube] = useState(false);
  const [captionNotice, setCaptionNotice] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Browser SpeechRecognition live Korean speech dictation -> parse via DeepSeek
  const [isListeningAudio, setIsListeningAudio] = useState(false);
  const recognitionRef = useRef<{
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => void) | null;
    onerror: (() => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  } | null>(null);

  const activeLesson =
    CURATED_VIDEO_LESSONS.find((l) => l.id === selectedLessonId) ?? CURATED_VIDEO_LESSONS[0];
  const activeCues = externalVideo ? externalVideo.cues : activeLesson.cues;
  const activeTitle = externalVideo ? externalVideo.title : activeLesson.title;

  // Simulated synchronized playback for curated Seoul video lessons
  useEffect(() => {
    if (!isPlaying || externalVideo) return;
    const stepMs = playbackRate === 0.75 ? 1333 : 1000;
    const timer = window.setInterval(() => {
      setCurrentTimeSec((prev) => {
        const next = prev + 1;
        if (next >= activeLesson.durationSec) {
          setIsPlaying(false);
          return 0;
        }
        return next;
      });
    }, stepMs);
    return () => window.clearInterval(timer);
  }, [isPlaying, externalVideo, playbackRate, activeLesson.durationSec]);

  // Auto-sync active subtitle cue as curated video plays
  useEffect(() => {
    if (externalVideo) return;
    const matched = activeLesson.cues.find(
      (c) => currentTimeSec >= c.startSec && currentTimeSec < c.endSec
    );
    if (matched && matched.id !== activeCueId) {
      setActiveCueId(matched.id);
      if (matched.preParsed) {
        setParsedResult(matched.preParsed);
        setParseError(null);
      }
    }
  }, [currentTimeSec, activeLesson, externalVideo, activeCueId]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
        recognitionRef.current = null;
      }
    };
  }, []);

  const parseSentenceLive = async (sentence: string, contextLine?: string) => {
    const cleaned = sentence.trim();
    if (!cleaned) return;
    setIsParsing(true);
    setParseError(null);
    try {
      const data = await safeFetchJson<ParsedSentence>(
        '/api/video/parse',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentence: cleaned,
            videoTitle: activeTitle,
            contextLine,
          }),
        },
        '韩语台词解析失败'
      );
      setParsedResult(data);
      onActivityComplete(10);
    } catch (err) {
      setParseError(err instanceof Error ? err.message : '韩语台词解析失败，请重试。');
    } finally {
      setIsParsing(false);
    }
  };

  const handleSelectCuratedLesson = (lessonId: string) => {
    const lesson = CURATED_VIDEO_LESSONS.find((l) => l.id === lessonId);
    if (!lesson) return;
    setExternalVideo(null);
    setSelectedLessonId(lesson.id);
    setIsPlaying(false);
    setCurrentTimeSec(0);
    setActiveCueId(lesson.cues[0].id);
    setParsedResult(lesson.cues[0].preParsed ?? null);
    setParseError(null);
  };

  const handleSelectCue = (cue: SubtitleCue) => {
    setActiveCueId(cue.id);
    setCurrentTimeSec(cue.startSec);
    setParseError(null);
    if (cue.preParsed) {
      setParsedResult(cue.preParsed);
    } else {
      void parseSentenceLive(cue.korean);
    }
  };

  const handleLoadYouTubeUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setYoutubeUrlError(null);
    setCaptionNotice(null);
    const videoId = extractYouTubeId(youtubeUrlInput);
    if (!videoId) {
      setYoutubeUrlError('请输入有效的 YouTube 链接（支持 youtube.com/watch?v=...、youtu.be/... 或 shorts 链接）。');
      return;
    }

    setIsPlaying(false);
    setIsLoadingYouTube(true);
    let title = `YouTube 视频 (${videoId})`;
    let author = 'YouTube 频道';
    let fetchedCues: SubtitleCue[] = [];
    let autoMessage = '';

    try {
      const [metaRes, capRes] = await Promise.allSettled([
        safeFetchJson<{ title?: string; author?: string }>(
          '/api/video/oembed',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId }),
          },
          '获取视频信息失败'
        ),
        safeFetchJson<{
          found?: boolean;
          cues?: SubtitleCue[];
          message?: string;
        }>(
          '/api/video/youtube-captions',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ videoId }),
          },
          '自动获取 YouTube 字幕失败'
        ),
      ]);

      if (metaRes.status === 'fulfilled') {
        if (metaRes.value.title) title = metaRes.value.title;
        if (metaRes.value.author) author = metaRes.value.author;
      }
      if (capRes.status === 'fulfilled') {
        fetchedCues = Array.isArray(capRes.value.cues) ? capRes.value.cues : [];
        autoMessage = capRes.value.message || '';
      }
    } finally {
      setIsLoadingYouTube(false);
    }

    setExternalVideo({
      videoId,
      title,
      author,
      cues: fetchedCues,
    });

    if (fetchedCues.length > 0) {
      setActiveCueId(fetchedCues[0].id);
      setCaptionNotice(autoMessage || `已自动导入 ${fetchedCues.length} 条 YouTube 字幕`);
      setShowTranscriptImporter(false);
      void parseSentenceLive(fetchedCues[0].korean);
    } else {
      setCaptionNotice(
        autoMessage ||
          '该视频未自动提取到公开韩语字幕，可按照下方 3 步复制 YouTube 转写或上传 .srt/.vtt 字幕文件。'
      );
      setShowTranscriptImporter(true);
    }
  };

  const applyImportedCues = (cues: SubtitleCue[], noticeText?: string) => {
    if (externalVideo) {
      setExternalVideo({ ...externalVideo, cues });
    } else {
      setExternalVideo({
        videoId: '',
        title: '自定义导入视频字幕',
        author: '外部视频伴学',
        cues,
      });
    }
    setActiveCueId(cues[0].id);
    setShowTranscriptImporter(false);
    setTranscriptDraft('');
    setCaptionNotice(noticeText || `已成功导入 ${cues.length} 条互动韩语字幕`);
    void parseSentenceLive(cues[0].korean);
  };

  const handleImportTranscript = (e: React.FormEvent) => {
    e.preventDefault();
    setTranscriptError(null);
    const cues = parseTranscriptText(transcriptDraft);
    if (cues.length === 0) {
      setTranscriptError('请粘贴至少一行韩语字幕、SRT/VTT 时间轴或 YouTube 内容转写文本。');
      return;
    }
    applyImportedCues(cues);
  };

  const handleSubtitleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setTranscriptError(null);
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const cues = parseTranscriptText(text);
      if (cues.length === 0) {
        setTranscriptError(`未能从「${file.name}」解析出有效字幕，请确认文件为 UTF-8 编码的 .srt / .vtt / .txt。`);
        return;
      }
      applyImportedCues(cues, `已从文件「${file.name}」导入 ${cues.length} 条字幕`);
    } catch {
      setTranscriptError('读取字幕文件失败，请重试。');
    }
  };

  const handleQuickParseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setQuickSentenceError(null);
    if (!quickSentence.trim()) {
      setQuickSentenceError('请贴入或输入一句视频里出现的韩语台词。');
      return;
    }
    void parseSentenceLive(quickSentence.trim());
  };

  const toggleAudioCapture = () => {
    setParseError(null);
    setQuickSentenceError(null);
    if (isListeningAudio) {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // Ignore
        }
        recognitionRef.current = null;
      }
      setIsListeningAudio(false);
      return;
    }

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => NonNullable<typeof recognitionRef.current> })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => NonNullable<typeof recognitionRef.current> })
        .webkitSpeechRecognition;

    if (!SpeechRec) {
      setQuickSentenceError(
        '当前浏览器不支持实时语音识别（推荐 Chrome/Edge），请直接粘贴 YouTube 字幕行或上传 .srt/.vtt 字幕文件。'
      );
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = 'ko-KR';
      rec.continuous = false;
      rec.interimResults = true;
      let latestTranscript = '';
      rec.onresult = (ev) => {
        const chunks: string[] = [];
        for (let i = 0; i < ev.results.length; i++) {
          chunks.push(ev.results[i][0].transcript);
        }
        latestTranscript = chunks.join(' ').trim();
        if (latestTranscript) {
          setQuickSentence(latestTranscript);
        }
      };
      rec.onerror = () => {
        setIsListeningAudio(false);
        setQuickSentenceError('语音识别未成功开启，请检查麦克风权限或直接输入韩语句子。');
      };
      rec.onend = () => {
        setIsListeningAudio(false);
        recognitionRef.current = null;
        if (latestTranscript.trim()) {
          void parseSentenceLive(latestTranscript.trim());
        }
      };
      rec.start();
      recognitionRef.current = rec;
      setIsListeningAudio(true);
    } catch {
      setIsListeningAudio(false);
      setQuickSentenceError('无法开启浏览器语音识别，请直接粘贴韩语字幕行解析。');
    }
  };

  const activeCue = activeCues.find((c) => c.id === activeCueId) ?? activeCues[0] ?? null;

  return (
    <div className="space-y-6">
      {/* 导入：默认收起，进来先看播放器 */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setImportOpen((v) => !v)}
          aria-expanded={importOpen}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg cursor-pointer"
        >
          导入
          <span className="text-slate-400">{importOpen ? '收起' : '展开'}</span>
        </button>
      </div>

      {importOpen && (
        <>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              视频辅助伴学
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setShowTranscriptImporter((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap shrink-0 self-start lg:self-auto cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" aria-hidden="true" />
            {showTranscriptImporter ? '收起字幕导入' : '导入 SRT / 视频字幕'}
          </button>
        </div>

        {/* YouTube Link + Instant Sentence Capture Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
          <form onSubmit={handleLoadYouTubeUrl} className="space-y-1">
            <label htmlFor="youtube-url-input" className="block text-xs font-medium text-slate-600">
              加载任意 YouTube 视频链接
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Link2
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="youtube-url-input"
                  type="text"
                  value={youtubeUrlInput}
                  onChange={(e) => {
                    setYoutubeUrlInput(e.target.value);
                    if (youtubeUrlError) setYoutubeUrlError(null);
                  }}
                  placeholder="粘贴 https://www.youtube.com/watch?v=..."
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>
              <button
                type="submit"
                disabled={isLoadingYouTube}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
              >
                {isLoadingYouTube && <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />}
                {isLoadingYouTube ? '载入中…' : '载入播放器与字幕'}
              </button>
            </div>
            {youtubeUrlError && (
              <p role="alert" className="text-xs text-rose-600">
                {youtubeUrlError}
              </p>
            )}
          </form>

          <form onSubmit={handleQuickParseSubmit} className="space-y-1">
            <label htmlFor="quick-sentence-input" className="block text-xs font-medium text-slate-600">
              实时解析任意视频台词（支持直接输入或点击右侧韩语语音识别）
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search
                  className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                  aria-hidden="true"
                />
                <input
                  id="quick-sentence-input"
                  type="text"
                  value={quickSentence}
                  onChange={(e) => {
                    setQuickSentence(e.target.value);
                    if (quickSentenceError) setQuickSentenceError(null);
                  }}
                  placeholder="贴入视频里听到的韩语句子，例如：이거 완전 내 스타일이야"
                  className="font-kr w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>
              <button
                type="submit"
                disabled={isParsing}
                className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
              >
                实时解析
              </button>
              <button
                type="button"
                onClick={toggleAudioCapture}
                aria-label={isListeningAudio ? '停止韩语语音识别并解析' : '韩语语音收音识别'}
                className={`inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl whitespace-nowrap shrink-0 cursor-pointer transition-colors ${
                  isListeningAudio
                    ? 'bg-rose-600 text-white hover:bg-rose-700'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {isListeningAudio ? (
                  <>
                    <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
                    停止解析
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" aria-hidden="true" />
                    语音识别
                  </>
                )}
              </button>
            </div>
            {quickSentenceError && (
              <p role="alert" className="text-xs text-rose-600">
                {quickSentenceError}
              </p>
            )}
          </form>
        </div>

        {captionNotice && (
          <div className="px-3.5 py-2.5 bg-blue-50/80 border border-blue-200/80 rounded-xl text-xs text-blue-900 flex items-center justify-between gap-2">
            <span>{captionNotice}</span>
            <button
              type="button"
              onClick={() => setCaptionNotice(null)}
              className="text-blue-700 hover:underline shrink-0 cursor-pointer"
            >
              知道了
            </button>
          </div>
        )}

        {/* SRT / VTT / YouTube Transcript Importer */}
        {showTranscriptImporter && (
          <form
            onSubmit={handleImportTranscript}
            className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3"
          >
            <div className="p-3 bg-white border border-slate-200/80 rounded-lg text-xs text-slate-600 space-y-1">
              <p className="font-semibold text-slate-800">如何快速导入 YouTube 视频字幕（3 种方式任选）：</p>
              <p>1. <strong>自动抓取</strong>：在上方粘贴 YouTube 链接并点击“载入播放器与字幕”，系统会自动尝试提取该视频的韩语字幕轨。</p>
              <p>2. <strong>YouTube 原页面复制</strong>：在 YouTube 视频简介处点击「更多」→「显示内容转写 (Show transcript)」，全选复制时间轴和韩语台词，直接粘贴到下方文本框即可自动识别时间轴。</p>
              <p>3. <strong>本地字幕文件</strong>：点击右侧按钮直接上传 <code className="px-1 py-0.5 bg-slate-100 rounded">.srt</code> / <code className="px-1 py-0.5 bg-slate-100 rounded">.vtt</code> / <code className="px-1 py-0.5 bg-slate-100 rounded">.txt</code> 字幕文件。</p>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <label htmlFor="transcript-import-box" className="text-xs font-semibold text-slate-700">
                粘贴 YouTube 内容转写 / SRT / WebVTT / 逐行韩语台词：
              </label>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".srt,.vtt,.txt,text/plain,text/vtt"
                  onChange={handleSubtitleFileUpload}
                  className="hidden"
                  data-testid="subtitle-file-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  上传 .srt / .vtt 文件
                </button>
              </div>
            </div>
            <textarea
              id="transcript-import-box"
              rows={5}
              value={transcriptDraft}
              onChange={(e) => {
                setTranscriptDraft(e.target.value);
                if (transcriptError) setTranscriptError(null);
              }}
              placeholder={`支持多种格式：\n0:04\n안녕하세요 여러분, 오늘은 성수동에 왔어요.\n0:10\n여기 커피가 진짜 맛있다고 해서 들렀어요.\n\n或直接粘贴 SRT / WebVTT 内容`}
              className="font-kr w-full p-3 text-sm bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
            />
            {transcriptError && (
              <p role="alert" className="text-xs text-rose-600">
                {transcriptError}
              </p>
            )}
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTranscriptImporter(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg cursor-pointer"
              >
                生成互动双语字幕轨
              </button>
            </div>
          </form>
        )}
      </div>

        </>
      )}

      {/* Main Split Companion Stage: Left Video + Interactive Subtitles (7 cols) / Right Linguistic Inspector (5 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Zone: Player & Synced Interactive Transcript */}
        <section aria-label="视频播放与互动字幕" className="lg:col-span-7 space-y-5">
          {/* Player Container */}
          <button
            type="button"
            onClick={() => setPlayerOpen((v) => !v)}
            aria-expanded={playerOpen}
            className="lg:hidden w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 cursor-pointer"
          >
            视频播放器
            <span className="text-slate-400">{playerOpen ? '收起' : '展开'}</span>
          </button>
          <div
            className={`bg-white border border-slate-200 rounded-2xl overflow-hidden ${
              playerOpen ? '' : 'hidden lg:block'
            }`}
          >
            {externalVideo && externalVideo.videoId ? (
              <div className="aspect-video bg-slate-950">
                <iframe
                  title={externalVideo.title}
                  src={`https://www.youtube.com/embed/${externalVideo.videoId}?rel=0`}
                  className="w-full h-full border-0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="relative aspect-video bg-slate-900 overflow-hidden">
                <img
                  src={activeLesson.thumbnailUrl}
                  alt={activeLesson.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                {/* Measured Dual Scrim for high-contrast top info & bottom subtitle overlay */}
                <div className="absolute inset-0 bg-gradient-to-b from-slate-950/75 via-slate-950/15 to-slate-950/90 flex flex-col justify-between p-5">
                  <div className="flex items-center justify-between text-xs text-white/90">
                    <span className="font-medium">
                      {activeLesson.channel} · {activeLesson.level}
                    </span>
                    <span className="font-mono-tabular">
                      {formatSeconds(currentTimeSec)} / {formatSeconds(activeLesson.durationSec)}
                    </span>
                  </div>

                  {/* Active Synced Dual Subtitle Overlay */}
                  <div className="space-y-3">
                    {activeCue && (
                      <div className="text-center space-y-1 max-w-2xl mx-auto">
                        <p className="font-kr text-lg sm:text-xl font-bold text-white leading-snug drop-shadow-xs">
                          {activeCue.korean}
                        </p>
                        {activeCue.chinese && (
                          <p className="text-xs sm:text-sm text-slate-200">
                            {activeCue.chinese}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Playback Controls */}
                    <div className="flex items-center gap-3 pt-1">
                      <button
                        type="button"
                        onClick={() => setIsPlaying((p) => !p)}
                        aria-label={isPlaying ? '暂停伴学字幕播放' : '播放伴学字幕'}
                        className="w-9 h-9 rounded-full bg-white text-slate-900 hover:bg-blue-50 flex items-center justify-center shrink-0 cursor-pointer"
                      >
                        {isPlaying ? (
                          <Pause className="w-4 h-4 fill-current" aria-hidden="true" />
                        ) : (
                          <Play className="w-4 h-4 fill-current ml-0.5" aria-hidden="true" />
                        )}
                      </button>

                      <label htmlFor="video-scrubber" className="sr-only">
                        视频时间轴进度
                      </label>
                      <input
                        id="video-scrubber"
                        type="range"
                        min={0}
                        max={activeLesson.durationSec}
                        value={currentTimeSec}
                        onChange={(e) => setCurrentTimeSec(Number(e.target.value))}
                        className="flex-1 accent-blue-500 cursor-pointer"
                      />

                      <button
                        type="button"
                        onClick={() => setPlaybackRate((r) => (r === 1 ? 0.75 : 1))}
                        className="px-2.5 py-1 text-xs font-mono-tabular font-semibold text-white bg-white/15 hover:bg-white/25 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        {playbackRate}x
                      </button>

                      {activeCue && (
                        <button
                          type="button"
                          onClick={() =>
                            speakKorean(activeCue.korean, { slow: playbackRate === 0.75 })
                          }
                          aria-label="朗读当前台词"
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-md whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                          听本句
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Interactive Subtitle Track Below Video */}
            <div className="p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900 truncate">{activeTitle}</h2>
                <span className="text-xs text-slate-500 whitespace-nowrap shrink-0">
                  点击任意台词实时拆词析语法
                </span>
              </div>

              {activeCues.length === 0 ? (
                <p className="text-sm text-slate-500 py-4">
                  当前 YouTube 视频尚未导入字幕轨。你可以点击上方“导入 SRT / 视频字幕”粘贴 YouTube 内容转写或上传 .srt/.vtt 文件，或在上方快速栏直接输入韩语句子 / 点击“语音识别”。
                </p>
              ) : (
                <ul className="divide-y divide-slate-100 border border-slate-200/80 rounded-xl overflow-hidden">
                  {activeCues.map((cue) => {
                    const isSelected = activeCue?.id === cue.id;
                    return (
                      <li
                        key={cue.id}
                        className={`flex items-start justify-between gap-2 px-4 py-3 transition-colors ${
                          isSelected ? 'bg-blue-50/80' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => handleSelectCue(cue)}
                          className="flex-1 min-w-0 text-left flex items-start gap-3 cursor-pointer focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
                        >
                          <span className="font-mono-tabular text-xs text-slate-400 pt-0.5 shrink-0">
                            {formatSeconds(cue.startSec)}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p
                              className={`font-kr text-sm sm:text-base leading-snug break-keep ${
                                isSelected ? 'font-bold text-blue-950' : 'font-medium text-slate-900'
                              }`}
                            >
                              {cue.korean}
                            </p>
                            {cue.chinese && (
                              <p className="text-xs text-slate-500 mt-0.5">{cue.chinese}</p>
                            )}
                          </div>
                        </button>
                        <div className="pt-0.5 shrink-0">
                          <KoreanReadButton
                            text={cue.korean}
                            speakKorean={speakKorean}
                            isKeyLoading={isKeyLoading}
                            isKeyPlaying={isKeyPlaying}
                            compact
                            label="跟读"
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          {/* Curated Video Lesson Switcher Strip */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => setLessonsOpen((v) => !v)}
              aria-expanded={lessonsOpen}
              className="w-full flex items-center justify-between gap-2 text-xs font-semibold text-slate-600 cursor-pointer"
            >
              精选片段
              <span className="text-slate-400">{lessonsOpen ? '收起' : '展开'}</span>
            </button>
            <div className={`grid grid-cols-3 gap-2 ${lessonsOpen ? '' : 'hidden'}`}>
              {CURATED_VIDEO_LESSONS.map((lesson) => {
                const isActive = !externalVideo && lesson.id === activeLesson.id;
                return (
                  <button
                    key={lesson.id}
                    type="button"
                    onClick={() => handleSelectCuratedLesson(lesson.id)}
                    className={`text-left bg-white rounded-xl border overflow-hidden transition-colors cursor-pointer ${
                      isActive ? 'border-blue-600 ring-1 ring-blue-600' : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="aspect-video bg-slate-100 overflow-hidden">
                      <img
                        src={lesson.thumbnailUrl}
                        alt={lesson.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="p-3 space-y-1">
                      <p className="text-[11px] text-slate-500 truncate">{lesson.topic}</p>
                      <p className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug">
                        {lesson.title}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Zone: Real-Time Linguistic Inspector (Memrise Vocab + Grammar Breakdown) */}
        <aside
          aria-label="台词词汇与语法实时解析面板"
          className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-6 lg:sticky lg:top-24"
        >
          {isParsing ? (
            <div className="py-16 flex flex-col items-center justify-center text-center gap-3">
              <Loader2 className="w-6 h-6 text-blue-700 animate-spin" aria-hidden="true" />
              <p className="text-sm font-medium text-slate-800">正在逐词拆解形态素、音变与语法结构……</p>
              <p className="text-xs text-slate-500">同步生成忆术家式助记法与原形词典卡片</p>
            </div>
          ) : parseError ? (
            <div role="alert" className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 space-y-2">
              <p className="font-semibold flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4" aria-hidden="true" />
                实时解析遇到问题
              </p>
              <p className="text-xs leading-relaxed">{parseError}</p>
            </div>
          ) : parsedResult ? (
            <>
              {/* Sentence Overview Header */}
              <div className="space-y-2.5 pb-4 border-b border-slate-100">
                <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                  <span>{parsedResult.speechLevel}</span>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => speakKorean(parsedResult.sentence, { slow: false })}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md cursor-pointer"
                    >
                      {isKeyLoading(parsedResult.sentence, false) ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                      )}
                      常速
                    </button>
                    <button
                      type="button"
                      onClick={() => speakKorean(parsedResult.sentence, { slow: true })}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                    >
                      慢速
                    </button>
                    <button
                      type="button"
                      onClick={() => parseSentenceLive(parsedResult.sentence)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-blue-700 cursor-pointer"
                    >
                      AI 深度重析
                    </button>
                  </div>
                </div>

                <h2 className="font-kr text-xl font-bold text-slate-900 leading-snug">
                  {parsedResult.sentence}
                </h2>
                <p className="font-mono-tabular text-xs text-blue-700">
                  {parsedResult.spokenPronunciation}
                </p>
                <div className="space-y-1 pt-1">
                  <p className="text-sm font-semibold text-slate-800">
                    {parsedResult.naturalTranslation}
                  </p>
                  <p className="text-xs text-slate-500">
                    结构直译：{parsedResult.literalTranslation}
                  </p>
                </div>
              </div>

              {/* Memrise-Style Word-by-Word Breakdown */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold text-slate-700">
                  词汇拆解与忆术家助记 ({parsedResult.tokens.length})
                </h3>
                <ul className="space-y-3">
                  {parsedResult.tokens.map((tok, idx) => {
                    const keyWord = (tok.lemma || tok.surface).trim();
                    const saved = hasWordInGarden(keyWord);
                    return (
                      <li
                        key={`${keyWord}-${idx}`}
                        className="p-3.5 border border-slate-200 rounded-xl space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="font-kr text-base font-bold text-slate-900">
                                {tok.surface}
                              </span>
                              {tok.lemma && tok.lemma !== tok.surface && (
                                <span className="font-kr text-xs text-blue-700 font-medium">
                                  原形 {tok.lemma}
                                </span>
                              )}
                              <span className="text-xs text-slate-400">· {tok.pos}</span>
                            </div>
                            <p className="text-sm font-medium text-slate-800 mt-0.5">
                              {tok.meaningZh}
                            </p>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => speakKorean(keyWord)}
                              aria-label={`朗读单词 ${keyWord}`}
                              className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-md cursor-pointer"
                            >
                              <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                            </button>
                            <button
                              type="button"
                              disabled={saved}
                              onClick={() => onAddTokenToGarden(tok, activeTitle)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                                saved
                                  ? 'text-emerald-700 bg-emerald-50 cursor-default'
                                  : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                              }`}
                            >
                              {saved ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                                  已在词库
                                </>
                              ) : (
                                <>
                                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                                  播种到词库
                                </>
                              )}
                            </button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg leading-relaxed">
                          <span className="font-semibold text-slate-800">助记：</span>
                          {tok.memriseTip}
                        </p>
                        {tok.exampleKr && (
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
                            <span className="font-kr text-slate-800 break-keep">
                              例：{tok.exampleKr}{' '}
                              <span className="font-sans text-slate-500">({tok.exampleZh})</span>
                            </span>
                            <KoreanReadButton
                              text={tok.exampleKr}
                              speakKorean={speakKorean}
                              isKeyLoading={isKeyLoading}
                              isKeyPlaying={isKeyPlaying}
                              compact
                            />
                          </div>
                        )}
                        {tok.nuance && (
                          <p className="text-xs text-slate-500 leading-relaxed">{tok.nuance}</p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Grammar Structures Detected */}
              {parsedResult.grammarPoints.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-semibold text-slate-700">
                    本句核心语法结构 ({parsedResult.grammarPoints.length})
                  </h3>
                  <ul className="space-y-2.5">
                    {parsedResult.grammarPoints.map((gp, i) => (
                      <li key={i} className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                        <div className="flex items-baseline gap-2 flex-wrap">
                          <span className="font-kr text-sm font-bold text-blue-800">
                            {gp.pattern}
                          </span>
                          <span className="text-xs font-semibold text-slate-800">
                            {gp.meaningZh}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed">{gp.usageNote}</p>
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <p className="font-kr text-xs text-slate-800 break-keep">
                            例：{gp.exampleKr}{' '}
                            <span className="font-sans text-slate-500">({gp.exampleZh})</span>
                          </p>
                          <KoreanReadButton
                            text={gp.exampleKr}
                            speakKorean={speakKorean}
                            isKeyLoading={isKeyLoading}
                            isKeyPlaying={isKeyPlaying}
                            compact
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Cultural & Colloquial Note */}
              {parsedResult.culturalNuance && (
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <h3 className="text-xs font-semibold text-slate-700">首尔口语与语境贴士</h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {parsedResult.culturalNuance}
                  </p>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-slate-500 py-8">
              点击左侧视频中的任意一句韩语字幕，或在顶部贴入 YouTube 台词即可实时查看逐词原形、忆术家助记法与语法解析。
            </p>
          )}
        </aside>
      </div>
    </div>
  );
}
