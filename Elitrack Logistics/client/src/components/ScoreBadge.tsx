import type { CSSProperties } from 'react';
import './ScoreBadge.css';

type ScoreBadgeProps = {
  score: number;
  size?: 'sm' | 'md' | 'lg';
};

const SIZE_MAP: Record<NonNullable<ScoreBadgeProps['size']>, number> = {
  sm: 48,
  md: 64,
  lg: 84,
};

const scoreColor = (score: number): string => {
  if (score >= 90) {
    return '#16a34a';
  }

  if (score >= 70) {
    return '#f59e0b';
  }

  if (score >= 50) {
    return '#f97316';
  }

  return '#ef4444';
};

export function ScoreBadge({ score, size = 'md' }: ScoreBadgeProps) {
  const normalizedScore = Math.max(0, Math.min(100, Math.round(score)));
  const color = scoreColor(normalizedScore);

  const style = {
    '--score-badge-size': `${SIZE_MAP[size]}px`,
    '--score-badge-color': color,
    '--score-badge-value': `${normalizedScore}`,
  } as CSSProperties;

  return (
    <div className="score-badge" style={style} aria-label={`Driver score ${normalizedScore}`}>
      <div className="score-badge__inner">
        <span className="score-badge__value">{normalizedScore}</span>
      </div>
    </div>
  );
}
