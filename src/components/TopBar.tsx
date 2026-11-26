import { Settings } from 'lucide-react';
import type { ActiveTab } from '../types/learning';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onStartDailyReview: () => void;
  onOpenSettings: () => void;
  dueCount: number;
}

const NAV_ITEMS: Array<{ id: ActiveTab; label: string }> = [
  { id: 'vocab', label: '每日背词' },
  { id: 'live', label: 'AI 陪练' },
  { id: 'grammar', label: '语法造句' },
  { id: 'video', label: '视频解析' },
  { id: 'notes', label: '笔记本' },
];

export function TopBar({
  activeTab,
  onSelectTab,
  onStartDailyReview,
  onOpenSettings,
  dueCount,
}: TopBarProps) {
  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3 sm:gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onSelectTab('vocab')}
          className="flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 rounded"
        >
          <img
            src="/icon-192.png"
            alt=""
            width={28}
            height={28}
            className="w-7 h-7 rounded-lg shadow-sm"
          />
          <span className="text-lg font-bold tracking-tight text-slate-900">한결 HanGyeol</span>
        </button>

        {/* Zone 2: 4 clean single-line navigation links */}
        <nav
          aria-label="主导航"
          className="hidden md:flex items-center gap-7 text-sm font-medium"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelectTab(item.id)}
                className={`relative py-5 whitespace-nowrap shrink-0 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 ${
                  isActive
                    ? 'text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span
                    aria-hidden="true"
                    className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-700"
                  />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Single primary action */}
        <div className="flex items-center shrink-0 gap-2">
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="打开设置"
            title="设置 API Key 与学习进度"
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onStartDailyReview}
            className="px-3 py-1.5 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700 tabular-nums"
          >
            {dueCount > 0 ? `复习 (${dueCount})` : '今日复习'}
          </button>
        </div>
      </div>

      {/* Compact single-row mobile navigation (<= 44px height) */}
      <nav
        aria-label="移动端主导航"
        className="flex md:hidden items-center gap-0.5 border-t border-slate-100 px-1 bg-white overflow-x-auto"
      >
        {NAV_ITEMS.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              aria-current={isActive ? 'page' : undefined}
              onClick={() => onSelectTab(item.id)}
              className={`min-h-[44px] flex-1 px-1 text-[11px] font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors ${
                isActive
                  ? 'border-blue-700 text-blue-700 font-semibold'
                  : 'border-transparent text-slate-600'
              }`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </header>
  );
}
