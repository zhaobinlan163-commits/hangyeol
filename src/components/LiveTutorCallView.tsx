import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpen,
  CheckCircle2,
  Loader2,
  Mic,
  MicOff,
  Phone,
  PhoneOff,
  Plus,
  Send,
} from 'lucide-react';
import type { ChatMessage, ParsedSentence, ParsedToken } from '../types/learning';
import { safeFetchJson } from '../utils/api';
import { formatSeconds } from '../utils/korean';
import { base64ToFloat32Pcm, extractKoreanSegments } from '../utils/pcm';
import { AiTutorChatView } from './AiTutorChatView';
import { KoreanReadButton } from './KoreanReadButton';

interface LiveTutorCallViewProps {
  chatMessages: ChatMessage[];
  onAppendChatMessage: (msg: ChatMessage) => void;
  onClearChatMessages: () => void;
  speakKorean: (text: string, opts?: { slow?: boolean }) => Promise<void>;
  isKeyLoading: (text: string, slow?: boolean) => boolean;
  isKeyPlaying: (text: string, slow?: boolean) => boolean;
  hasWordInGarden: (word: string) => boolean;
  onAddTokenToGarden: (token: ParsedToken, sourceLabel: string) => boolean;
  onActivityComplete: (xp: number) => void;
}

interface CallTranscriptItem {
  id: string;
  role: 'tutor' | 'user';
  text: string;
  timestampSec: number;
}

