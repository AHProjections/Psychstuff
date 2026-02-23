import { CheckCircle2, Circle, Info, ChevronDown, ChevronUp, Flame } from 'lucide-react';
import { useState } from 'react';
import type { PatientIntervention } from '../types';
import { pct, gradeLabel } from '../utils';
import ProgressRing from './ProgressRing';
import clsx from 'clsx';

interface InterventionCardProps {
  intervention: PatientIntervention;
  onCheckin?: (id: number, completed: boolean) => void;
  showCheckin?: boolean;
  compact?: boolean;
}

const GRADE_STYLE: Record<string, string> = {
  A: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  B: 'bg-blue-50 text-blue-700 border-blue-200',
  C: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function InterventionCard({
  intervention: iv,
  onCheckin,
  showCheckin = false,
  compact = false,
}: InterventionCardProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [checking, setChecking] = useState(false);

  const weeklyGoal = iv.goal_value;
  const weeklyCompleted = iv.completed_this_week ?? 0;
  const weeklyPct = pct(weeklyCompleted, weeklyGoal);

  const totalCompleted = iv.total_completed ?? 0;
  const totalLogged = iv.total_logged ?? 0;
  const overallPct = pct(totalCompleted, totalLogged);

  const isCompletedToday = iv.logged_today === 1;
  const ringColor = isCompletedToday ? '#22C55E' : iv.color;

  const handleCheckin = async (done: boolean) => {
    if (!onCheckin || checking) return;
    setChecking(true);
    try {
      await onCheckin(iv.id, done);
    } finally {
      setChecking(false);
    }
  };

  // Compute a simple streak from start: if overall adherence is high, show streak estimate
  const daysSinceStart = Math.max(1,
    Math.round((Date.now() - new Date(iv.start_date).getTime()) / 86400000)
  );

  return (
    <div className={clsx('card p-4 flex flex-col gap-3', compact ? 'p-3' : 'p-4')}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
          style={{ backgroundColor: `${iv.color}20` }}
        >
          {iv.icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-slate-800 text-sm">{iv.name}</span>
            <span className={clsx('badge border text-[10px]', GRADE_STYLE[iv.evidence_grade])}>
              Grade {iv.evidence_grade} evidence
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Goal: <span className="font-medium text-slate-700">{weeklyGoal}× / week</span>
          </p>
        </div>

        {/* Progress ring (weekly) */}
        <ProgressRing value={weeklyPct} size={52} strokeWidth={5} color={ringColor} trackColor="#F1F5F9">
          <span className="text-xs font-bold text-slate-700">{weeklyPct}%</span>
        </ProgressRing>
      </div>

      {/* Weekly progress bar */}
      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>This week</span>
          <span className="font-medium">{weeklyCompleted}/{weeklyGoal} days</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${weeklyPct}%`, backgroundColor: weeklyPct >= 80 ? '#22C55E' : weeklyPct >= 50 ? '#F59E0B' : iv.color }}
          />
        </div>
      </div>

      {/* Overall adherence pill */}
      {totalLogged > 0 && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Overall adherence</span>
          <span className={clsx('font-semibold',
            overallPct >= 80 ? 'text-emerald-600' : overallPct >= 50 ? 'text-amber-600' : 'text-rose-500'
          )}>
            {overallPct}% ({totalLogged} days tracked)
          </span>
        </div>
      )}

      {/* Today's check-in button */}
      {showCheckin && onCheckin && (
        <div className="flex gap-2 pt-1 border-t border-slate-100">
          <button
            disabled={checking}
            onClick={() => handleCheckin(true)}
            className={clsx(
              'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all',
              isCompletedToday
                ? 'bg-emerald-500 text-white'
                : 'bg-slate-50 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700 border border-slate-200'
            )}
          >
            <CheckCircle2 size={15} />
            {isCompletedToday ? 'Done today!' : 'Mark done'}
          </button>
          {isCompletedToday && (
            <button
              disabled={checking}
              onClick={() => handleCheckin(false)}
              className="px-3 py-2 rounded-xl text-sm text-slate-400 hover:bg-slate-100 border border-slate-100 transition-all"
            >
              <Circle size={15} />
            </button>
          )}
        </div>
      )}

      {/* Expandable evidence info */}
      <button
        onClick={() => setShowInfo(v => !v)}
        className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-indigo-600 transition-colors self-start"
      >
        <Info size={12} />
        Why this works
        {showInfo ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>

      {showInfo && (
        <div className="bg-indigo-50 rounded-xl p-3 text-xs text-indigo-800 leading-relaxed border border-indigo-100">
          <p className="font-semibold mb-1 text-indigo-900">{gradeLabel(iv.evidence_grade)}</p>
          <p>{iv.evidence_summary}</p>
          {iv.provider_notes && (
            <div className="mt-2 pt-2 border-t border-indigo-200">
              <p className="font-semibold text-indigo-900 mb-0.5">Provider notes</p>
              <p className="italic">{iv.provider_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
