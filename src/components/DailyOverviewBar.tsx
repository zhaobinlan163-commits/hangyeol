import type { DailyStats } from '../types/learning';
import { computeDailyOverview } from '../utils/dailyOverview';

interface DailyOverviewBarProps {
  stats: DailyStats;
  bloomedCount: number;
  totalVocabCount: number;
}

export function DailyOverviewBar({ stats }: DailyOverviewBarProps) {
  const overview = computeDailyOverview(stats);

  return (
    <section
      aria-label="每日学习概览"
      data-testid="daily-overview-bar"
      className="bg-white border-b border-slate-200/80"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-1.5">
        <div className="grid grid-cols-3 gap-2 text-[11px] sm:text-xs text-slate-600">
          <span className="flex items-baseline gap-1 min-w-0">
            <span className="text-slate-500 shrink-0">XP</span>
            <span className="font-semibold text-slate-900 tabular-nums truncate">
              {stats.todayXp}/{stats.dailyXpGoal}
            </span>
          </span>
          <span className="flex items-baseline gap-1 min-w-0">
            <span className="text-slate-500 shrink-0">词</span>
            <span className="font-semibold text-slate-900 tabular-nums truncate">
              {stats.todayReviewed}/{stats.dailyGoal}
            </span>
          </span>
          <span className="flex items-baseline gap-1 min-w-0">
            <span className="text-slate-500 shrink-0">练习</span>
            <span
              data-testid="daily-practice-duration"
              className="font-semibold text-slate-900 tabular-nums truncate"
            >
              {overview.formattedDuration}
            </span>
          </span>
        </div>
      </div>
    </section>
  );
}
