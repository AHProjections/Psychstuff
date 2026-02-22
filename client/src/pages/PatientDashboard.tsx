import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import type { DashboardData } from '../types';
import Layout, { PageHeader } from '../components/Layout';
import InterventionCard from '../components/InterventionCard';
import SymptomTracker from '../components/SymptomTracker';
import { useAuth } from '../context/AuthContext';
import { Flame, CalendarCheck, HeartPulse, ChevronDown, ChevronUp, Sprout } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';

const GREETINGS = [
  'How are you feeling today?',
  'Ready for today\'s check-in?',
  'Every small step matters.',
  'Progress, not perfection.',
  'You\'re doing great — keep going.',
];

export default function PatientDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showSymptoms, setShowSymptoms] = useState(false);

  const load = useCallback(() => {
    api.getDashboard().then(d => {
      setData(d);
      setLoading(false);
    });
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCheckin = async (interventionId: number, completed: boolean) => {
    await api.logIntervention({ patient_intervention_id: interventionId, completed });
    load();
  };

  const handleLogSymptoms = async (values: Record<string, number>) => {
    await api.logSymptoms(values);
    load();
  };

  const greeting = GREETINGS[new Date().getDay() % GREETINGS.length];
  const today = data?.date ? format(parseISO(data.date), 'EEEE, MMMM d') : '';

  const completedToday = data?.interventions.filter(iv => iv.logged_today === 1).length ?? 0;
  const totalToday = data?.interventions.length ?? 0;
  const allDone = completedToday === totalToday && totalToday > 0;

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  if (!data) return null;

  return (
    <Layout>
      <div className="p-6 max-w-4xl mx-auto space-y-6">
        {/* Welcome hero */}
        <div className={clsx(
          'rounded-2xl p-6 text-white relative overflow-hidden',
          allDone
            ? 'bg-gradient-to-br from-emerald-500 to-teal-600'
            : 'bg-gradient-to-br from-indigo-600 to-indigo-800'
        )}>
          {/* Decorative circles */}
          <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full" />
          <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-white/5 rounded-full" />

          <p className="text-indigo-200 text-sm mb-1">{today}</p>
          <h1 className="text-2xl font-bold mb-1">Hi, {user?.name.split(' ')[0]} 👋</h1>
          <p className="text-indigo-100 text-sm mb-4">{greeting}</p>

          {/* Progress stats */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
              <CalendarCheck size={16} className="text-white" />
              <span className="text-sm font-medium">
                {completedToday}/{totalToday} done today
              </span>
            </div>
            {data.streak > 0 && (
              <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
                <Flame size={16} className="text-orange-300" />
                <span className="text-sm font-medium">{data.streak} day streak</span>
              </div>
            )}
            {data.provider && (
              <div className="flex items-center gap-2 bg-white/15 rounded-xl px-3 py-2">
                <HeartPulse size={16} className="text-white" />
                <span className="text-sm font-medium">{data.provider.name}</span>
              </div>
            )}
          </div>

          {allDone && (
            <div className="mt-4 bg-white/20 rounded-xl px-4 py-2 inline-flex items-center gap-2">
              <Sprout size={15} />
              <span className="text-sm font-semibold">All done for today — amazing work!</span>
            </div>
          )}
        </div>

        {/* Today's interventions */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-slate-700">Today's Check-in</h2>
            <span className="text-xs text-slate-400">
              {completedToday}/{totalToday} completed
            </span>
          </div>

          {data.interventions.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-slate-400 text-sm">
                No interventions assigned yet. Your provider will add them after your next session.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.interventions.map(iv => (
                <InterventionCard
                  key={iv.id}
                  intervention={iv}
                  onCheckin={handleCheckin}
                  showCheckin
                />
              ))}
            </div>
          )}
        </div>

        {/* Symptom tracker */}
        <div className="card overflow-hidden">
          <button
            onClick={() => setShowSymptoms(v => !v)}
            className="w-full flex items-center justify-between p-4 text-left"
          >
            <div className="flex items-center gap-3">
              <div className={clsx(
                'w-9 h-9 rounded-xl flex items-center justify-center',
                data.todaySymptoms ? 'bg-emerald-50' : 'bg-indigo-50'
              )}>
                <HeartPulse size={18} className={data.todaySymptoms ? 'text-emerald-500' : 'text-indigo-500'} />
              </div>
              <div>
                <p className="font-semibold text-slate-800 text-sm">Daily Symptom Check</p>
                <p className="text-xs text-slate-500">
                  {data.todaySymptoms ? 'Logged today — tap to update' : 'Log how you\'re feeling today'}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {data.todaySymptoms && (
                <span className="badge bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px]">✓ Logged</span>
              )}
              {showSymptoms ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
            </div>
          </button>

          {showSymptoms && (
            <div className="border-t border-slate-100 p-4">
              <SymptomTracker
                initial={data.todaySymptoms ? {
                  mood: data.todaySymptoms.mood ?? 5,
                  energy: data.todaySymptoms.energy ?? 5,
                  anxiety: data.todaySymptoms.anxiety ?? 5,
                  depression: data.todaySymptoms.depression ?? 5,
                  stress: data.todaySymptoms.stress ?? 5,
                  sleep_quality: data.todaySymptoms.sleep_quality ?? 5,
                  concentration: data.todaySymptoms.concentration ?? 5,
                } : undefined}
                onSave={handleLogSymptoms}
              />
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
