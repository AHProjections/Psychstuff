import { format, parseISO, differenceInDays } from 'date-fns';

export function formatDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export function formatShortDate(dateStr: string): string {
  try {
    return format(parseISO(dateStr), 'MMM d');
  } catch {
    return dateStr;
  }
}

export function daysAgo(dateStr: string): number {
  try {
    return differenceInDays(new Date(), parseISO(dateStr));
  } catch {
    return 0;
  }
}

export function pct(num: number, den: number): number {
  if (!den) return 0;
  return Math.round((num / den) * 100);
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function initials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

export function gradeLabel(grade: string): string {
  return { A: 'Strong evidence', B: 'Moderate evidence', C: 'Emerging evidence' }[grade] ?? grade;
}

export function adherenceColor(pct: number): string {
  if (pct >= 80) return 'text-emerald-600';
  if (pct >= 50) return 'text-amber-600';
  return 'text-rose-600';
}

export function adherenceBg(pct: number): string {
  if (pct >= 80) return 'bg-emerald-50 border-emerald-200';
  if (pct >= 50) return 'bg-amber-50 border-amber-200';
  return 'bg-rose-50 border-rose-200';
}

export function moodLabel(score: number): string {
  if (score >= 8) return 'Great';
  if (score >= 6) return 'Good';
  if (score >= 4) return 'Fair';
  if (score >= 2) return 'Low';
  return 'Very low';
}
