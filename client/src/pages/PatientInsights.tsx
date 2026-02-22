import { useEffect, useState } from 'react';
import { api } from '../api/client';
import Layout, { PageHeader } from '../components/Layout';
import CorrelationChart from '../components/CorrelationChart';
import type { SymptomLog } from '../types';
import { SYMPTOM_META } from '../types';
import { formatShortDate } from '../utils';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';
import clsx from 'clsx';

type Period = 14 | 30 | 60;

interface InsightData {
  symptoms: SymptomLog[];
  adherenceByDay: { log_date: string; name: string; color: string; icon: string; category: string; completed: number }[];
  weeklyAdherence: { week: string; name: string; color: string; adherence_pct: number }[];
}

function trend(data: number[]): 'up' | 'down' | 'flat' {
  if (data.length < 4) return 'flat';
  const first = data.slice(0, Math.floor(data.length / 2)).reduce((a, b) => a + b, 0) / Math.floor(data.length / 2);
  const last = data.slice(Math.floor(data.length / 2)).reduce((a, b) => a + b, 0) / Math.ceil(data.length / 2);
  const diff = last - first;
  if (Math.abs(diff) < 0.5) return 'flat';
  return diff > 0 ? 'up' : 'down';
}

export default function PatientInsights() {
  const [period, setPeriod] = useState<Period>(30);
  const [data, setData] = useState<InsightData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.getInsights(period).then(d => {
      setData(d);
      setLoading(false);
    });
  }, [period]);

  // Compute adherence per intervention
  const interventionSummary = data
    ? (() => {
        const map: Record<string, { name: string; color: string; icon: string; days: number; done: number }> = {};
        for (const d of data.adherenceByDay) {
          if (!map[d.name]) map[d.name] = { name: d.name, color: d.color, icon: d.icon, days: 0, done: 0 };
          map[d.name].days++;
          if (d.completed) map[d.name].done++;
        }
        return Object.values(map);
      })()
    : [];

  // Compute symptom averages for first vs last half
  const symptomSummary = data?.symptoms.length
    ? (() => {
        const syms = data.symptoms;
        const half = Math.floor(syms.length / 2);
        return Object.entries(SYMPTOM_META).map(([key, meta]) => {
          const vals = syms.map(s => (s as any)[key]).filter((v: any) => v != null) as number[];
          const firstHalf = syms.slice(0, half).map(s => (s as any)[key]).filter((v: any) => v != null) as number[];
          const lastHalf = syms.slice(half).map(s => (s as any)[key]).filter((v: any) => v != null) as number[];
          const avg = vals.length ? vals.reduce((a, b) => a + b) / vals.length : null;
          const firstAvg = firstHalf.length ? firstHalf.reduce((a, b) => a + b) / firstHalf.length : null;
          const lastAvg = lastHalf.length ? lastHalf.reduce((a, b) => a + b) / lastHalf.length : null;
          const t = trend(vals);
          return { key, meta, avg, firstAvg, lastAvg, trend: t };
        });
      })()
    : [];

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <PageHeader
          title="My Insights"
          subtitle="See how your habits correlate with how you feel"
          actions={
            <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
              {([14, 30, 60] as Period[]).map(p => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={clsx(
                    'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    period === p ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {p}d
                </button>
              ))}
            </div>
          }
        />

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !data || data.symptoms.length === 0 ? (
          <div className="card p-12 text-center">
            <p className="text-slate-400">No data yet — start logging daily check-ins and symptoms to see your trends.</p>
          </div>
        ) : (
          <>
            {/* Symptom snapshot */}
            <div className="card p-5">
              <h2 className="font-semibold text-slate-700 text-sm mb-4">Symptom Snapshot</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {symptomSummary.map(({ key, meta, avg, trend: t, firstAvg, lastAvg }) => {
                  if (avg == null) return null;
                  const isPositive = meta.positive;
                  const improving = (isPositive && t === 'up') || (!isPositive && t === 'down');
                  const worsening = (isPositive && t === 'down') || (!isPositive && t === 'up');
                  return (
                    <div key={key} className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-500 font-medium">{meta.label}</span>
                        <span className={clsx(
                          'flex items-center gap-0.5',
                          improving ? 'text-emerald-500' : worsening ? 'text-rose-400' : 'text-slate-400'
                        )}>
                          {t === 'up' ? <TrendingUp size={12} /> : t === 'down' ? <TrendingDown size={12} /> : <Minus size={12} />}
                        </span>
                      </div>
                      <p className="text-2xl font-bold" style={{ color: meta.color }}>
                        {avg.toFixed(1)}
                      </p>
                      <p className="text-[10px] text-slate-400">/ 10 avg</p>
                      {firstAvg != null && lastAvg != null && (
                        <p className={clsx(
                          'text-[10px] mt-1 font-medium',
                          improving ? 'text-emerald-600' : worsening ? 'text-rose-500' : 'text-slate-400'
                        )}>
                          {improving ? '↑ Improving' : worsening ? '↓ Worsening' : '→ Stable'}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Intervention adherence */}
            {interventionSummary.length > 0 && (
              <div className="card p-5">
                <h2 className="font-semibold text-slate-700 text-sm mb-4">Intervention Adherence ({period} days)</h2>
                <div className="space-y-3">
                  {interventionSummary.map(iv => {
                    const adhPct = Math.round((iv.done / iv.days) * 100);
                    return (
                      <div key={iv.name}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-base">{iv.icon}</span>
                            <span className="text-sm font-medium text-slate-700">{iv.name}</span>
                          </div>
                          <span className={clsx(
                            'text-sm font-bold',
                            adhPct >= 80 ? 'text-emerald-600' : adhPct >= 50 ? 'text-amber-600' : 'text-rose-500'
                          )}>
                            {adhPct}%
                          </span>
                        </div>
                        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${adhPct}%`,
                              backgroundColor: adhPct >= 80 ? '#22C55E' : adhPct >= 50 ? '#F59E0B' : iv.color,
                            }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{iv.done} of {iv.days} days completed</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Correlation chart */}
            <div className="card p-5">
              <div className="flex items-start gap-2 mb-1">
                <h2 className="font-semibold text-slate-700 text-sm">Behaviors & Symptoms Over Time</h2>
              </div>
              <div className="flex items-center gap-1.5 mb-4 p-2.5 bg-indigo-50 rounded-xl border border-indigo-100">
                <Info size={13} className="text-indigo-500 flex-shrink-0" />
                <p className="text-xs text-indigo-700">
                  This chart shows how your symptoms change alongside your intervention adherence. Look for patterns where completing more interventions aligns with improved symptoms.
                </p>
              </div>
              <CorrelationChart
                symptoms={data.symptoms}
                adherenceByDay={data.adherenceByDay}
              />
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
