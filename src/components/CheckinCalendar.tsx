import { useMemo, useState } from 'react';
import { CalendarCheck, Check, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { getTodayDateKey } from '../utils/korean';

interface CheckinCalendarProps {
  checkins: Record<string, number>;
  todaySeconds: number;
  targetSeconds: number;
  streakDays: number;
}

const WEEKDAY_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

function dateKey(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export function CheckinCalendar({
  checkins,
  todaySeconds,
  targetSeconds,
  streakDays,
}: CheckinCalendarProps) {
  const todayKey = getTodayDateKey();
  const [monthOffset, setMonthOffset] = useState(0);

  const view = useMemo(() => {
    const base = new Date(`${todayKey}T00:00:00`);
    const first = new Date(base.getFullYear(), base.getMonth() + monthOffset, 1);
    const year = first.getFullYear();
    const month = first.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startWeekday = first.getDay();

    const cells: Array<{ key: string; day: number } | null> = [];
    for (let i = 0; i < startWeekday; i += 1) cells.push(null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      cells.push({ key: dateKey(year, month, day), day });
    }
    return { year, month, cells };
  }, [monthOffset, todayKey]);

  const monthCheckedCount = useMemo(
    () =>
      view.cells.reduce((count, cell) => {
        if (!cell) return count;
        return (checkins[cell.key] || 0) >= targetSeconds ? count + 1 : count;
      }, 0),
    [view.cells, checkins, targetSeconds]
  );

  const todayPercent = Math.min(100, Math.round((todaySeconds / targetSeconds) * 100));
  const checkedInToday = todaySeconds >= targetSeconds;

  return (
    <section
      aria-label="打卡日历"
      className="bg-white border border-slate-200 rounded-2xl p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-emerald-700" aria-hidden="true" />
            打卡日历
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            每天练满 {Math.round(targetSeconds / 60)} 分钟自动打卡，不用手动点。
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1 font-semibold text-amber-700 tabular-nums">
            <Flame className="w-3.5 h-3.5" aria-hidden="true" />
            连续 {streakDays} 天
          </span>
          <span className="text-slate-500 tabular-nums">本月 {monthCheckedCount} 天</span>
        </div>
      </div>

      <div className="mt-4 flex flex-col lg:flex-row gap-6">
        {/* Month grid */}
        <div className="w-full max-w-xs shrink-0">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setMonthOffset((v) => v - 1)}
              aria-label="上个月"
              className="p-1 rounded-md text-slate-500 hover:bg-slate-100 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-semibold text-slate-700 tabular-nums">
              {view.year} 年 {view.month + 1} 月
            </span>
            <button
              type="button"
              onClick={() => setMonthOffset((v) => Math.min(0, v + 1))}
              disabled={monthOffset >= 0}
              aria-label="下个月"
              className="p-1 rounded-md text-slate-500 hover:bg-slate-100 disabled:opacity-30 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label} className="text-[10px] font-medium text-slate-400 py-1">
                {label}
              </span>
            ))}
            {view.cells.map((cell, index) => {
              if (!cell) return <span key={`blank-${index}`} />;
              const seconds = checkins[cell.key] || 0;
              const checked = seconds >= targetSeconds;
              const isToday = cell.key === todayKey;
              const isFuture = cell.key > todayKey;
              return (
                <span
                  key={cell.key}
                  title={`${cell.key} · ${Math.floor(seconds / 60)} 分钟${
                    checked ? ' · 已打卡' : ''
                  }`}
                  className={`aspect-square flex items-center justify-center rounded-md text-[11px] tabular-nums ${
                    checked
                      ? 'bg-emerald-600 text-white font-semibold'
                      : isToday
                        ? 'border border-blue-600 text-blue-700 font-semibold'
                        : isFuture
                          ? 'text-slate-300'
                          : seconds > 0
                            ? 'bg-emerald-50 text-emerald-800'
                            : 'text-slate-500'
                  }`}
                >
                  {checked ? <Check className="w-3 h-3" aria-hidden="true" /> : cell.day}
                </span>
              );
            })}
          </div>
        </div>

        {/* Today's progress */}
        <div className="flex-1 min-w-0 lg:border-l lg:border-slate-100 lg:pl-6">
          <p className="text-xs font-medium text-slate-500">今日进度</p>
          <p className="mt-1 text-sm font-semibold text-slate-900 tabular-nums">
            {Math.floor(todaySeconds / 60)} 分 {todaySeconds % 60} 秒
            <span className="text-xs font-normal text-slate-500">
              {' '}
              / {Math.round(targetSeconds / 60)} 分钟
            </span>
          </p>
          <div
            role="progressbar"
            aria-label="今日打卡进度"
            aria-valuenow={todayPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="mt-2 w-full h-2 bg-slate-100 rounded-full overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                checkedInToday ? 'bg-emerald-600' : 'bg-blue-700'
              }`}
              style={{ width: `${todayPercent}%` }}
            />
          </div>
          <p className="mt-2 text-xs leading-relaxed text-slate-600">
            {checkedInToday
              ? '今天的打卡已完成，明天继续。'
              : `再练 ${Math.max(
                  0,
                  Math.ceil((targetSeconds - todaySeconds) / 60)
                )} 分钟就能完成今日打卡。`}
          </p>
        </div>
      </div>
    </section>
  );
}
