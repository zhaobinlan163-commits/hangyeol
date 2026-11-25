import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mic,
  Play,
  Plus,
  Send,
  Square,
  Volume2,
} from 'lucide-react';
import { EXPRESSION_TOPIC_PRESETS, PRONUNCIATION_SCENARIOS } from '../data/seedData';
import type {
  ExpressionCoachResponse,
  ParsedToken,
  PronunciationReport,
} from '../types/learning';
import { safeFetchJson } from '../utils/api';
import { KoreanReadButton } from './KoreanReadButton';

interface PronunciationCoachViewProps {
  speakKorean: (text: string, opts?: { slow?: boolean }) => Promise<void>;
  isKeyPlaying: (text: string, slow?: boolean) => boolean;
  isKeyLoading: (text: string, slow?: boolean) => boolean;
  hasWordInGarden: (word: string) => boolean;
  onAddTokenToGarden: (token: ParsedToken, sourceLabel: string) => boolean;
  onActivityComplete: (xp: number) => void;
}

type CoachSubMode = 'pronunciation' | 'expression';

// Optional Web Speech API typing for real-time interim caption during mic recording
interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
}

export function PronunciationCoachView({
  speakKorean,
  isKeyPlaying,
  isKeyLoading,
  hasWordInGarden,
  onAddTokenToGarden,
  onActivityComplete,
}: PronunciationCoachViewProps) {
  const [subMode, setSubMode] = useState<CoachSubMode>('pronunciation');

  // --- Pronunciation State ---
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(PRONUNCIATION_SCENARIOS[0].id);
  const [customTargetKr, setCustomTargetKr] = useState('');
  const [isUsingCustom, setIsUsingCustom] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingSec, setRecordingSec] = useState(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordedBase64, setRecordedBase64] = useState<string | null>(null);
  const [recordedMime, setRecordedMime] = useState<string>('audio/webm');
  const [liveTranscript, setLiveTranscript] = useState('');
  const [manualSpokenInput, setManualSpokenInput] = useState('');

  const [isAnalyzingPron, setIsAnalyzingPron] = useState(false);
  const [pronError, setPronError] = useState<string | null>(null);
  const [pronReport, setPronReport] = useState<PronunciationReport | null>(null);

  // --- Authentic Expression Coach State ---
  const [selectedTopicId, setSelectedTopicId] = useState(EXPRESSION_TOPIC_PRESETS[0].id);
  const [expressionSituation, setExpressionSituation] = useState(
    EXPRESSION_TOPIC_PRESETS[0].situation
  );
  const [expressionInput, setExpressionInput] = useState(EXPRESSION_TOPIC_PRESETS[0].sampleInput);
  const [tonePreference, setTonePreference] = useState('日常礼貌 (해요체)');
  const [isSuggestingExpr, setIsSuggestingExpr] = useState(false);
  const [exprError, setExprError] = useState<string | null>(null);
  const [exprResult, setExprResult] = useState<ExpressionCoachResponse | null>(null);

  // Audio recorder & waveform refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);

  const activeScenario =
    PRONUNCIATION_SCENARIOS.find((s) => s.id === selectedScenarioId) ?? PRONUNCIATION_SCENARIOS[0];
  const targetKorean = isUsingCustom ? customTargetKr.trim() : activeScenario.korean;
  const targetChinese = isUsingCustom ? '自定义韩语句子跟读练习' : activeScenario.chinese;

  // Cleanup recording resources on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (animFrameRef.current) window.cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }
      if (audioCtxRef.current) {
        audioCtxRef.current.close().catch(() => {});
      }
    };
  }, []);

  const drawIdleWaveform = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  };

  useEffect(() => {
    if (!isRecording) {
      drawIdleWaveform();
    }
  }, [isRecording, subMode]);

  const startRecording = async () => {
    setPronError(null);
    setLiveTranscript('');
    setRecordedBase64(null);
    if (recordedBlobUrl) {
      URL.revokeObjectURL(recordedBlobUrl);
      setRecordedBlobUrl(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : 'audio/mp4';

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data.size > 0) audioChunksRef.current.push(ev.data);
      };

      recorder.onstop = () => {
        const cleanMime = mimeType.split(';')[0];
        const blob = new Blob(audioChunksRef.current, { type: cleanMime });
        const url = URL.createObjectURL(blob);
        setRecordedBlobUrl(url);
        setRecordedMime(cleanMime);

        const reader = new FileReader();
        reader.onloadend = () => {
          const result = String(reader.result || '');
          const base64 = result.includes(',') ? result.split(',')[1] : result;
          setRecordedBase64(base64);
        };
        reader.readAsDataURL(blob);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingSec(0);

      timerRef.current = window.setInterval(() => {
        setRecordingSec((s) => s + 1);
      }, 1000);

      // Web Audio live waveform visualizer
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const audioCtx = new AudioCtx();
      audioCtxRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 128;
      source.connect(analyser);
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const renderWave = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        analyser.getByteTimeDomainData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.strokeStyle = '#1d4ed8';
        ctx.lineWidth = 2;
        ctx.beginPath();
        const sliceWidth = canvas.width / dataArray.length;
        let x = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = dataArray[i] / 128.0;
          const y = (v * canvas.height) / 2;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();
        animFrameRef.current = window.requestAnimationFrame(renderWave);
      };
      renderWave();

      // Optional browser Korean SpeechRecognition for real-time caption preview
      const SpeechRec =
        (window as unknown as { SpeechRecognition?: new () => BrowserSpeechRecognition }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => BrowserSpeechRecognition }).webkitSpeechRecognition;
      if (SpeechRec) {
        try {
          const recognition = new SpeechRec();
          recognition.lang = 'ko-KR';
          recognition.continuous = true;
          recognition.interimResults = true;
          recognition.onresult = (event) => {
            const chunks: string[] = [];
            for (let i = 0; i < event.results.length; i++) {
              chunks.push(event.results[i][0].transcript);
            }
            const recognized = chunks.join(' ').trim();
            setLiveTranscript(recognized);
            if (recognized) {
              setManualSpokenInput(recognized);
            }
          };
          recognition.onerror = () => {};
          recognition.start();
          recognitionRef.current = recognition;
        } catch {
          // Browser speech preview optional
        }
      }
    } catch {
      setPronError(
        '无法访问麦克风（请检查浏览器录音权限）。你也可以在下方直接输入听写/试读文本进行语音学音变与表达诊断。'
      );
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (animFrameRef.current) {
      window.cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    setIsRecording(false);
  };

  const handleAnalyzePronunciation = async () => {
    setPronError(null);
    if (!targetKorean) {
      setPronError('请先输入或选择一句需要跟读的韩语目标句子。');
      return;
    }
    const effectiveTranscript = (manualSpokenInput || liveTranscript).trim();
    if (!effectiveTranscript) {
      setPronError(
        recordedBase64
          ? '已保存录音回放，但当前浏览器未捕获到语音识别文字。请在下方输入框填入你读出的韩语/音节文本后点击“开始 AI 发音诊断”。'
          : '请先录音跟读（Chrome/Edge 将自动识别韩语），或在下方输入你读出的韩语/音节文本后再提交诊断。'
      );
      return;
    }

    setIsAnalyzingPron(true);
    try {
      const data = await safeFetchJson<PronunciationReport>(
        '/api/pronunciation/analyze',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            spokenText: effectiveTranscript,
            targetKorean,
            targetChinese,
            scenarioContext: isUsingCustom ? '自定义口语练习' : activeScenario.title,
          }),
        },
        '发音诊断请求失败'
      );
      setPronReport(data);
      onActivityComplete(20);
    } catch (err) {
      setPronError(err instanceof Error ? err.message : '发音诊断失败，请重试。');
    } finally {
      setIsAnalyzingPron(false);
    }
  };

  const handleSuggestExpressions = async (e: React.FormEvent) => {
    e.preventDefault();
    setExprError(null);
    if (!expressionInput.trim()) {
      setExprError('请输入你想用韩语表达的中文内容，或待润色的韩语句子。');
      return;
    }

    setIsSuggestingExpr(true);
    try {
      const data = await safeFetchJson<ExpressionCoachResponse>(
        '/api/expression/suggest',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            situation: expressionSituation,
            userInput: expressionInput.trim(),
            tonePreference,
          }),
        },
        '获取地道表达失败'
      );
      setExprResult(data);
      onActivityComplete(15);
    } catch (err) {
      setExprError(err instanceof Error ? err.message : '获取地道表达失败，请重试。');
    } finally {
      setIsSuggestingExpr(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Workspace Mode Switcher Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            实时纠错
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            检测收音、连音、紧音与语调，或把生硬表达改成日常口语。
          </p>
        </div>

        <div
          role="tablist"
          aria-label="口语训练模式"
          className="inline-flex items-center p-1 bg-slate-200/70 rounded-lg self-start shrink-0"
        >
          <button
            type="button"
            role="tab"
            aria-selected={subMode === 'pronunciation'}
            onClick={() => setSubMode('pronunciation')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subMode === 'pronunciation'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            实时发音纠错
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={subMode === 'expression'}
            onClick={() => setSubMode('expression')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              subMode === 'expression'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            地道日常表达建议
          </button>
        </div>
      </div>

      {subMode === 'pronunciation' ? (
        /* TWO-ZONE INTERACTIVE PRONUNCIATION STAGE */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Zone (7 cols): Target Sentence + Recorder Stage */}
          <section aria-label="跟读录音台" className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            {/* Scenario Selector */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-600">选择首尔高频场景句</span>
                <button
                  type="button"
                  onClick={() => {
                    setIsUsingCustom((v) => !v);
                    setPronReport(null);
                  }}
                  className="text-xs font-medium text-blue-700 hover:underline cursor-pointer"
                >
                  {isUsingCustom ? '返回推荐场景句' : '输入自定义韩语句子'}
                </button>
              </div>

              {!isUsingCustom ? (
                <div className="flex flex-wrap gap-2">
                  {PRONUNCIATION_SCENARIOS.map((sc) => {
                    const active = sc.id === selectedScenarioId;
                    return (
                      <button
                        key={sc.id}
                        type="button"
                        onClick={() => {
                          setSelectedScenarioId(sc.id);
                          setPronReport(null);
                          setPronError(null);
                        }}
                        className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          active
                            ? 'bg-blue-700 border-blue-700 text-white'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        {sc.title}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <div>
                  <label htmlFor="custom-pron-kr" className="sr-only">
                    输入自定义韩语跟读句子
                  </label>
                  <input
                    id="custom-pron-kr"
                    type="text"
                    value={customTargetKr}
                    onChange={(e) => setCustomTargetKr(e.target.value)}
                    placeholder="输入任意韩语句子，例如：오늘 날씨 진짜 좋네요."
                    className="font-kr w-full px-4 py-2.5 text-base bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600"
                  />
                </div>
              )}
            </div>

            {/* Target Korean Display */}
            <div className="p-5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-3">
              <div className="flex items-center justify-between gap-2 text-xs text-slate-500">
                <span>
                  {isUsingCustom
                    ? '自定义跟读练习'
                    : `${activeScenario.category} · ${activeScenario.speechLevel}`}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={!targetKorean}
                    onClick={() => speakKorean(targetKorean, { slow: false })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                  >
                    {isKeyLoading(targetKorean, false) ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" aria-hidden="true" />
                    )}
                    {isKeyPlaying(targetKorean, false) ? '播放中' : '母语常速示范'}
                  </button>
                  <button
                    type="button"
                    disabled={!targetKorean}
                    onClick={() => speakKorean(targetKorean, { slow: true })}
                    className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                  >
                    0.75x 慢速拆音
                  </button>
                </div>
              </div>

              <p className="font-kr text-2xl sm:text-[26px] font-bold text-slate-900 leading-snug break-keep">
                {targetKorean || '请在上方输入要练习的韩语句子'}
              </p>

              {!isUsingCustom && (
                <>
                  <p className="font-mono-tabular text-sm text-blue-800 font-medium">
                    实际连读音：{activeScenario.spokenPronunciation}
                  </p>
                  <p className="text-sm text-slate-600">{activeScenario.chinese}</p>
                  <div className="pt-3 border-t border-slate-200/80 text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-800">{activeScenario.phoneticFocus}</p>
                    <p className="leading-relaxed">{activeScenario.phoneticDetail}</p>
                  </div>
                </>
              )}
            </div>

            {/* Live Microphone Recorder + Waveform Canvas */}
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{isRecording ? '正在录制韩语发音……' : '实时声波监测台'}</span>
                  <span className="font-mono-tabular">
                    {String(Math.floor(recordingSec / 60)).padStart(2, '0')}:
                    {String(recordingSec % 60).padStart(2, '0')}
                  </span>
                </div>
                <canvas
                  ref={canvasRef}
                  width={560}
                  height={64}
                  data-testid="pronunciation-waveform"
                  className="w-full h-16 rounded-lg bg-slate-50"
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-2.5">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors cursor-pointer"
                      >
                        <Mic className="w-4 h-4" aria-hidden="true" />
                        开始录音跟读
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                      >
                        <Square className="w-4 h-4 fill-current" aria-hidden="true" />
                        停止录音
                      </button>
                    )}

                    {recordedBlobUrl && !isRecording && (
                      <button
                        type="button"
                        onClick={() => {
                          const audio = new Audio(recordedBlobUrl);
                          audio.play().catch(() => {});
                        }}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" aria-hidden="true" />
                        回听我的发音
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={isRecording || isAnalyzingPron}
                    onClick={handleAnalyzePronunciation}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-lg transition-colors cursor-pointer"
                  >
                    {isAnalyzingPron && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                    {isAnalyzingPron ? 'DeepSeek 语音学诊断中…' : '开始 AI 发音诊断'}
                  </button>
                </div>

                {liveTranscript && (
                  <p className="text-xs text-slate-600 pt-2 border-t border-slate-100">
                    实时识别预览：<span className="font-kr text-slate-900 font-medium">{liveTranscript}</span>
                  </p>
                )}
              </div>

              {/* Text-based phonetic check input when mic isn't convenient */}
              <div className="space-y-1.5">
                <label htmlFor="manual-spoken-input" className="block text-xs font-medium text-slate-600">
                  实际读出/语音识别文本（DeepSeek 将逐节对比目标句连音、收音与语调）：
                </label>
                <input
                  id="manual-spoken-input"
                  type="text"
                  value={manualSpokenInput}
                  onChange={(e) => setManualSpokenInput(e.target.value)}
                  placeholder="例如：아이스 아메리카노 한 잔 이랑 말차 라떼..."
                  className="font-kr w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              {pronError && (
                <div
                  role="alert"
                  className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-sm text-rose-800 flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  <span>{pronError}</span>
                </div>
              )}
            </div>
          </section>

          {/* Right Zone (5 cols): Real-Time Pronunciation Diagnosis & Native Upgrades */}
          <aside aria-label="发音诊断报告" className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            {pronReport ? (
              <>
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <p className="text-xs text-slate-500">AI 语音学发音评分</p>
                    <p className="text-3xl font-bold text-slate-900 tabular-nums mt-0.5">
                      {pronReport.accuracyScore}
                      <span className="text-sm font-normal text-slate-500"> / 100</span>
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                      pronReport.accuracyScore >= 85
                        ? 'text-emerald-700'
                        : pronReport.accuracyScore >= 65
                        ? 'text-amber-700'
                        : 'text-rose-700'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                    {pronReport.verdictLabel}
                  </span>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-xs font-semibold text-slate-500">实际听到的发音</p>
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="font-kr font-medium text-slate-900 break-keep">
                      {pronReport.heardKorean}
                    </p>
                    <KoreanReadButton
                      text={targetKorean}
                      speakKorean={speakKorean}
                      isKeyLoading={isKeyLoading}
                      isKeyPlaying={isKeyPlaying}
                      showSlow
                      compact
                      label="标准对比朗读"
                    />
                  </div>
                  <p className="text-slate-700 leading-relaxed">{pronReport.overallSummary}</p>
                </div>

                {/* Syllable-by-Syllable Diagnostic Breakdown */}
                {pronReport.syllableFeedback.length > 0 && (
                  <div className="space-y-2.5">
                    <h3 className="text-xs font-semibold text-slate-700">逐节音素与收音诊断</h3>
                    <ul className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                      {pronReport.syllableFeedback.map((seg, i) => {
                        const isGood = seg.status === 'accurate';
                        const isMissed = seg.status === 'missed';
                        return (
                          <li key={i} className="p-3 bg-white space-y-1">
                            <div className="flex items-center justify-between gap-2 text-xs">
                              <span className="font-kr text-sm font-bold text-slate-900">
                                {seg.segment}{' '}
                                <span className="font-mono-tabular font-normal text-slate-500">
                                  {seg.expectedPronunciation}
                                </span>
                              </span>
                              <div className="flex items-center gap-2 shrink-0">
                                <KoreanReadButton
                                  text={seg.segment}
                                  speakKorean={speakKorean}
                                  isKeyLoading={isKeyLoading}
                                  isKeyPlaying={isKeyPlaying}
                                  compact
                                />
                                <span
                                  className={`font-semibold ${
                                    isGood
                                      ? 'text-emerald-700'
                                      : isMissed
                                      ? 'text-rose-700'
                                      : 'text-amber-700'
                                  }`}
                                >
                                  {isGood ? '准确' : isMissed ? '漏读' : '需微调'}
                                </span>
                              </div>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">{seg.tip}</p>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {/* Phonetic Rules & Intonation */}
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h3 className="text-xs font-semibold text-slate-700">语调与音变规则建议</h3>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    <span className="font-semibold text-slate-900">语调节奏：</span>
                    {pronReport.intonationAdvice}
                  </p>
                  {pronReport.phoneticRules.map((rule, idx) => (
                    <div key={idx} className="text-xs text-slate-600 bg-slate-50 p-3 rounded-xl space-y-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-slate-900">
                          {rule.ruleName} · <span className="font-kr text-blue-700">{rule.exampleInSentence}</span>
                        </p>
                        <KoreanReadButton
                          text={rule.exampleInSentence}
                          speakKorean={speakKorean}
                          isKeyLoading={isKeyLoading}
                          isKeyPlaying={isKeyPlaying}
                          compact
                        />
                      </div>
                      <p className="leading-relaxed">{rule.explanation}</p>
                    </div>
                  ))}
                </div>

                {/* Authentic Everyday Alternatives */}
                {pronReport.authenticAlternatives.length > 0 && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <h3 className="text-xs font-semibold text-slate-700">同场景地道日常表达建议</h3>
                    <div className="space-y-3">
                      {pronReport.authenticAlternatives.map((alt, idx) => (
                        <div key={idx} className="p-3.5 border border-slate-200 rounded-xl space-y-1.5">
                          <div className="flex items-start justify-between gap-2">
                            <p className="font-kr text-sm font-bold text-slate-900 break-keep">{alt.korean}</p>
                            <KoreanReadButton
                              text={alt.korean}
                              speakKorean={speakKorean}
                              isKeyLoading={isKeyLoading}
                              isKeyPlaying={isKeyPlaying}
                              showSlow
                              compact
                            />
                          </div>
                          <p className="font-mono-tabular text-xs text-blue-700">{alt.spokenPronunciation}</p>
                          <p className="text-xs text-slate-700">{alt.chinese}</p>
                          <p className="text-xs text-slate-500">
                            {alt.speechLevel} · {alt.socialContext}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="py-10 space-y-4">
                <h2 className="text-base font-semibold text-slate-900">等待你的跟读发音</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  先点击左侧“母语常速示范”或“0.75x 慢速拆音”听清首尔连读，然后按下“开始录音跟读”并提交诊断。
                </p>
                <div className="pt-4 border-t border-slate-100 space-y-2.5 text-xs text-slate-600">
                  <p className="font-semibold text-slate-800">AI 诊断将重点为你检查：</p>
                  <ul className="space-y-1.5 list-disc pl-4">
                    <li>韩语核心音变：连音化 (연음화)、紧音化 (경음화)、鼻音化与送气化</li>
                    <li>收音 (받침) 舌位闭合是否到位、松音/紧音/送气音区分</li>
                    <li>首尔标准语高低重音与句尾语调自然度</li>
                    <li>同步附赠同场景下更地道的首尔日常替换说法</li>
                  </ul>
                </div>
              </div>
            )}
          </aside>
        </div>
      ) : (
        /* AUTHENTIC EVERYDAY KOREAN EXPRESSION COACH */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Zone: Topic & Input Composer */}
          <section aria-label="地道表达请求台" className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-5">
            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">常见社交场景 / 热门话题</p>
              <div className="flex flex-wrap gap-2">
                {EXPRESSION_TOPIC_PRESETS.map((preset) => {
                  const active = preset.id === selectedTopicId;
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        setSelectedTopicId(preset.id);
                        setExpressionSituation(preset.situation);
                        setExpressionInput(preset.sampleInput);
                        setExprError(null);
                      }}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                        active
                          ? 'bg-blue-700 border-blue-700 text-white'
                          : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSuggestExpressions} className="space-y-4">
              <div>
                <label htmlFor="expr-situation" className="block text-xs font-medium text-slate-600 mb-1.5">
                  对话对象与场景
                </label>
                <input
                  id="expr-situation"
                  type="text"
                  value={expressionSituation}
                  onChange={(e) => setExpressionSituation(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="expr-input" className="block text-xs font-medium text-slate-600 mb-1.5">
                  你想表达的意思（中文，或一句你想润色的韩语）
                </label>
                <textarea
                  id="expr-input"
                  rows={4}
                  value={expressionInput}
                  onChange={(e) => {
                    setExpressionInput(e.target.value);
                    if (exprError) setExprError(null);
                  }}
                  placeholder="例如：我想礼貌地问咖啡店员能不能帮我少放点冰，还要打包带走……"
                  className="w-full p-3.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label htmlFor="expr-tone" className="block text-xs font-medium text-slate-600 mb-1.5">
                  优先推荐语气
                </label>
                <select
                  id="expr-tone"
                  value={tonePreference}
                  onChange={(e) => setTonePreference(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-blue-600"
                >
                  <option value="日常礼貌 (해요체)">日常礼貌 (해요체 · 店员/朋友/同事通用)</option>
                  <option value="同龄亲密 (반말)">同龄亲密平语 (반말 · 好友/日常吐槽)</option>
                  <option value="职场正式 (합쇼체/높임말)">职场正式敬语 (합쇼체 · 上司/客户)</option>
                </select>
              </div>

              {exprError && (
                <p role="alert" className="text-xs text-rose-600 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
                  {exprError}
                </p>
              )}

              <button
                type="submit"
                disabled={isSuggestingExpr}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                {isSuggestingExpr ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Send className="w-4 h-4" aria-hidden="true" />
                )}
                {isSuggestingExpr ? '正在生成首尔母语地道表达…' : '获取地道日常韩语建议'}
              </button>
            </form>
          </section>

          {/* Right Zone: Textbook vs Native Seoul Expression Deck */}
          <section aria-label="地道表达推荐结果" className="lg:col-span-7 bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
            {exprResult ? (
              <>
                <div className="space-y-2 pb-5 border-b border-slate-100">
                  <p className="text-xs font-semibold text-blue-700">韩国社交礼仪与语境提示</p>
                  <p className="text-sm text-slate-800 leading-relaxed">{exprResult.situationSummary}</p>
                </div>

                {/* Textbook vs Native Contrast */}
                {exprResult.textbookExample?.korean && (
                  <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-500">避免生硬直译（教科书常见说法）</p>
                      <KoreanReadButton
                        text={exprResult.textbookExample.korean}
                        speakKorean={speakKorean}
                        isKeyLoading={isKeyLoading}
                        isKeyPlaying={isKeyPlaying}
                        compact
                        label="对比听读"
                      />
                    </div>
                    <p className="font-kr text-base text-slate-700 line-through decoration-slate-400 break-keep">
                      {exprResult.textbookExample.korean}
                    </p>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {exprResult.textbookExample.whyStiff}
                    </p>
                  </div>
                )}

                {/* Recommended Authentic Everyday Expressions */}
                <div className="space-y-4">
                  <h2 className="text-sm font-semibold text-slate-900">首尔本地人真正会说的地道表达</h2>
                  {exprResult.expressions.map((item, idx) => {
                    const vocabWord = item.keyVocab?.lemma || item.keyVocab?.word;
                    const alreadySaved = vocabWord ? hasWordInGarden(vocabWord) : false;
                    return (
                      <article
                        key={idx}
                        className="p-4 border border-slate-200 rounded-xl space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-xs text-slate-500 mb-1">
                              0{idx + 1}. {item.speechLevel} · {item.socialContext}
                            </p>
                            <p className="font-kr text-lg font-bold text-slate-900 break-keep">{item.korean}</p>
                            <p className="font-mono-tabular text-xs text-blue-700 mt-0.5">
                              {item.spokenPronunciation} · {item.romanization}
                            </p>
                          </div>
                          <KoreanReadButton
                            text={item.korean}
                            speakKorean={speakKorean}
                            isKeyLoading={isKeyLoading}
                            isKeyPlaying={isKeyPlaying}
                            showSlow
                            compact
                            label="朗读"
                          />
                        </div>

                        <p className="text-sm text-slate-800 font-medium">{item.chinese}</p>
                        <p className="text-xs text-slate-600 leading-relaxed">{item.nuanceTip}</p>

                        {item.keyVocab && vocabWord && (
                          <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <span className="text-slate-600">
                              核心词：<strong className="font-kr text-slate-900">{vocabWord}</strong> ({item.keyVocab.meaningZh})
                            </span>
                            <button
                              type="button"
                              disabled={alreadySaved}
                              onClick={() =>
                                onAddTokenToGarden(
                                  {
                                    surface: item.keyVocab.word,
                                    lemma: vocabWord,
                                    pos: '地道表达',
                                    meaningZh: item.keyVocab.meaningZh,
                                    memriseTip: item.keyVocab.memriseTip,
                                    nuance: item.nuanceTip,
                                    isKeyVocab: true,
                                    exampleKr: item.korean,
                                    exampleZh: item.chinese,
                                  },
                                  '地道表达教练'
                                )
                              }
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                                alreadySaved
                                  ? 'text-emerald-700 bg-emerald-50 cursor-default'
                                  : 'text-blue-700 hover:bg-blue-50'
                              }`}
                            >
                              {alreadySaved ? (
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
                        )}
                      </article>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="py-10 space-y-4">
                <h2 className="text-base font-semibold text-slate-900">告别生硬机翻，像首尔本地人一样开口</h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  在左侧选择一个日常社交场景，或者直接输入你想说的中文意思。点击“获取地道日常韩语建议”后，智能体将为你对比生硬教科书句式，并按敬语层级给出 3~4 种真实首尔口语表达。
                </p>
                <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">精准区分敬语语境</p>
                    <p>明确标出对店员、同事、同龄好友分别该用 해요체、반말 还是委婉敬语。</p>
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 mb-1">一键收藏核心词</p>
                    <p>每条表达附带高价值核心词汇与忆术家助记法，点击即可加入每日背词花园。</p>
                  </div>
                </div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
