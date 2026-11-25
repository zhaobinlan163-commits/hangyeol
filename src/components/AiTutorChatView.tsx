import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mic,
  Plus,
  RotateCcw,
  Send,
  Square,
} from 'lucide-react';
import type { ChatMessage, ChatReplyPayload, ParsedToken, TutorRole } from '../types/learning';
import { safeFetchJson } from '../utils/api';
import { KoreanReadButton } from './KoreanReadButton';

interface AiTutorChatViewProps {
  messages: ChatMessage[];
  onAppendMessage: (msg: ChatMessage) => void;
  onClearMessages: () => void;
  speakKorean: (text: string, opts?: { slow?: boolean }) => Promise<void>;
  isKeyLoading: (text: string, slow?: boolean) => boolean;
  isKeyPlaying: (text: string, slow?: boolean) => boolean;
  hasWordInGarden: (word: string) => boolean;
  onAddTokenToGarden: (token: ParsedToken, sourceLabel: string) => boolean;
  onActivityComplete: (xp: number) => void;
}

const TUTOR_ROLES: Array<{
  id: TutorRole;
  label: string;
  subtitle: string;
  starters: string[];
}> = [
  {
    id: 'beginner_teacher',
    label: '中国初学者韩语老师',
    subtitle: '한결 선생님 · 中文细讲单词、语法与日常跟读',
    starters: [
      '老师好！去韩国咖啡店点一杯少冰美式，怎么说最地道？',
      '帮我区分一下 은/는 和 이/가 的用法，举两个日常例句吧',
      '刚认识韩国新朋友，怎么自然地问对方周末打算做什么？',
    ],
  },
  {
    id: 'seoul_friend',
    label: '首尔咖啡馆朋友',
    subtitle: '민지 · 圣水洞本地同龄人，日常口语与语感陪聊',
    starters: [
      '민지야! 最近首尔年轻人夸一家店氛围好都会怎么说？',
      '我想委婉拒绝朋友今晚聚餐，说太累了怎么表达不伤感情？',
      '陪我用韩语聊聊今天的天气吧，我说错了帮我顺便改一下！',
    ],
  },
  {
    id: 'topik_coach',
    label: 'TOPIK 备考教练',
    subtitle: 'TOPIK I & II 高频词辨析、语法接续与写作提分',
    starters: [
      'TOPIK 2级里 필요하다 和 필요하다 前面为什么要用 이/가 而不是 을/를？',
      '帮我对比一下 TOPIK 中级词 갈등 和高级词 모순 的区别与例句',
      'TOPIK 53题图表作文里“呈持续增长趋势”最标准的韩语怎么写？',
    ],
  },
];

