import { useMemo, useState } from 'react';
import { AlertCircle, Info, KeyRound, X } from 'lucide-react';
import type { ActiveTab } from './types/learning';
import { hasUserApiKey } from './utils/api';
import { useKoreanAudio } from './hooks/useKoreanAudio';
import { useLearningStore } from './hooks/useLearningStore';
import { useNotesStore } from './hooks/useNotesStore';
import { useAutoSync } from './hooks/useAutoSync';
import { computeGardenSummary } from './utils/srs';
import { TopBar } from './components/TopBar';
import { AiSettingsDialog } from './components/AiSettingsDialog';
import { DailyOverviewBar } from './components/DailyOverviewBar';
import { VocabGardenView } from './components/VocabGardenView';
import { LiveTutorCallView } from './components/LiveTutorCallView';
import { PronunciationCoachView } from './components/PronunciationCoachView';
import { GrammarWorkshopView } from './components/GrammarWorkshopView';
import { VideoAnalyzerView } from './components/VideoAnalyzerView';
import { NotesView } from './components/NotesView';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('vocab');
  const [reviewLaunchTrigger, setReviewLaunchTrigger] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [aiConfigured, setAiConfigured] = useState(() => hasUserApiKey());
  const [noteFocusId, setNoteFocusId] = useState<string | null>(null);

  const { notes, createNote, updateNote, deleteNote } = useNotesStore();

  const {
    vocabCards,
    stats,
    dailyPlan,
    chatMessages,
    checkins,
    todayCheckinSeconds,
    checkinTargetSeconds,
    setDailyVocabConfig,
    applyDailyDrawnWords,
    recordEbbinghausOutcome,
    recordVocabReview,
    updateVocabMem,
    hasWordInGarden,
    addVocabFromToken,
    addCustomVocab,
    importOfficialTopikWords,
    deleteVocabCard,
    markGrammarPracticed,
    awardActivityXp,
    appendChatMessage,
    clearChatMessages,
  } = useLearningStore();

  const {
    speakKorean,
    isKeyPlaying,
    isKeyLoading,
    audioNotice,
    clearAudioNotice,
    retryCloudTts,
    audioError,
    clearAudioError,
  } = useKoreanAudio();

  const gardenSummary = useMemo(() => computeGardenSummary(vocabCards), [vocabCards]);

  // 云端自动同步：指纹变化后静默上传（含打卡日历与每日练习时长）
  const syncVersion = useMemo(
    () =>
      [
        vocabCards.length,
        stats.xp,
        stats.todayReviewed,
        Math.floor(todayCheckinSeconds / 60),
        Object.keys(checkins).length,
        chatMessages.length,
        dailyPlan.drawnCardIds.length,
        dailyPlan.stage1ConfirmedIds.length,
        dailyPlan.stage3PassedIds.length,
        notes.length,
      ].join('|'),
    [
      vocabCards.length,
      stats.xp,
      stats.todayReviewed,
      todayCheckinSeconds,
      checkins,
      chatMessages.length,
      dailyPlan.drawnCardIds.length,
      dailyPlan.stage1ConfirmedIds.length,
      dailyPlan.stage3PassedIds.length,
      notes.length,
    ]
  );
  useAutoSync(syncVersion);

  const handleStartDailyReview = () => {
    setActiveTab('vocab');
    setReviewLaunchTrigger((n) => n + 1);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F8FA] text-slate-900">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onStartDailyReview={handleStartDailyReview}
        onOpenSettings={() => setSettingsOpen(true)}
        dueCount={gardenSummary.dueCount}
      />

      {!aiConfigured && (
        <div className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3">
          <div className="px-3.5 py-2.5 bg-amber-50 border border-amber-200 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
            <span className="flex items-center gap-2">
              <KeyRound className="w-3.5 h-3.5 shrink-0 text-amber-700" aria-hidden="true" />
              还差一把 DeepSeek API Key：填上之后 AI 陪练、发音纠错、语法造句、视频解析才能用。
            </span>
            <button
              type="button"
              onClick={() => setSettingsOpen(true)}
              className="font-semibold text-amber-800 hover:underline cursor-pointer shrink-0"
            >
              去填写
            </button>
          </div>
        </div>
      )}

      <DailyOverviewBar
        stats={stats}
        bloomedCount={gardenSummary.bloomedCount}
        totalVocabCount={gardenSummary.total}
      />

      {audioNotice && !audioError && (
        <div
          role="status"
          className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-3"
        >
          <div className="px-3.5 py-2.5 bg-blue-50/80 border border-blue-200/80 rounded-xl flex flex-wrap items-center justify-between gap-2 text-xs text-blue-900">
            <span className="flex items-center gap-2">
              <Info className="w-3.5 h-3.5 shrink-0 text-blue-700" aria-hidden="true" />
              {audioNotice}
            </span>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={retryCloudTts}
                className="font-semibold text-blue-700 hover:underline cursor-pointer"
              >
                重试高清韩语配音
              </button>
              <button
                type="button"
                onClick={clearAudioNotice}
                aria-label="关闭语音切换提示"
                className="text-blue-700 hover:text-blue-950 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {audioError && (
        <div
          role="alert"
          className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4"
        >
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between gap-3 text-xs text-amber-900">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-700" aria-hidden="true" />
              {audioError}
            </span>
            <button
              type="button"
              onClick={clearAudioError}
              aria-label="关闭语音错误提示"
              className="text-amber-700 hover:text-amber-950 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-7 sm:py-9">
        {activeTab === 'vocab' && (
          <VocabGardenView
            cards={vocabCards}
            stats={stats}
            dailyPlan={dailyPlan}
            autoLaunchTrigger={reviewLaunchTrigger}
            speakKorean={speakKorean}
            isKeyPlaying={isKeyPlaying}
            isKeyLoading={isKeyLoading}
            onSetDailyConfig={setDailyVocabConfig}
            onApplyDailyDrawnWords={applyDailyDrawnWords}
            onRecordEbbinghausOutcome={recordEbbinghausOutcome}
            onRecordReview={recordVocabReview}
            onUpdateMem={updateVocabMem}
            onAddCustomVocab={addCustomVocab}
            hasWordInGarden={hasWordInGarden}
            onImportOfficialTopikWords={importOfficialTopikWords}
            onDeleteCard={deleteVocabCard}
            checkins={checkins}
            todayCheckinSeconds={todayCheckinSeconds}
            checkinTargetSeconds={checkinTargetSeconds}
          />
        )}

        {activeTab === 'live' && (
          <LiveTutorCallView
            chatMessages={chatMessages}
            onAppendChatMessage={appendChatMessage}
            onClearChatMessages={clearChatMessages}
            speakKorean={speakKorean}
            isKeyLoading={isKeyLoading}
            isKeyPlaying={isKeyPlaying}
            hasWordInGarden={hasWordInGarden}
            onAddTokenToGarden={addVocabFromToken}
            onActivityComplete={awardActivityXp}
          />
        )}

        {activeTab === 'pronunciation' && (
          <PronunciationCoachView
            speakKorean={speakKorean}
            isKeyPlaying={isKeyPlaying}
            isKeyLoading={isKeyLoading}
            hasWordInGarden={hasWordInGarden}
            onAddTokenToGarden={addVocabFromToken}
            onActivityComplete={awardActivityXp}
          />
        )}

        {activeTab === 'grammar' && (
          <GrammarWorkshopView
            masteredGrammarIds={stats.masteredGrammarIds}
            speakKorean={speakKorean}
            isKeyLoading={isKeyLoading}
            isKeyPlaying={isKeyPlaying}
            onGrammarEvaluated={markGrammarPracticed}
            onSaveNote={(title, body, options) => {
              const id = createNote(title, body, ['语法']);
              setNoteFocusId(id);
              if (options?.open !== false) setActiveTab('notes');
            }}
          />
        )}

        {activeTab === 'video' && (
          <VideoAnalyzerView
            speakKorean={speakKorean}
            isKeyLoading={isKeyLoading}
            isKeyPlaying={isKeyPlaying}
            hasWordInGarden={hasWordInGarden}
            onAddTokenToGarden={addVocabFromToken}
            onActivityComplete={awardActivityXp}
          />
        )}

        {activeTab === 'notes' && (
          <NotesView
            notes={notes}
            onCreate={createNote}
            onUpdate={updateNote}
            onDelete={deleteNote}
            focusNoteId={noteFocusId}
          />
        )}
      </main>

      <footer className="border-t border-slate-200/80 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <span>한결 HanGyeol · TOPIK 词库与每日一以贯之的韩语沉浸伴学</span>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('vocab')}
              className="hover:text-slate-900 cursor-pointer"
            >
              每日背词
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('live')}
              className="hover:text-slate-900 cursor-pointer"
            >
              AI 陪练
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pronunciation')}
              className="hover:text-slate-900 cursor-pointer"
            >
              发音纠错
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('grammar')}
              className="hover:text-slate-900 cursor-pointer"
            >
              语法造句
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('video')}
              className="hover:text-slate-900 cursor-pointer"
            >
              视频解析
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('notes')}
              className="hover:text-slate-900 cursor-pointer"
            >
              笔记本
            </button>
          </div>
        </div>
      </footer>

      <AiSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onSaved={() => setAiConfigured(hasUserApiKey())}
      />
    </div>
  );
}
