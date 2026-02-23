import { useState } from 'react';
import { SYMPTOM_META } from '../types';
import clsx from 'clsx';

interface SymptomTrackerProps {
  initial?: Record<string, number>;
  onSave: (values: Record<string, number>) => Promise<void>;
  compact?: boolean;
}

const SYMPTOMS = Object.entries(SYMPTOM_META);

export default function SymptomTracker({ initial, onSave, compact }: SymptomTrackerProps) {
  const [values, setValues] = useState<Record<string, number>>(
    initial
      ? Object.fromEntries(SYMPTOMS.map(([k]) => [k, (initial as any)[k] ?? 5]))
      : Object.fromEntries(SYMPTOMS.map(([k]) => [k, 5]))
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(!!initial);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(values);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className={clsx('grid gap-3', compact ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2')}>
        {SYMPTOMS.map(([key, meta]) => (
          <div key={key}>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-sm font-medium text-slate-700">{meta.label}</label>
              <div className="flex items-center gap-1.5">
                <span
                  className="text-sm font-bold"
                  style={{ color: meta.color }}
                >
                  {values[key]}
                </span>
                <span className="text-xs text-slate-400">/ 10</span>
              </div>
            </div>
            <div className="relative">
              <input
                type="range"
                min={1}
                max={10}
                value={values[key]}
                onChange={e => {
                  setValues(v => ({ ...v, [key]: Number(e.target.value) }));
                  setSaved(false);
                }}
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, ${meta.color} 0%, ${meta.color} ${(values[key] - 1) / 9 * 100}%, #E2E8F0 ${(values[key] - 1) / 9 * 100}%, #E2E8F0 100%)`
                }}
              />
            </div>
            <div className="flex justify-between text-[10px] text-slate-400 mt-0.5">
              <span>{meta.positive ? 'None' : 'Mild'}</span>
              <span>{meta.positive ? 'Excellent' : 'Severe'}</span>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        disabled={saving || saved}
        className={clsx(
          'w-full py-2.5 rounded-xl text-sm font-medium transition-all',
          saved
            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            : 'btn-primary'
        )}
      >
        {saving ? 'Saving...' : saved ? '✓ Symptoms logged' : 'Log symptoms'}
      </button>
    </div>
  );
}
