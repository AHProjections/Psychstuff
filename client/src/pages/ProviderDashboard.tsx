import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import type { Patient } from '../types';
import Layout, { PageHeader } from '../components/Layout';
import { Users, AlertCircle, CheckCircle2, Clock, TrendingUp, ChevronRight } from 'lucide-react';
import { formatDate, daysAgo, pct, initials } from '../utils';
import clsx from 'clsx';

export default function ProviderDashboard() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPatients().then(({ patients }) => {
      setPatients(patients);
      setLoading(false);
    });
  }, []);

  const totalPatients = patients.length;
  const activeThisWeek = patients.filter(p => p.last_checkin && daysAgo(p.last_checkin) <= 7).length;
  const needsAttention = patients.filter(p => !p.last_checkin || daysAgo(p.last_checkin) > 7).length;

  function adherencePct(p: Patient) {
    return pct(p.logs_7d ?? 0, p.possible_7d ?? 1);
  }

  function statusColor(p: Patient) {
    if (!p.last_checkin || daysAgo(p.last_checkin) > 7) return { bg: 'bg-rose-50 border-rose-100', dot: 'bg-rose-400', label: 'Inactive', icon: <AlertCircle size={13} className="text-rose-500" /> };
    if (daysAgo(p.last_checkin) > 3) return { bg: 'bg-amber-50 border-amber-100', dot: 'bg-amber-400', label: 'Low activity', icon: <Clock size={13} className="text-amber-500" /> };
    return { bg: 'bg-emerald-50 border-emerald-100', dot: 'bg-emerald-400', label: 'Active', icon: <CheckCircle2 size={13} className="text-emerald-500" /> };
  }

  if (loading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
      </div>
    </Layout>
  );

  return (
    <Layout>
      <div className="p-6 max-w-5xl mx-auto">
        <PageHeader
          title="Provider Dashboard"
          subtitle="Monitor your patients' treatment progress"
        />

        {/* Summary cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Total Patients', value: totalPatients, icon: <Users size={18} className="text-indigo-500" />, bg: 'bg-indigo-50' },
            { label: 'Active This Week', value: activeThisWeek, icon: <CheckCircle2 size={18} className="text-emerald-500" />, bg: 'bg-emerald-50' },
            { label: 'Needs Follow-up', value: needsAttention, icon: <AlertCircle size={18} className="text-rose-500" />, bg: 'bg-rose-50' },
          ].map(card => (
            <div key={card.label} className="card p-4">
              <div className={clsx('w-9 h-9 rounded-xl flex items-center justify-center mb-3', card.bg)}>
                {card.icon}
              </div>
              <p className="text-2xl font-bold text-slate-800">{card.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{card.label}</p>
            </div>
          ))}
        </div>

        {/* Patient list */}
        <div className="space-y-3">
          <h2 className="font-semibold text-slate-700 text-sm">Your Patients</h2>
          {patients.map(patient => {
            const status = statusColor(patient);
            const adh = adherencePct(patient);
            return (
              <Link
                key={patient.id}
                to={`/provider/patients/${patient.id}`}
                className={clsx('card p-4 flex items-center gap-4 hover:shadow-md transition-all border', status.bg)}
              >
                {/* Avatar */}
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
                  style={{ backgroundColor: patient.avatar_color }}
                >
                  {initials(patient.name)}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800">{patient.name}</span>
                    <div className="flex items-center gap-1">
                      {status.icon}
                      <span className="text-xs text-slate-500">{status.label}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5 text-xs text-slate-500">
                    <span>{patient.active_interventions ?? 0} active interventions</span>
                    <span>·</span>
                    <span>
                      {patient.last_checkin
                        ? `Last check-in ${daysAgo(patient.last_checkin) === 0 ? 'today' : `${daysAgo(patient.last_checkin)}d ago`}`
                        : 'No check-ins yet'}
                    </span>
                  </div>
                </div>

                {/* 7-day adherence */}
                <div className="text-right flex-shrink-0">
                  <div className={clsx(
                    'text-lg font-bold',
                    adh >= 80 ? 'text-emerald-600' : adh >= 50 ? 'text-amber-600' : 'text-rose-500'
                  )}>
                    {patient.possible_7d ? `${adh}%` : '—'}
                  </div>
                  <div className="text-xs text-slate-400">7-day adherence</div>
                </div>

                <ChevronRight size={16} className="text-slate-300 flex-shrink-0" />
              </Link>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
