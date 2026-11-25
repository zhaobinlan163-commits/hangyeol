import type { GrowthStage } from '../types/learning';
import { GROWTH_STAGES } from '../utils/srs';

interface GrowthStageIconProps {
  stage: GrowthStage;
  showText?: boolean;
}

export function GrowthStageIcon({ stage, showText = true }: GrowthStageIconProps) {
  const info = GROWTH_STAGES[stage];

  const colorClass =
    stage === 5
      ? 'text-emerald-700'
      : stage >= 3
      ? 'text-teal-700'
      : stage >= 1
      ? 'text-blue-700'
      : 'text-slate-400';

  return (
    <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${colorClass}`}>
      <svg
        width="16"
        height="16"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className="shrink-0"
      >
        {stage === 0 && (
          <ellipse cx="10" cy="12" rx="4" ry="5" stroke="currentColor" strokeWidth="1.6" />
        )}
        {stage === 1 && (
          <>
            <path d="M10 16V10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M10 11C10 8.5 12.2 7 14.5 7C14.5 9.5 12.5 11 10 11Z" stroke="currentColor" strokeWidth="1.5" />
          </>
        )}
        {stage === 2 && (
          <>
            <path d="M10 16V8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M10 11C10 8.5 7.8 7 5.5 7C5.5 9.5 7.5 11 10 11Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 9C10 6.5 12.2 5 14.5 5C14.5 7.5 12.5 9 10 9Z" stroke="currentColor" strokeWidth="1.5" />
          </>
        )}
        {stage === 3 && (
          <>
            <path d="M10 17V6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M10 12C10 9.5 7.4 8 5 8C5 10.6 7.2 12 10 12Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" />
            <path d="M10 9.5C10 7 12.6 5.5 15 5.5C15 8.1 12.8 9.5 10 9.5Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" />
          </>
        )}
        {stage === 4 && (
          <>
            <path d="M10 17V9" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <path d="M10 13C10 11 7.6 9.8 5.5 9.8C5.5 11.8 7.5 13 10 13Z" stroke="currentColor" strokeWidth="1.4" />
            <path d="M10 9C8 9 6.8 7.2 7.5 5.2C8.3 3.8 10 3 10 3C10 3 11.7 3.8 12.5 5.2C13.2 7.2 12 9 10 9Z" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5" />
          </>
        )}
        {stage === 5 && (
          <>
            <path d="M10 17V10.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
            <circle cx="10" cy="7" r="2.2" fill="currentColor" />
            <circle cx="10" cy="3.6" r="1.7" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="13.2" cy="5.8" r="1.7" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="12" cy="9.4" r="1.7" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="8" cy="9.4" r="1.7" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="6.8" cy="5.8" r="1.7" stroke="currentColor" strokeWidth="1.4" />
          </>
        )}
      </svg>
      {showText && (
        <span className="tabular-nums whitespace-nowrap">
          {info.shortLabel} {stage}/5
        </span>
      )}
    </span>
  );
}