interface BrowserSpeechRecognition {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((ev: {
    resultIndex?: number;
    results: ArrayLike<{ isFinal?: boolean; 0: { transcript: string } }>;
  }) => void) | null;
  onerror: ((ev: { error?: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

const BEGINNER_TOPICS = [
  {
    id: 'greeting',
    title: '零基础初次见面问候',
    desc: '练习打招呼、自我介绍与礼貌告别（안녕하세요 / 반가워요）',
    starterSentence: '안녕하세요, 만나서 반가워요.',
  },
  {
    id: 'cafe',
    title: '首尔咖啡店点单跟读',
    desc: '练习点冰美式、要少冰、堂食或打包（아이스 아메리카노 주세요）',
    starterSentence: '아이스 아메리카노 한 잔 주세요.',
  },
  {
    id: 'restaurant',
    title: '韩国餐厅点菜与结账',
    desc: '练习呼叫店员、点餐、要水与买单（저기요, 여기 물 좀 주세요）',
    starterSentence: '저기요, 여기 메뉴판 좀 주실 수 있어요?',
  },
  {
    id: 'shopping',
    title: '明洞逛街问价格试穿',
    desc: '练习询问多少钱、有没有别的尺码（이거 얼마예요?）',
    starterSentence: '이거 얼마예요? 한번 입어 봐도 돼요?',
  },
  {
    id: 'daily',
    title: '日常寒暄与近况聊天',
    desc: '练习聊天气、吃饭了吗、周末打算（주말에 뭐 하려고 해요?）',
    starterSentence: '오늘 날씨 진짜 좋네요. 주말에 뭐 하려고 해요?',
  },
];

function base64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const binary = atob(base64);
  const buffer = new ArrayBuffer(binary.length);
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function LiveTutorCallView({
  chatMessages,
  onAppendChatMessage,
  onClearChatMessages,
  speakKorean,
  isKeyLoading,
  isKeyPlaying,
  hasWordInGarden,
  onAddTokenToGarden,
  onActivityComplete,
}: LiveTutorCallViewProps) {
  const [tutorMode, setTutorMode] = useState<'call' | 'chat'>('chat');
  const [selectedTopicId, setSelectedTopicId] = useState(BEGINNER_TOPICS[0].id);
  const [slowTeacherSpeech, setSlowTeacherSpeech] = useState(false);
  const [speechLang, setSpeechLang] = useState<'ko-KR' | 'zh-CN'>('ko-KR');
  const [callState, setCallState] = useState<'idle' | 'connecting' | 'connected'>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [isListenOnlyMode, setIsListenOnlyMode] = useState(false);
  const [micDeniedHint, setMicDeniedHint] = useState(false);
  const [callDurationSec, setCallDurationSec] = useState(0);
  const [micLevel, setMicLevel] = useState(0);
  const [isTutorThinking, setIsTutorThinking] = useState(false);
  const [interimVoiceText, setInterimVoiceText] = useState('');
  const [callError, setCallError] = useState<string | null>(null);

  const [transcripts, setTranscripts] = useState<CallTranscriptItem[]>([]);
  const [textInput, setTextInput] = useState('');

  // Instant Word & Grammar Breakdown sheet for any Korean sentence from the call
  const [inspectedSentence, setInspectedSentence] = useState<string | null>(null);
  const [parsedSheet, setParsedSheet] = useState<ParsedSentence | null>(null);
  const [isParsingSheet, setIsParsingSheet] = useState(false);
  const [parseSheetError, setParseSheetError] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const inputCtxRef = useRef<AudioContext | null>(null);
  const outputCtxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const activeSourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const isMutedRef = useRef<boolean>(false);
  const callSecRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);
  const connectTimeoutRef = useRef<number | null>(null);
  const callStateRef = useRef<'idle' | 'connecting' | 'connected'>('idle');
  const receivedServerErrorRef = useRef<boolean>(false);
  const userHungUpRef = useRef<boolean>(false);
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const activeTopic =
    BEGINNER_TOPICS.find((t) => t.id === selectedTopicId) ?? BEGINNER_TOPICS[0];

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    callSecRef.current = callDurationSec;
  }, [callDurationSec]);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcripts, isTutorThinking]);

  const clearQueuedPlayback = useCallback(() => {
    for (const source of activeSourcesRef.current) {
      try {
        source.stop();
      } catch {
        // Already ended
      }
    }
    activeSourcesRef.current.clear();
    if (outputCtxRef.current) {
      nextStartTimeRef.current = outputCtxRef.current.currentTime;
    } else {
      nextStartTimeRef.current = 0;
    }
  }, []);

  const stopSpeechRecognition = useCallback(() => {
    if (recognitionRef.current) {
      const rec = recognitionRef.current;
      recognitionRef.current = null;
      rec.onresult = null;
      rec.onerror = null;
      rec.onend = null;
      try {
        rec.stop();
      } catch {
        // Ignore stop errors
      }
    }
    setInterimVoiceText('');
  }, []);

  const teardownCall = useCallback((initiatedByUser = false) => {
    if (initiatedByUser) {
      userHungUpRef.current = true;
    }
    if (connectTimeoutRef.current) {
      window.clearTimeout(connectTimeoutRef.current);
      connectTimeoutRef.current = null;
    }
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    stopSpeechRecognition();
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current.onaudioprocess = null;
      processorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    clearQueuedPlayback();
    if (inputCtxRef.current) {
      inputCtxRef.current.close().catch(() => {});
      inputCtxRef.current = null;
    }
    if (outputCtxRef.current) {
      outputCtxRef.current.close().catch(() => {});
      outputCtxRef.current = null;
    }
    if (wsRef.current) {
      const ws = wsRef.current;
      wsRef.current = null;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }
    callStateRef.current = 'idle';
    setCallState('idle');
    setIsListenOnlyMode(false);
    setIsTutorThinking(false);
    setMicLevel(0);
  }, [clearQueuedPlayback, stopSpeechRecognition]);

  useEffect(() => {
    return () => {
      teardownCall(true);
    };
  }, [teardownCall]);

  const scheduleAudioChunk = useCallback(async (base64Audio: string, mimeType?: string) => {
    const ctx = outputCtxRef.current;
    if (!ctx) return;
    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    try {
      if (mimeType && (mimeType.includes('mpeg') || mimeType.includes('mp3') || mimeType.includes('wav'))) {
        const bytes = base64ToUint8Array(base64Audio);
        const decoded = await ctx.decodeAudioData(bytes.buffer.slice(0));
        const source = ctx.createBufferSource();
        source.buffer = decoded;
        source.connect(ctx.destination);
        const startAt = Math.max(ctx.currentTime + 0.03, nextStartTimeRef.current);
        source.start(startAt);
        nextStartTimeRef.current = startAt + decoded.duration + 0.12;
        activeSourcesRef.current.add(source);
        source.onended = () => {
          activeSourcesRef.current.delete(source);
        };
        return;
      }

      const float32 = base64ToFloat32Pcm(base64Audio);
      if (float32.length === 0) return;

      const audioBuffer = ctx.createBuffer(1, float32.length, 24000);
      audioBuffer.copyToChannel(float32, 0);

      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      const startAt = Math.max(ctx.currentTime + 0.02, nextStartTimeRef.current);
      source.start(startAt);
      nextStartTimeRef.current = startAt + audioBuffer.duration;

      activeSourcesRef.current.add(source);
      source.onended = () => {
        activeSourcesRef.current.delete(source);
      };
    } catch {
      // Non-fatal audio decode skip; transcript remains visible
    }
  }, []);

  const appendTranscript = useCallback((role: 'tutor' | 'user', text: string) => {
    const cleaned = text.trim();
    if (!cleaned) return;
    setTranscripts((prev) => [
      ...prev,
      {
        id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role,
        text: cleaned,
        timestampSec: callSecRef.current,
      },
    ]);
  }, []);

  const startCallSpeechRecognition = useCallback(
    (lang: 'ko-KR' | 'zh-CN') => {
      stopSpeechRecognition();
      const SpeechRec =
        (window as unknown as { SpeechRecognition?: new () => BrowserSpeechRecognition }).SpeechRecognition ||
        (window as unknown as { webkitSpeechRecognition?: new () => BrowserSpeechRecognition }).webkitSpeechRecognition;
      if (!SpeechRec) return;

      try {
        const rec = new SpeechRec();
        rec.lang = lang;
        rec.continuous = true;
        rec.interimResults = true;
        rec.onresult = (event) => {
          if (isMutedRef.current) return;
          let interim = '';
          let finalText = '';
          const startIdx = typeof event.resultIndex === 'number' ? event.resultIndex : 0;
          for (let i = startIdx; i < event.results.length; i++) {
            const res = event.results[i];
            const text = res[0]?.transcript || '';
            if (res.isFinal) {
              finalText += `${text} `;
            } else {
              interim += text;
            }
          }
          setInterimVoiceText(interim.trim());
          const trimmedFinal = finalText.trim();
          if (trimmedFinal && wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({ text: trimmedFinal }));
            appendTranscript('user', trimmedFinal);
            setInterimVoiceText('');
          }
        };
        rec.onerror = () => {
          // Ignore transient speech recognition events
        };
        rec.onend = () => {
          // Restart automatically while still connected and unmuted
          if (
            recognitionRef.current === rec &&
            callStateRef.current === 'connected' &&
            !isMutedRef.current
          ) {
            try {
              rec.start();
            } catch {
              // Ignore restart race
            }
          }
        };
        rec.start();
        recognitionRef.current = rec;
      } catch {
        // Optional browser speech recognition
      }
    },
    [appendTranscript, stopSpeechRecognition]
  );

  // Restart SpeechRecognition when user toggles ko-KR / zh-CN mid-call
  useEffect(() => {
    if (callState === 'connected' && !isListenOnlyMode && !isMuted) {
      startCallSpeechRecognition(speechLang);
    } else if (callState === 'connected' && isMuted) {
      stopSpeechRecognition();
    }
  }, [speechLang, callState, isListenOnlyMode, isMuted, startCallSpeechRecognition, stopSpeechRecognition]);

  const startLiveCall = async (options?: { listenOnly?: boolean }) => {
    const listenOnly = Boolean(options?.listenOnly);
    setCallError(null);
    setMicDeniedHint(false);
    setCallState('connecting');
    callStateRef.current = 'connecting';
    receivedServerErrorRef.current = false;
    userHungUpRef.current = false;
    setCallDurationSec(0);
    setIsMuted(listenOnly);
    setIsListenOnlyMode(listenOnly);
    isMutedRef.current = listenOnly;

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioCtx) {
      setCallError('当前浏览器不支持 Web Audio 实时音频，请使用最新版 Chrome / Edge / Safari。');
      teardownCall();
      return;
    }

    let outputCtx: AudioContext;
    try {
      outputCtx = new AudioCtx({ sampleRate: 24000 });
    } catch {
      outputCtx = new AudioCtx();
    }
    outputCtx.resume().catch(() => {});
    outputCtxRef.current = outputCtx;
    nextStartTimeRef.current = outputCtx.currentTime;

    let stream: MediaStream | null = null;
    let inputCtx: AudioContext | null = null;

    if (!listenOnly) {
      if (!navigator.mediaDevices || typeof navigator.mediaDevices.getUserMedia !== 'function') {
        setMicDeniedHint(true);
        setCallError(
          '当前环境未检测到可用麦克风接口。你仍可点击下方“免麦收听 + 打字连线”接通老师语音。'
        );
        teardownCall();
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        streamRef.current = stream;
        inputCtx = new AudioCtx();
        await inputCtx.resume().catch(() => {});
        inputCtxRef.current = inputCtx;
      } catch (micErr) {
        const errName = micErr instanceof Error ? micErr.name : '';
        setMicDeniedHint(true);
        if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
          setCallError(
            '未检测到麦克风设备。你可以插上耳机/麦克风后重试，或点击下方“无麦克风收听 + 打字连线”。'
          );
        } else if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
          setCallError(
            '麦克风权限被拒绝：请在浏览器地址栏允许麦克风访问后重试，或先点击下方“无麦克风收听 + 打字连线”。'
          );
        } else {
          setCallError(
            '无法打开麦克风设备。你可先点击下方“无麦克风收听 + 打字连线”接通老师语音。'
          );
        }
        teardownCall();
        return;
      }
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const params = new URLSearchParams({
        topic: `${activeTopic.title}（${activeTopic.desc}）`,
        slow: String(slowTeacherSpeech),
      });
      const ws = new WebSocket(`${protocol}//${window.location.host}/api/live-tutor?${params.toString()}`);
      wsRef.current = ws;

      connectTimeoutRef.current = window.setTimeout(() => {
        if (callStateRef.current === 'connecting') {
          receivedServerErrorRef.current = true;
          setCallError('实时语音通话连接超时（超过 15 秒未收到就绪响应），请检查网络或 DeepSeek API 密钥配置后重试。');
          teardownCall();
        }
      }, 15000);

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(String(event.data)) as {
            type?: string;
            audio?: string;
            audioMimeType?: string;
            interrupted?: boolean;
            tutorThinking?: boolean;
            outputTranscript?: string;
            inputTranscript?: string;
            error?: string;
          };

          if (msg.error) {
            receivedServerErrorRef.current = true;
            setCallError(msg.error);
            teardownCall();
            return;
          }

          if (msg.type === 'ready') {
            if (connectTimeoutRef.current) {
              window.clearTimeout(connectTimeoutRef.current);
              connectTimeoutRef.current = null;
            }
            callStateRef.current = 'connected';
            setCallState('connected');
            onActivityComplete(20);
            timerRef.current = window.setInterval(() => {
              setCallDurationSec((s) => s + 1);
            }, 1000);

            // Wire live microphone RMS meter + browser speech recognition
            if (stream && inputCtx) {
              const source = inputCtx.createMediaStreamSource(stream);
              const processor = inputCtx.createScriptProcessor(4096, 1, 1);
              processorRef.current = processor;

              processor.onaudioprocess = (ev) => {
                const rawChannel = ev.inputBuffer.getChannelData(0);
                let sum = 0;
                for (let i = 0; i < rawChannel.length; i += 8) {
                  sum += rawChannel[i] * rawChannel[i];
                }
                const rms = Math.sqrt(sum / (rawChannel.length / 8));
                setMicLevel(isMutedRef.current ? 0 : Math.min(100, Math.round(rms * 380)));
              };

              source.connect(processor);
              processor.connect(inputCtx.destination);
              startCallSpeechRecognition(speechLang);
            }
            return;
          }

          if (typeof msg.tutorThinking === 'boolean') {
            setIsTutorThinking(msg.tutorThinking);
          }
          if (msg.audio) {
            void scheduleAudioChunk(msg.audio, msg.audioMimeType);
          }
          if (msg.interrupted) {
            clearQueuedPlayback();
          }
          if (msg.outputTranscript) {
            appendTranscript('tutor', msg.outputTranscript);
          }
          if (msg.inputTranscript) {
            appendTranscript('user', msg.inputTranscript);
          }
        } catch {
          // Ignore malformed frame
        }
      };

      ws.onerror = () => {
        if (!receivedServerErrorRef.current) {
          receivedServerErrorRef.current = true;
          setCallError('DeepSeek 语音陪练 WebSocket 连接失败，请检查服务状态或 DEEPSEEK_API_KEY 配置后重试。');
        }
        teardownCall();
      };

      ws.onclose = (ev) => {
        const wasConnecting = callStateRef.current === 'connecting';
        const hadError = receivedServerErrorRef.current;
        const hungUp = userHungUpRef.current;
        teardownCall();
        if (!hadError && !hungUp && (wasConnecting || ev.code !== 1000)) {
          setCallError(
            ev.reason
              ? `语音陪练通话已断开：${ev.reason}`
              : '语音陪练通道已关闭，请检查 DEEPSEEK_API_KEY 配置后重试。'
          );
        }
      };
    } catch (err) {
      setCallError(
        err instanceof Error
          ? `无法建立语音陪练通话：${err.message}`
          : '无法建立语音陪练通话，请刷新页面后重试。'
      );
      teardownCall();
    }
  };

  const sendLivePrompt = (promptText: string) => {
    const cleaned = promptText.trim();
    if (!cleaned) return;
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      setCallError('请先点击“接通 DeepSeek 语音陪练”，接通后即可随时语音互动或发送指令。');
      return;
    }
    wsRef.current.send(JSON.stringify({ text: cleaned }));
    appendTranscript('user', cleaned);
  };

  const handleSendTextMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim()) return;
    sendLivePrompt(textInput.trim());
    setTextInput('');
  };

  const handleInspectKoreanSentence = async (sentence: string) => {
    setInspectedSentence(sentence);
    setIsParsingSheet(true);
    setParseSheetError(null);
    try {
      const data = await safeFetchJson<ParsedSentence>(
        '/api/video/parse',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sentence,
            videoTitle: `AI 语音陪练 · ${activeTopic.title}`,
          }),
        },
        '句子词汇与语法拆解失败'
      );
      setParsedSheet(data);
    } catch (err) {
      setParseSheetError(err instanceof Error ? err.message : '句子拆解失败，请重试。');
    } finally {
      setIsParsingSheet(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
            AI 对话陪练
          </h1>
        </div>
      </div>

      {tutorMode === 'chat' ? (
        <AiTutorChatView
          messages={chatMessages}
          onAppendMessage={onAppendChatMessage}
          onClearMessages={onClearChatMessages}
          speakKorean={speakKorean}
          isKeyLoading={isKeyLoading}
          isKeyPlaying={isKeyPlaying}
          hasWordInGarden={hasWordInGarden}
          onAddTokenToGarden={onAddTokenToGarden}
          onActivityComplete={onActivityComplete}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-start">
          {/* Left Zone (5 cols): Voice Call Console & Topic Setup */}
          <section aria-label="语音陪练控制台" className="lg:col-span-5 bg-white border border-slate-200 rounded-2xl p-6 space-y-3">
            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-600">选择本通电话的练习主题</p>
              <div className="space-y-2">
                {BEGINNER_TOPICS.map((topic) => {
                  const isSelected = topic.id === selectedTopicId;
                  return (
                    <button
                      key={topic.id}
                      type="button"
                      disabled={callState !== 'idle'}
                      onClick={() => setSelectedTopicId(topic.id)}
                      className={`w-full text-left p-3 rounded-xl border transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/70'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <p className="text-sm font-semibold text-slate-900">{topic.title}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{topic.desc}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-xl space-y-2">
              <p className="text-xs font-medium text-slate-500">本课热身首句（可先听再拨打电话）</p>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-kr text-base font-bold text-slate-900 break-keep">
                  {activeTopic.starterSentence}
                </p>
                <KoreanReadButton
                  text={activeTopic.starterSentence}
                  speakKorean={speakKorean}
                  isKeyLoading={isKeyLoading}
                  isKeyPlaying={isKeyPlaying}
                  showSlow
                  compact
                />
              </div>
            </div>

            {/* Speech Speed & Recognition Language Preferences */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">老师韩语示范语速</span>
                <div className="inline-flex p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
                  <button
                    type="button"
                    disabled={callState !== 'idle'}
                    onClick={() => setSlowTeacherSpeech(false)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 ${
                      !slowTeacherSpeech
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    首尔自然常速
                  </button>
                  <button
                    type="button"
                    disabled={callState !== 'idle'}
                    onClick={() => setSlowTeacherSpeech(true)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60 ${
                      slowTeacherSpeech
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    0.75x 慢速拆音
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <span className="text-xs font-semibold text-slate-600 whitespace-nowrap">我的麦克风识别语种</span>
                <div className="inline-flex p-1 bg-slate-100 rounded-lg self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setSpeechLang('ko-KR')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      speechLang === 'ko-KR'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    说韩语跟读 (KO)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSpeechLang('zh-CN')}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      speechLang === 'zh-CN'
                        ? 'bg-white text-slate-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    说中文提问 (ZH)
                  </button>
                </div>
              </div>
            </div>

            {/* Live Voice Meter & Primary Call Actions */}
            <div className="p-4 border border-slate-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-600">
                <span>
                  {callState === 'connected'
                    ? isListenOnlyMode
                      ? '已接通（仅收听 + 打字互动模式）'
                      : isMuted
                      ? '麦克风已静音'
                      : `正在收音 (${speechLang === 'ko-KR' ? '韩语跟读' : '中文提问'})`
                    : callState === 'connecting'
                    ? '正在接通 DeepSeek 韩语陪练老师…'
                    : '点击下方按钮开始一对一语音陪练'}
                </span>
                <span className="font-mono-tabular font-semibold text-slate-900">
                  {formatSeconds(callDurationSec)}
                </span>
              </div>

              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-100 ${
                    callState === 'connected' && !isMuted && !isListenOnlyMode ? 'bg-blue-700' : 'bg-slate-300'
                  }`}
                  style={{ width: `${callState === 'connected' && !isListenOnlyMode ? Math.max(4, micLevel) : 0}%` }}
                />
              </div>

              {interimVoiceText && (
                <p className="text-xs text-blue-700 font-kr">
                  正在听取：{interimVoiceText}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2.5">
                {callState === 'idle' ? (
                  <>
                    <button
                      type="button"
                      data-testid="start-live-call-btn"
                      onClick={() => void startLiveCall()}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Phone className="w-4 h-4" aria-hidden="true" />
                      接通 DeepSeek 语音陪练
                    </button>
                    <button
                      type="button"
                      data-testid="start-live-listen-only-btn"
                      onClick={() => void startLiveCall({ listenOnly: true })}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-3 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap shrink-0"
                    >
                      免麦收听连线
                    </button>
                  </>
                ) : (
                  <>
                    {!isListenOnlyMode && (
                      <button
                        type="button"
                        disabled={callState !== 'connected'}
                        onClick={() => setIsMuted((m) => !m)}
                        aria-label={isMuted ? '取消静音' : '静音麦克风'}
                        className={`inline-flex items-center justify-center gap-1.5 px-4 py-3 text-sm font-medium rounded-xl border transition-colors cursor-pointer ${
                          isMuted
                            ? 'bg-amber-50 border-amber-300 text-amber-900'
                            : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {isMuted ? (
                          <>
                            <MicOff className="w-4 h-4" aria-hidden="true" />
                            已静音
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4" aria-hidden="true" />
                            静音
                          </>
                        )}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => teardownCall(true)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors cursor-pointer"
                    >
                      {callState === 'connecting' ? (
                        <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                      ) : (
                        <PhoneOff className="w-4 h-4" aria-hidden="true" />
                      )}
                      {callState === 'connecting' ? '取消呼叫' : '挂断电话'}
                    </button>
                  </>
                )}
              </div>

              {callError && (
                <div
                  role="alert"
                  className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 space-y-2.5"
                >
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                    <span className="leading-relaxed">{callError}</span>
                  </div>
                  {micDeniedHint && callState === 'idle' && (
                    <button
                      type="button"
                      onClick={() => void startLiveCall({ listenOnly: true })}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-800 bg-white border border-blue-200 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Phone className="w-3.5 h-3.5" aria-hidden="true" />
                      无麦克风收听 + 打字连线
                    </button>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold text-slate-600">快捷指令</p>
              <div className="flex flex-wrap gap-2">
                {[
                  '请老师慢一点，再领读一遍刚才的韩语句子',
                  '请用中文详细告诉我刚才这句话里每个单词的意思和语法',
                  '我学会了，请教我下一句实用对话吧',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    disabled={callState !== 'connected'}
                    onClick={() => sendLivePrompt(prompt)}
                    className="px-3 py-1.5 text-xs text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-800 disabled:opacity-45 rounded-lg transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </section>

          {/* Right Zone (7 cols): Live Bilingual Transcript + Instant Word/Grammar Sheet */}
          <section aria-label="实时对话记录与词汇语法拆解" className="lg:col-span-7 space-y-3">
            <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <h2 className="text-sm font-semibold text-slate-900">实时语音双语字幕板</h2>
                <span className="text-xs text-slate-500">
                  每句韩语自动附带朗读示范与词汇语法拆解
                </span>
              </div>

              <div className="min-h-[300px] max-h-[420px] overflow-y-auto space-y-3 pr-1">
                {transcripts.length === 0 ? (
                  <div className="py-10 space-y-4 text-sm text-slate-600">
                    <p className="font-semibold text-slate-900">
                      老师设定：专为中国韩语初学者服务的首尔陪练老师（한결 선생님）
                    </p>
                    <ul className="space-y-2 list-disc pl-5 text-xs sm:text-sm leading-relaxed">
                      <li>接通电话后，老师会立刻用中文向你打招呼，示范第 1 句实用韩语并播放原声领读。</li>
                      <li>支持一边语音跟读或中文提问，也可通过右侧快捷键让老师放慢语速或讲解词义语法。</li>
                      <li>对话中出现的每一句韩语都可以点击“常速 / 慢速”反复跟读，或点击“拆词析语法”一键收入词库。</li>
                    </ul>
                  </div>
                ) : (
                  transcripts.map((item) => {
                    const koreanSegments = extractKoreanSegments(item.text);
                    return (
                      <div
                        key={item.id}
                        className={`p-4 rounded-xl border space-y-2.5 ${
                          item.role === 'tutor'
                            ? 'bg-slate-50 border-slate-200/80'
                            : 'bg-blue-50/50 border-blue-200/70'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs text-slate-500">
                          <span className="font-semibold text-slate-800">
                            {item.role === 'tutor' ? '한결 老师 (DeepSeek)' : '我'}
                          </span>
                          <span className="font-mono-tabular">{formatSeconds(item.timestampSec)}</span>
                        </div>
                        <p className="text-sm text-slate-900 leading-relaxed whitespace-pre-wrap">
                          {item.text}
                        </p>

                        {koreanSegments.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/70 space-y-2">
                            {koreanSegments.slice(0, 3).map((seg, i) => (
                              <div
                                key={i}
                                className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-2 rounded-lg border border-slate-200/80"
                              >
                                <span className="font-kr text-sm font-semibold text-slate-900 break-keep">
                                  {seg}
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                  <KoreanReadButton
                                    text={seg}
                                    speakKorean={speakKorean}
                                    isKeyLoading={isKeyLoading}
                                    isKeyPlaying={isKeyPlaying}
                                    showSlow
                                    compact
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleInspectKoreanSentence(seg)}
                                    className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md whitespace-nowrap cursor-pointer"
                                  >
                                    <BookOpen className="w-3 h-3" aria-hidden="true" />
                                    拆词析语法
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
                {isTutorThinking && (
                  <div className="flex items-center gap-2 text-xs text-slate-500 px-1">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-700" aria-hidden="true" />
                    <span>한결 老师正在组织回复与韩语示范……</span>
                  </div>
                )}
                <div ref={transcriptEndRef} />
              </div>

              <form onSubmit={handleSendTextMessage} className="flex gap-2 pt-3 border-t border-slate-100">
                <label htmlFor="live-call-text" className="sr-only">
                  在通话中向老师发送文字提问
                </label>
                <input
                  id="live-call-text"
                  type="text"
                  value={textInput}
                  disabled={callState !== 'connected'}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={
                    callState === 'connected'
                      ? '通话中也可打字提问，例如：请问 주세요 的语法怎么用？'
                      : '接通电话后即可开口说话或在此打字补充提问'
                  }
                  className="flex-1 px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600 disabled:opacity-60"
                />
                <button
                  type="submit"
                  disabled={callState !== 'connected' || !textInput.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 rounded-xl whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" aria-hidden="true" />
                  发送
                </button>
              </form>
            </div>

            {(isParsingSheet || parsedSheet || parseSheetError) && (
              <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-900">
                    通话句子单词与语法笔记
                  </h3>
                  {inspectedSentence && (
                    <KoreanReadButton
                      text={inspectedSentence}
                      speakKorean={speakKorean}
                      isKeyLoading={isKeyLoading}
                      isKeyPlaying={isKeyPlaying}
                      showSlow
                      compact
                    />
                  )}
                </div>

                {isParsingSheet ? (
                  <div className="py-8 flex items-center justify-center gap-2 text-sm text-slate-600">
                    <Loader2 className="w-4 h-4 animate-spin text-blue-700" aria-hidden="true" />
                    正在拆解「{inspectedSentence}」中的单词释义与语法……
                  </div>
                ) : parseSheetError ? (
                  <p role="alert" className="text-xs text-rose-600">
                    {parseSheetError}
                  </p>
                ) : parsedSheet ? (
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="font-kr text-lg font-bold text-slate-900 break-keep">
                        {parsedSheet.sentence}
                      </p>
                      <p className="font-mono-tabular text-xs text-blue-700">
                        {parsedSheet.spokenPronunciation}
                      </p>
                      <p className="text-sm text-slate-700">{parsedSheet.naturalTranslation}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {parsedSheet.tokens.map((tok, i) => {
                        const keyWord = (tok.lemma || tok.surface).trim();
                        const saved = hasWordInGarden(keyWord);
                        return (
                          <div key={i} className="p-3 border border-slate-200 rounded-xl space-y-1.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-kr text-sm font-bold text-slate-900">
                                {tok.surface}{' '}
                                <span className="text-xs font-normal text-slate-500">
                                  ({tok.pos})
                                </span>
                              </span>
                              <button
                                type="button"
                                disabled={saved}
                                onClick={() =>
                                  onAddTokenToGarden(tok, `实时陪练 · ${activeTopic.title}`)
                                }
                                className={`inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold rounded cursor-pointer ${
                                  saved
                                    ? 'text-emerald-700 bg-emerald-50 cursor-default'
                                    : 'text-blue-700 bg-blue-50 hover:bg-blue-100'
                                }`}
                              >
                                {saved ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                    已在词库
                                  </>
                                ) : (
                                  <>
                                    <Plus className="w-3 h-3" aria-hidden="true" />
                                    播种
                                  </>
                                )}
                              </button>
                            </div>
                            <p className="text-xs font-medium text-slate-800">{tok.meaningZh}</p>
                            <p className="text-[11px] text-slate-500">{tok.memriseTip}</p>
                          </div>
                        );
                      })}
                    </div>

                    {parsedSheet.grammarPoints.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <p className="text-xs font-semibold text-slate-700">涉及语法</p>
                        {parsedSheet.grammarPoints.map((gp, i) => (
                          <div key={i} className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                            <p className="font-kr font-bold text-blue-800">
                              {gp.pattern}{' '}
                              <span className="font-sans font-semibold text-slate-800">
                                — {gp.meaningZh}
                              </span>
                            </p>
                            <p className="text-slate-600">{gp.usageNote}</p>
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                              <span className="font-kr text-slate-800">
                                例：{gp.exampleKr} ({gp.exampleZh})
                              </span>
                              <KoreanReadButton
                                text={gp.exampleKr}
                                speakKorean={speakKorean}
                                isKeyLoading={isKeyLoading}
                                isKeyPlaying={isKeyPlaying}
                                compact
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
