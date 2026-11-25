import type { DailyStats } from '../types/learning';

export interface DailyOverviewMetrics {
  xpPercent: number;
  wordsPercent: number;
  minutesStudied: number;
  minutesPercent: number;
  formattedDuration: string;
  encouragement: string;
  goalCompleted: boolean;
}

export function formatPracticeDuration(totalSeconds: number): string {
  const safeSec = Math.max(0, Math.floor(totalSeconds));
  const mins = Math.floor(safeSec / 60);
  const secs = safeSec % 60;
  if (mins === 0) {
    return `${secs} 秒`;
  }
  if (mins < 60) {
    return `${mins} 分 ${String(secs).padStart(2, '0')} 秒`;
  }
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return `${hours} 小时 ${remMins} 分`;
}

export function computeDailyOverview(stats: DailyStats): DailyOverviewMetrics {
  const xpGoal = Math.max(1, stats.dailyXpGoal || 150);
  const wordsGoal = Math.max(1, stats.dailyGoal || 12);
  const minutesGoal = Math.max(1, stats.dailyMinutesGoal || 15);

  const todayXp = Math.max(0, stats.todayXp ?? 0);
  const todayWords = Math.max(0, stats.todayReviewed ?? 0);
  const practiceSec = Math.max(0, stats.todayPracticeSeconds ?? 0);
  const minutesStudied = Math.floor(practiceSec / 60);

  const xpPercent = Math.min(100, Math.round((todayXp / xpGoal) * 100));
  const wordsPercent = Math.min(100, Math.round((todayWords / wordsGoal) * 100));
  const minutesPercent = Math.min(100, Math.round((practiceSec / (minutesGoal * 60)) * 100));

  const wordsRemaining = Math.max(0, wordsGoal - todayWords);
  const xpRemaining = Math.max(0, xpGoal - todayXp);
  const goalCompleted = todayXp >= xpGoal && todayWords >= wordsGoal;

  let encouragement: string;
  const checkedIn = practiceSec >= minutesGoal * 60;
  if (goalCompleted) {
    encouragement = `今日目标全部完成，已打卡。连续打卡 ${stats.streakDays} 天，保持这份首尔语感。`;
  } else if (checkedIn) {
    encouragement = `今日已打卡（练满 ${minutesGoal} 分钟），连续打卡 ${stats.streakDays} 天。`;
  } else if (todayWords === 0 && todayXp === 0) {
    encouragement = '今天还没开始：先学几个新词，练满 15 分钟就算打卡。';
  } else if (wordsRemaining > 0 && wordsRemaining <= 4) {
    encouragement = `离今日背词目标只差 ${wordsRemaining} 词，再练 ${Math.max(
      0,
      Math.ceil((minutesGoal * 60 - practiceSec) / 60)
    )} 分钟就能打卡。`;
  } else if (xpRemaining > 0 && xpRemaining <= 40) {
    encouragement = `再获得 ${xpRemaining} XP 即可点亮今日 XP 进度条，继续加油！`;
  } else {
    encouragement = `已连续打卡 ${stats.streakDays} 天 · 今日再练 ${Math.max(
      0,
      Math.ceil((minutesGoal * 60 - practiceSec) / 60)
    )} 分钟完成打卡。`;
  }

  return {
    xpPercent,
    wordsPercent,
    minutesStudied,
    minutesPercent,
    formattedDuration: formatPracticeDuration(practiceSec),
    encouragement,
    goalCompleted,
  };
}
