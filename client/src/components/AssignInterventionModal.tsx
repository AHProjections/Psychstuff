import { useState, useEffect } from 'react';
import { X, Search } from 'lucide-react';
import { api } from '../api/client';
import type { InterventionType } from '../types';
import clsx from 'clsx';

interface Props {
  patientId: number;
  onClose: () => void;
  onAssigned: () => void;
}

const GRADE_STYLE: Record<string, string> = {
  A: 'bg-emerald-50 text-emerald-700',
  B: 'bg-blue-50 text-blue-700',
  C: 'bg-amber-50 text-amber-700',
};

export default function AssignInterventionModal({ patientId, onClose, onAssigned }: Props) {
  const [types, setTypes] = useState<InterventionType[]>([]);
  const [selected, setSelected] = useState<InterventionType | null>(null);
  const [goalValue, setGoalValue] = useState(3);
  const [goalFrequency, setGoalFrequency] = useState<'weekly' | 'daily'>('weekly');
  const [notes, setNotes] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getInterventionTypes().then(({ types }) => setTypes(types));
  }, []);

  const filtered = types.filter(t =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.category.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!selected) return;
    setSaving(true);
    setError('');
    try {
      await api.assignIntervention({
        patient_id: patientId,
        intervention_type_id: selected.id,
        goal_value: goalValue,
        goal_frequency: goalFrequency,
        provider_notes: notes || undefined,
      });
      onAssigned();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800">Assign Intervention</h2>
            <p className="text-xs text-slate-500 mt-0.5">Select an evidence-based intervention and set a goal</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-8"
              placeholder="Search interventions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          {/* Intervention list */}
          {!selected ? (
            <div className="space-y-2">
              {filtered.map(type => (
                <button
                  key={type.id}
                  onClick={() => setSelected(type)}
                  className="w-full text-left card p-3 hover:border-indigo-200 hover:bg-indigo-50/30 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ backgroundColor: `${type.color}20` }}
                    >
                      {type.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800">{type.name}</span>
                        <span className={clsx('badge text-[10px]', GRADE_STYLE[type.evidence_grade])}>
                          Grade {type.evidence_grade}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">{type.description}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            /* Goal configuration */
            <div className="space-y-4">
              {/* Selected intervention summary */}
              <div className="card p-3 bg-indigo-50/50 border-indigo-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${selected.color}20` }}>
                    {selected.icon}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{selected.name}</p>
                    <button onClick={() => setSelected(null)} className="text-xs text-indigo-600 hover:underline">
                      Change
                    </button>
                  </div>
                </div>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed">{selected.evidence_summary}</p>
              </div>

              {/* Goal frequency */}
              <div>
                <label className="label">Goal Frequency</label>
                <div className="flex gap-2">
                  {(['weekly', 'daily'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setGoalFrequency(f)}
                      className={clsx(
                        'flex-1 py-2 rounded-xl text-sm font-medium border transition-all',
                        goalFrequency === f
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                      )}
                    >
                      {f.charAt(0).toUpperCase() + f.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Goal value */}
              <div>
                <label className="label">
                  Days per {goalFrequency === 'weekly' ? 'week' : 'day'} (goal)
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={1}
                    max={goalFrequency === 'weekly' ? 7 : 1}
                    value={goalValue}
                    onChange={e => setGoalValue(Number(e.target.value))}
                    className="flex-1"
                  />
                  <span className="text-lg font-bold text-indigo-600 w-8 text-center">{goalValue}</span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Target: {goalValue} {goalValue === 1 ? 'day' : 'days'}/{goalFrequency === 'weekly' ? 'week' : 'day'}
                </p>
              </div>

              {/* Provider notes */}
              <div>
                <label className="label">Notes for patient (optional)</label>
                <textarea
                  className="input resize-none"
                  rows={3}
                  placeholder="Any specific instructions, modifications, or encouragement..."
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                />
              </div>

              {error && <p className="text-sm text-rose-600">{error}</p>}
            </div>
          )}
        </div>

        {/* Footer */}
        {selected && (
          <div className="p-5 border-t border-slate-100">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="btn-primary w-full justify-center py-2.5"
            >
              {saving ? 'Assigning...' : 'Assign Intervention'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
