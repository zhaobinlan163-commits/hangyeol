import { BookOpen, Clock, Flame, Sparkles } from 'lucide-react';
import type { DailyStats } from '../types/learning';
import { computeDailyOverview } from '../utils/dailyOverview';

interface DailyOverviewBarProps {
  stats: DailyStats;
  bloomedCount: number;
  totalVocabCount: number;
}

export function DailyOverviewBar({
  stats,
  bloomedCount,
  totalVocabCount,
}: DailyOverviewBarProps) {
  const overview = computeDailyOverview(stats);

  return (
    <section
      aria-label="每日学习概览"
      data-testid="daily-overview-bar"
      className="bg-white border-b border-slate-200/80"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 lg:gap-6">
          {/* Left: 3 compact daily learning KPI metrics */}
          <div className="grid grid-cols-3 gap-2 sm:gap-6 flex-1">
            {/* 1. Today's XP Progress */}
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-blue-700 shrink-0" aria-hidden="true" />
              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2 text-xs">
                  <span className="font-medium text-slate-500">今日 XP</span>
                  <span className="font-semibold text-slate-900 tabular-nums">
                    {stats.todayXp}/{stats.dailyXpGoal}
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-label="今日 XP 完成进度"
                  aria-valuenow={overview.xpPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden mt-1.5"
                >
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      overview.goalCompleted ? 'bg-emerald-600' : 'bg-blue-700'
                    }`}
                    style={{ width: `${overview.xpPercent}%` }}
                  />
                </div>
              </div>
            </div>

            {/* 2. Words Memorized Today */}
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 sm:border-l sm:border-slate-200/80 sm:pl-6">
              <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-700 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">今日词</p>
                <p className="text-sm font-semibold text-slate-900 tabular-nums mt-0.5 truncate">
                  {stats.todayReviewed}{' '}
                  <span className="hidden sm:inline text-xs font-normal text-slate-500">
                    / {stats.dailyGoal} 词
                  </span>
                </p>
              </div>
            </div>

            {/* 3. Active Practice Duration */}
            <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 sm:border-l sm:border-slate-200/80 sm:pl-6">
              <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-slate-500">今日练习</p>
                <p
                  data-testid="daily-practice-duration"
                  className="text-sm font-semibold text-slate-900 tabular-nums mt-0.5 truncate"
                >
                  {overview.formattedDuration}{' '}
                  <span className="hidden sm:inline text-xs font-normal text-slate-500">
                    / {stats.dailyMinutesGoal} 分
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Right: Daily Streak & Encouragement Copy */}
          <div className="hidden lg:flex items-center gap-2 text-xs text-slate-600 lg:border-l lg:border-slate-200/80 lg:pl-6 lg:max-w-sm shrink-0">
            <Flame
              className={`w-4 h-4 shrink-0 ${
                overview.goalCompleted ? 'text-emerald-600' : 'text-amber-600'
              }`}
              aria-hidden="true"
            />
            <p className="leading-snug">{overview.encouragement}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
