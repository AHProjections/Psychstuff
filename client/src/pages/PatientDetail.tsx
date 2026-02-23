import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api/client';
import type { Patient, PatientIntervention, SymptomLog } from '../types';
import Layout, { PageHeader } from '../components/Layout';
import InterventionCard from '../components/InterventionCard';
import AssignInterventionModal from '../components/AssignInterventionModal';
import CorrelationChart from '../components/CorrelationChart';
import { Plus, Trash2, BarChart2 } from 'lucide-react';
import { formatDate, initials, pct } from '../utils';
import { SYMPTOM_META } from '../types';
import clsx from 'clsx';

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>();
  const patientId = Number(id);

  const [patient, setPatient] = useState<Patient | null>(null);
  const [interventions, setInterventions] = useState<PatientIntervention[]>([]);
  const [recentSymptoms, setRecentSymptoms] = useState<SymptomLog[]>([]);
  const [showAssign, setShowAssign] = useState(false);
  const [activeTab, setActiveTab] = useState<'plan' | 'insights'>('plan');
  const [insights, setInsights] = useState<{
    symptoms: SymptomLog[];
    adherence: { log_date: string; name: string; color: string; icon: string; rate: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const loadPatient = () => {
    api.getPatient(patientId).then(data => {
      setPatient(data.patient);
      setInterventions(data.interventions);
      setRecentSymptoms(data.recentSymptoms);
      setLoading(false);
    });
  };

  useEffect(() => { loadPatient(); }, [patientId]);

  useEffect(() => {
    if (activeTab === 'insights' && !insights) {
      api.getPatientInsights(patientId).then(data => setInsights(data));
    }
  }, [activeTab, patientId]);

  const handleDeactivate = async (ivId: number) => {
    await api.updateIntervention(ivId, { active: false });
    loadPatient();
  };

  // Latest symptom entry
  const latestSymptom = recentSymptoms[0];

  if (loading || !patient) return (
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
          title={patient.name}
          subtitle={`Patient · Member since ${formatDate(patient.created_at)}`}
          breadcrumbs={[{ label: 'Dashboard', to: '/provider' }, { label: patient.name }]}
        />

        {/* Patient header card */}
        <div className="card p-5 mb-6 flex items-center gap-5">
          <div
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-xl font-bold flex-shrink-0"
            style={{ backgroundColor: patient.avatar_color }}
          >
            {initials(patient.name)}
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-slate-800">{patient.name}</h2>
            <p className="text-sm text-slate-500">{patient.email}</p>
            <div className="flex gap-4 mt-2">
              <div className="text-center">
                <p className="text-xl font-bold text-indigo-600">{interventions.length}</p>
                <p className="text-xs text-slate-400">Active interventions</p>
              </div>
              {latestSymptom && (
                <div className="text-center">
                  <p className="text-xl font-bold text-indigo-600">{latestSymptom.mood ?? '—'}/10</p>
                  <p className="text-xs text-slate-400">Last mood score</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
          {(['plan', 'insights'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                activeTab === tab ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {tab === 'plan' ? '📋 Treatment Plan' : '📊 Insights'}
            </button>
          ))}
        </div>

        {/* Treatment Plan Tab */}
        {activeTab === 'plan' && (
          <div className="space-y-6">
            {/* Recent symptom summary */}
            {latestSymptom && (
              <div className="card p-5">
                <h3 className="font-semibold text-slate-700 mb-4 text-sm">
                  Most Recent Symptom Report
                  <span className="text-slate-400 font-normal ml-2">{formatDate(latestSymptom.log_date)}</span>
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {Object.entries(SYMPTOM_META).map(([key, meta]) => {
                    const val = (latestSymptom as any)[key];
                    if (val == null) return null;
                    return (
                      <div key={key} className="bg-slate-50 rounded-xl p-3 text-center">
                        <p className="text-xl font-bold" style={{ color: meta.color }}>{val}</p>
                        <p className="text-xs text-slate-500">{meta.label}</p>
                        <div className="h-1 bg-slate-200 rounded-full mt-1.5 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${val * 10}%`,
                              backgroundColor: meta.color,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Interventions */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700 text-sm">Active Interventions</h3>
                <button
                  onClick={() => setShowAssign(true)}
                  className="btn-primary text-xs py-1.5 px-3"
                >
                  <Plus size={13} />
                  Assign Intervention
                </button>
              </div>

              {interventions.length === 0 ? (
                <div className="card p-8 text-center">
                  <p className="text-slate-400 mb-3">No interventions assigned yet.</p>
                  <button onClick={() => setShowAssign(true)} className="btn-primary">
                    <Plus size={15} />
                    Assign First Intervention
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {interventions.map(iv => (
                    <div key={iv.id} className="relative">
                      <InterventionCard intervention={iv} />
                      <button
                        onClick={() => handleDeactivate(iv.id)}
                        className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                        title="Remove intervention"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Insights Tab */}
        {activeTab === 'insights' && (
          <div className="card p-5">
            <div className="flex items-center gap-2 mb-4">
              <BarChart2 size={16} className="text-indigo-500" />
              <h3 className="font-semibold text-slate-700 text-sm">Symptom & Adherence Trends</h3>
            </div>
            {!insights ? (
              <div className="flex items-center justify-center h-40">
                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : insights.symptoms.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-8">No symptom data yet. Patient hasn't logged symptoms.</p>
            ) : (
              <CorrelationChart
                symptoms={insights.symptoms}
                adherenceByDay={insights.adherence.map(a => ({
                  ...a,
                  category: '',
                  completed: Math.round(a.rate),
                }))}
              />
            )}
          </div>
        )}
      </div>

      {showAssign && (
        <AssignInterventionModal
          patientId={patientId}
          onClose={() => setShowAssign(false)}
          onAssigned={() => { setShowAssign(false); loadPatient(); }}
        />
      )}
    </Layout>
  );
}
