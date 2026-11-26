import { Settings } from 'lucide-react';
import type { ActiveTab } from '../types/learning';

interface TopBarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onStartDailyReview: () => void;
  onOpenSettings: () => void;
  dueCount: number;
}

const NAV_ITEMS: Array<{ id: ActiveTab; label: string; short: string }> = [
  { id: 'vocab', label: '每日背词', short: '词' },
  { id: 'live', label: 'AI 陪练', short: 'AI' },
  { id: 'grammar', label: '语法造句', short: '语法' },
  { id: 'video', label: '视频解析', short: '视频' },
  { id: 'notes', label: '笔记本', short: '笔记' },
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
      <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8 h-12 sm:h-16 flex items-center justify-between gap-2 sm:gap-8">
        {/* Logo：手机上不带文字，只留图标 */}
        <button
          type="button"
          onClick={() => onSelectTab('vocab')}
          aria-label="한결 HanGyeol"
          className="flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer rounded"
        >
          <img
            src="/icon-192.png"
            alt=""
            width={26}
            height={26}
            className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg shadow-sm"
          />
          <span className="text-sm sm:text-lg font-bold tracking-tight text-slate-900">
            한결 HanGyeol
          </span>
        </button>

        {/* 手机上：五个短标签直接排在 logo 右边 */}
        <nav aria-label="主导航" className="flex md:hidden items-center gap-0.5 flex-1 justify-end">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelectTab(item.id)}
                className={`px-1.5 py-1 text-[11px] rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600'
                }`}
              >
                {item.short}
              </button>
            );
          })}
        </nav>

        {/* 桌面端：完整导航 */}
        <nav aria-label="主导航" className="hidden md:flex items-center gap-7 text-sm font-medium">
          {NAV_ITEMS.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                aria-current={isActive ? 'page' : undefined}
                onClick={() => onSelectTab(item.id)}
                className={`relative py-5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                  isActive ? 'text-blue-700 font-semibold' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {item.label}
                {isActive && (
                  <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-blue-700" />
                )}
              </button>
            );
          })}
        </nav>

        <div className="flex items-center shrink-0 gap-0.5 sm:gap-2">
          <button
            type="button"
            onClick={onOpenSettings}
            aria-label="打开设置"
            title="设置 API Key 与学习进度"
            className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Settings className="w-4 h-4 sm:w-5 sm:h-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onStartDailyReview}
            className="hidden sm:inline-flex px-3 py-1.5 text-xs sm:text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums"
          >
            {dueCount > 0 ? `复习 (${dueCount})` : '今日复习'}
          </button>
        </div>
      </div>
    </header>
  );
}
