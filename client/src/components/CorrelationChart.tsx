import {
  ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Area, ReferenceLine
} from 'recharts';
import type { SymptomLog } from '../types';
import { SYMPTOM_META } from '../types';
import { formatShortDate } from '../utils';
import { useState } from 'react';

interface CorrelationChartProps {
  symptoms: SymptomLog[];
  adherenceByDay: {
    log_date: string;
    name: string;
    color: string;
    icon: string;
    category: string;
    completed: number;
  }[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-xs max-w-[220px]">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-3 mb-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
            <span className="text-slate-600">{p.name}</span>
          </div>
          <span className="font-medium text-slate-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function CorrelationChart({ symptoms, adherenceByDay }: CorrelationChartProps) {
  const [selectedSymptoms, setSelectedSymptoms] = useState<string[]>(['mood', 'anxiety']);

  // Get unique interventions
  const interventionNames = [...new Set(adherenceByDay.map(a => a.name))];

  // Build daily data map
  const dayMap: Record<string, any> = {};

  for (const s of symptoms) {
    if (!dayMap[s.log_date]) dayMap[s.log_date] = { date: formatShortDate(s.log_date) };
    Object.entries(SYMPTOM_META).forEach(([key]) => {
      if ((s as any)[key] !== null) dayMap[s.log_date][key] = (s as any)[key];
    });
  }

  // Add adherence: per day, per intervention (1 = done, 0 = not done)
  for (const a of adherenceByDay) {
    if (!dayMap[a.log_date]) dayMap[a.log_date] = { date: formatShortDate(a.log_date) };
    // Convert to rolling 7-day %, but for per-day we'll just mark 0/1
    dayMap[a.log_date][`adh_${a.name}`] = a.completed ? 10 : 0; // scale to match symptoms
  }

  const data = Object.keys(dayMap).sort().map(k => dayMap[k]);

  // Compute 7-day rolling adherence
  const sortedDates = Object.keys(dayMap).sort();
  for (let i = 0; i < sortedDates.length; i++) {
    for (const name of interventionNames) {
      const window = sortedDates.slice(Math.max(0, i - 6), i + 1);
      const vals = window.map(d => dayMap[d]?.[`adh_${name}`] ?? null).filter(v => v !== null);
      if (vals.length > 0) {
        dayMap[sortedDates[i]][`roll_${name}`] = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
      }
    }
  }

  const symptomKeys = Object.keys(SYMPTOM_META);

  return (
    <div className="space-y-4">
      {/* Symptom selector */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Select symptoms to overlay:</p>
        <div className="flex flex-wrap gap-2">
          {symptomKeys.map(key => {
            const meta = SYMPTOM_META[key];
            const active = selectedSymptoms.includes(key);
            return (
              <button
                key={key}
                onClick={() => setSelectedSymptoms(prev =>
                  prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                )}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                  active ? 'text-white border-transparent' : 'bg-white text-slate-600 border-slate-200'
                }`}
                style={active ? { backgroundColor: meta.color, borderColor: meta.color } : {}}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: active ? 'rgba(255,255,255,0.7)' : meta.color }}
                />
                {meta.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main chart: symptoms over time */}
      <div>
        <p className="text-xs font-medium text-slate-500 mb-2">Symptom trends over time (1–10 scale)</p>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} />
            <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }}
              formatter={(v: string) => SYMPTOM_META[v]?.label ?? v}
            />
            {selectedSymptoms.map(key => (
              <Line
                key={key}
                type="monotone"
                dataKey={key}
                stroke={SYMPTOM_META[key].color}
                strokeWidth={2}
                dot={false}
                name={key}
                connectNulls
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Adherence chart */}
      {interventionNames.length > 0 && (
        <div>
          <p className="text-xs font-medium text-slate-500 mb-2">7-day rolling intervention adherence</p>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={data} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false} />
              <YAxis domain={[0, 10]} tick={{ fontSize: 11, fill: '#94A3B8' }} tickLine={false}
                tickFormatter={v => `${v * 10}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              {interventionNames.slice(0, 4).map((name, i) => {
                const color = adherenceByDay.find(a => a.name === name)?.color ?? '#6366F1';
                return (
                  <Area
                    key={name}
                    type="monotone"
                    dataKey={`roll_${name}`}
                    stroke={color}
                    fill={`${color}20`}
                    strokeWidth={1.5}
                    dot={false}
                    name={name}
                    connectNulls
                  />
                );
              })}
            </ComposedChart>
          </ResponsiveContainer>
          <p className="text-[10px] text-slate-400 text-center mt-1">
            0% = never completed · 100% = completed every day in that window
          </p>
        </div>
      )}
    </div>
  );
}