export function AiTutorChatView({
  messages,
  onAppendMessage,
  onClearMessages,
  speakKorean,
  isKeyLoading,
  isKeyPlaying,
  hasWordInGarden,
  onAddTokenToGarden,
  onActivityComplete,
}: AiTutorChatViewProps) {
  const [tutorRole, setTutorRole] = useState<TutorRole>('beginner_teacher');
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);

  // Browser SpeechRecognition voice-to-text dictation (zh-CN / ko-KR)
  const [voiceLang, setVoiceLang] = useState<'zh-CN' | 'ko-KR'>('zh-CN');
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const recognitionRef = useRef<{
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    onresult: ((ev: { results: ArrayLike<{ isFinal?: boolean; 0: { transcript: string } }> }) => void) | null;
    onerror: ((ev: { error?: string }) => void) | null;
    onend: (() => void) | null;
    start: () => void;
    stop: () => void;
  } | null>(null);
  const threadEndRef = useRef<HTMLDivElement | null>(null);

  const activeRoleInfo = TUTOR_ROLES.find((r) => r.id === tutorRole) ?? TUTOR_ROLES[0];

  useEffect(() => {
    threadEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

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

  const sendMessage = async (rawText: string) => {
    const cleaned = rawText.trim();
    if (!cleaned || isSending) return;

    setChatError(null);
    setInputText('');

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: cleaned,
      createdAt: Date.now(),
    };
    onAppendMessage(userMsg);

    const historyPayload = messages.slice(-14).map((m) => ({
      role: m.role,
      text:
        m.role === 'model' && m.structured
          ? `${m.structured.replyZh}\n${m.structured.koreanSentences
              .map((s) => `${s.korean} (${s.chinese})`)
              .join('\n')}`
          : m.text,
    }));

    setIsSending(true);
    try {
      const data = await safeFetchJson<ChatReplyPayload>(
        '/api/chat',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            history: historyPayload,
            message: cleaned,
            tutorRole,
          }),
        },
        'AI 韩语私教回复失败'
      );

      const modelMsg: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        text: data.replyZh,
        structured: data,
        createdAt: Date.now(),
      };
      onAppendMessage(modelMsg);
      onActivityComplete(12);
    } catch (err) {
      setChatError(err instanceof Error ? err.message : '发送失败，请重试。');
    } finally {
      setIsSending(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(inputText);
  };

  const startVoiceInput = () => {
    setChatError(null);
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => NonNullable<typeof recognitionRef.current> })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => NonNullable<typeof recognitionRef.current> })
        .webkitSpeechRecognition;

    if (!SpeechRec) {
      setChatError('当前浏览器不支持原生语音识别（推荐使用最新版 Chrome 或 Edge），请直接打字输入提问。');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = voiceLang;
      rec.continuous = false;
      rec.interimResults = true;
      const basePrefix = inputText.trim();
      rec.onresult = (ev) => {
        const chunks: string[] = [];
        for (let i = 0; i < ev.results.length; i++) {
          chunks.push(ev.results[i][0].transcript);
        }
        const spoken = chunks.join(' ').trim();
        setInputText(basePrefix ? `${basePrefix} ${spoken}` : spoken);
      };
      rec.onerror = () => {
        setIsRecordingVoice(false);
        setChatError('语音识别未成功开启，请检查麦克风权限或直接打字提问。');
      };
      rec.onend = () => {
        setIsRecordingVoice(false);
        recognitionRef.current = null;
      };
      rec.start();
      recognitionRef.current = rec;
      setIsRecordingVoice(true);
    } catch {
      setIsRecordingVoice(false);
      setChatError('无法开启语音识别，请直接打字输入提问。');
    }
  };

  const stopVoiceInput = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      recognitionRef.current = null;
    }
    setIsRecordingVoice(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      {/* Left Column (4 cols): Tutor Role Selector & Starter Prompts */}
      <aside className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-slate-600">选择 AI 私教角色</p>
          <div className="space-y-2">
            {TUTOR_ROLES.map((role) => {
              const active = role.id === tutorRole;
              return (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setTutorRole(role.id)}
                  className={`w-full text-left p-3.5 rounded-xl border transition-colors cursor-pointer ${
                    active
                      ? 'border-blue-600 bg-blue-50/70'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <p className="text-sm font-semibold text-slate-900">{role.label}</p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">{role.subtitle}</p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2.5 pt-4 border-t border-slate-100">
          <p className="text-xs font-semibold text-slate-600">推荐多轮练习话题（点击直接提问）</p>
          <div className="space-y-2">
            {activeRoleInfo.starters.map((prompt) => (
              <button
                key={prompt}
                type="button"
                disabled={isSending}
                onClick={() => void sendMessage(prompt)}
                className="w-full text-left px-3.5 py-2.5 text-xs text-slate-700 bg-slate-50 hover:bg-blue-50 hover:text-blue-800 border border-slate-200/80 rounded-xl transition-colors cursor-pointer disabled:opacity-50 leading-relaxed"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 text-xs text-slate-500 leading-relaxed">
          支持多轮上下文追问、录音听写转文字（说话即可发给私教），并且每句韩语示范都支持常速与 0.75x 慢速跟读。
        </div>
      </aside>

      {/* Right Column (8 cols): Full Scrollable Multi-Turn Conversation Thread */}
      <section
        aria-label="AI 韩语私教多轮对话"
        className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl flex flex-col min-h-[560px] max-h-[720px]"
      >
        {/* Thread Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3 shrink-0">
          <div>
            <h2 className="text-sm font-semibold text-slate-900">{activeRoleInfo.label}</h2>
            <p className="text-xs text-slate-500 mt-0.5">{activeRoleInfo.subtitle}</p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={onClearMessages}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
              清空对话
            </button>
          )}
        </div>

        {/* Scrollable Message Thread */}
        <div
          data-testid="tutor-chat-thread"
          className="flex-1 overflow-y-auto px-6 py-5 space-y-5"
        >
          {messages.length === 0 ? (
            <div className="py-10 space-y-4 max-w-lg">
              <p className="text-base font-semibold text-slate-900">
                你好！我是你的专属韩语 AI 私教
              </p>
              <p className="text-sm text-slate-600 leading-relaxed">
                你可以直接用中文问语法、贴一句韩语让我润色、练 TOPIK 辨析，或者点击右下角麦克风把你说的话直接听写发给我。每一轮回复都会保留上下文，并自动拆解可跟读的韩语句子与核心单词。
              </p>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === 'user' ? 'items-end' : 'items-start'
                }`}
              >
                <div
                  className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-4 space-y-3 ${
                    msg.role === 'user'
                      ? 'bg-blue-700 text-white'
                      : 'bg-slate-50 border border-slate-200/80 text-slate-900'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  {/* Structured Korean Sentences with Read-Aloud Buttons */}
                  {msg.structured?.koreanSentences &&
                    msg.structured.koreanSentences.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-slate-200/80">
                        {msg.structured.koreanSentences.map((s, idx) => (
                          <div
                            key={idx}
                            className="p-3 bg-white border border-slate-200 rounded-xl space-y-1.5"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <p className="font-kr text-base font-bold text-slate-900 break-keep">
                                {s.korean}
                              </p>
                              <KoreanReadButton
                                text={s.korean}
                                speakKorean={speakKorean}
                                isKeyLoading={isKeyLoading}
                                isKeyPlaying={isKeyPlaying}
                                showSlow
                                compact
                              />
                            </div>
                            <p className="font-mono-tabular text-xs text-blue-700">
                              {s.spokenPronunciation}
                            </p>
                            <p className="text-xs text-slate-600">{s.chinese}</p>
                          </div>
                        ))}
                      </div>
                    )}

                  {/* Grammar Note */}
                  {msg.structured?.grammarNote?.pattern && (
                    <div className="p-3 bg-white border border-slate-200/80 rounded-xl text-xs space-y-1">
                      <p className="font-semibold text-blue-800 font-kr">
                        语法要点 · {msg.structured.grammarNote.pattern}
                      </p>
                      <p className="text-slate-600 leading-relaxed">
                        {msg.structured.grammarNote.explanation}
                      </p>
                    </div>
                  )}

                  {/* Key Vocab with 1-Click Plant to Garden */}
                  {msg.structured?.keyVocab && msg.structured.keyVocab.length > 0 && (
                    <div className="space-y-2 pt-1">
                      <p className="text-[11px] font-semibold text-slate-500">核心词拆解</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.structured.keyVocab.map((v, idx) => {
                          const lemmaKey = (v.lemma || v.word).trim();
                          const saved = hasWordInGarden(lemmaKey);
                          return (
                            <div
                              key={idx}
                              className="p-2.5 bg-white border border-slate-200 rounded-xl space-y-1 text-xs"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-kr font-bold text-slate-900">
                                  {v.word}
                                </span>
                                <button
                                  type="button"
                                  disabled={saved}
                                  onClick={() =>
                                    onAddTokenToGarden(
                                      {
                                        surface: v.word,
                                        lemma: lemmaKey,
                                        pos: '私教词汇',
                                        meaningZh: v.meaningZh,
                                        memriseTip: v.memriseTip,
                                        nuance: '',
                                        isKeyVocab: true,
                                        exampleKr:
                                          msg.structured?.koreanSentences[0]?.korean || v.word,
                                        exampleZh:
                                          msg.structured?.koreanSentences[0]?.chinese ||
                                          v.meaningZh,
                                      },
                                      'AI 私教对话'
                                    )
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
                                      收入词库
                                    </>
                                  )}
                                </button>
                              </div>
                              <p className="text-slate-700 font-medium">{v.meaningZh}</p>
                              <p className="text-[11px] text-slate-500 leading-snug">
                                {v.memriseTip}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Clickable Follow-up Prompt */}
                  {msg.structured?.followUpPrompt && (
                    <div className="pt-2 border-t border-slate-200/70">
                      <button
                        type="button"
                        disabled={isSending}
                        onClick={() => void sendMessage(msg.structured!.followUpPrompt)}
                        className="text-xs text-blue-700 hover:underline text-left cursor-pointer"
                      >
                        继续追问：{msg.structured.followUpPrompt}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}

          {isSending && (
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin text-blue-700" aria-hidden="true" />
              <span>{activeRoleInfo.label}正在组织讲解与例句……</span>
            </div>
          )}
          <div ref={threadEndRef} />
        </div>

        {/* Error Alert */}
        {chatError && (
          <div
            role="alert"
            className="mx-6 mb-3 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
            <span>{chatError}</span>
          </div>
        )}

        {/* Composer with Browser Web SpeechRecognition */}
        <form
          onSubmit={handleFormSubmit}
          className="px-6 py-4 border-t border-slate-100 flex items-center gap-2 shrink-0"
        >
          <button
            type="button"
            disabled={isRecordingVoice || isSending}
            onClick={() => setVoiceLang((l) => (l === 'zh-CN' ? 'ko-KR' : 'zh-CN'))}
            title="切换语音识别语言（中文 / 韩语）"
            className="px-2.5 py-2.5 text-[11px] font-semibold rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
          >
            {voiceLang === 'zh-CN' ? '中' : '한'}
          </button>

          <button
            type="button"
            disabled={isSending}
            onClick={isRecordingVoice ? stopVoiceInput : startVoiceInput}
            aria-label={isRecordingVoice ? '停止语音识别' : '实时语音输入'}
            title={isRecordingVoice ? '停止语音识别' : '点击说话，实时转为文字输入'}
            className={`inline-flex items-center justify-center gap-1.5 px-3 py-2.5 text-xs font-semibold rounded-xl border transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 ${
              isRecordingVoice
                ? 'bg-rose-600 border-rose-600 text-white'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            {isRecordingVoice ? (
              <Square className="w-3.5 h-3.5 fill-current" aria-hidden="true" />
            ) : (
              <Mic className="w-4 h-4" aria-hidden="true" />
            )}
            <span className="hidden sm:inline">
              {isRecordingVoice ? '停止识别' : '语音输入'}
            </span>
          </button>

          <label htmlFor="ai-tutor-chat-input" className="sr-only">
            向韩语 AI 私教提问
          </label>
          <input
            id="ai-tutor-chat-input"
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="输入中文提问或韩语句子，例如：韩语里“辛苦了”对前辈和朋友分别怎么说？"
            className="flex-1 min-w-0 px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:border-blue-600"
          />

          <button
            type="submit"
            disabled={isSending || !inputText.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 disabled:bg-slate-300 rounded-xl transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
            发送
          </button>
        </form>
      </section>
    </div>
  );
}
