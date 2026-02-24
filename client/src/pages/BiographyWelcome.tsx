import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { DetailLevelInfo, BiographySession } from '../types';
import {
  BookOpen, ChevronRight, Clock, FileText, Mic, Keyboard,
  Trash2, Plus, ArrowRight
} from 'lucide-react';
import clsx from 'clsx';

const LEVEL_ICONS: Record<string, string> = {
  ultra_brief: '1',
  brief: '5',
  moderate: '20',
  detailed: '50',
  comprehensive: '100+',
};

export default function BiographyWelcome() {
  const navigate = useNavigate();
  const [levels, setLevels] = useState<DetailLevelInfo[]>([]);
  const [sessions, setSessions] = useState<BiographySession[]>([]);
  const [subjectName, setSubjectName] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('');
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text');
  const [creating, setCreating] = useState(false);
  const [showNewForm, setShowNewForm] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getBiographyLevels().then(d => setLevels(d.levels)).catch(() => {});
    api.listBiographySessions().then(d => setSessions(d.sessions)).catch(() => {});
  }, []);

  const handleStart = async () => {
    if (!subjectName.trim()) {
      setError('Please enter a name.');
      return;
    }
    if (!selectedLevel) {
      setError('Please choose a detail level.');
      return;
    }
    setError('');
    setCreating(true);
    try {
      const { session } = await api.createBiographySession({
        subject_name: subjectName.trim(),
        detail_level: selectedLevel,
      });
      navigate(`/biography/interview/${session.id}`, { state: { inputMode } });
    } catch (e: any) {
      setError(e.message || 'Failed to create session');
      setCreating(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this interview? This cannot be undone.')) return;
    try {
      await api.deleteBiographySession(id);
      setSessions(prev => prev.filter(s => s.id !== id));
    } catch {}
  };

  const hasExistingSessions = sessions.length > 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur border-b border-amber-200">
        <div className="max-w-4xl mx-auto px-6 py-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-600 rounded-2xl flex items-center justify-center shadow-sm">
            <BookOpen size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Life Story</h1>
            <p className="text-base text-slate-500">Biography Interview</p>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        {/* Welcome message */}
        <div className="text-center py-4">
          <h2 className="text-3xl font-bold text-slate-800 mb-3">
            Tell Your Story
          </h2>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Everyone has a story worth telling. This tool will guide you through a
            friendly interview and turn your answers into a written biography.
            You can type or speak your answers.
          </p>
        </div>

        {/* Existing sessions */}
        {hasExistingSessions && !showNewForm && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-slate-800">Your Interviews</h3>
              <button
                onClick={() => setShowNewForm(true)}
                className="inline-flex items-center gap-2 px-5 py-3 bg-amber-600 text-white text-base
                           font-semibold rounded-2xl hover:bg-amber-700 transition-colors shadow-sm"
              >
                <Plus size={20} />
                Start New Interview
              </button>
            </div>

            <div className="space-y-3">
              {sessions.map(s => (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl border border-amber-200 p-5 flex items-center gap-4
                             hover:shadow-md transition-shadow cursor-pointer group"
                  onClick={() => {
                    if (s.status === 'draft_generated' && s.draft) {
                      navigate(`/biography/draft/${s.id}`);
                    } else {
                      navigate(`/biography/interview/${s.id}`);
                    }
                  }}
                >
                  <div className="w-14 h-14 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <FileText size={24} className="text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-lg font-semibold text-slate-800 truncate">
                      {s.subject_name}
                    </h4>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm text-slate-500 capitalize">
                        {s.detail_level.replace('_', ' ')}
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className="text-sm text-slate-500">
                        {s.response_count ?? 0} answers
                      </span>
                      <span className="text-slate-300">|</span>
                      <span className={clsx(
                        'text-sm font-medium',
                        s.status === 'draft_generated' ? 'text-green-600' : 'text-amber-600'
                      )}>
                        {s.status === 'draft_generated' ? 'Draft ready' : 'In progress'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(s.id); }}
                    className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl
                               transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete interview"
                  >
                    <Trash2 size={18} />
                  </button>
                  <ChevronRight size={20} className="text-slate-400 group-hover:text-amber-600 transition-colors" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* New interview form */}
        {(!hasExistingSessions || showNewForm) && (
          <div className="space-y-8">
            {showNewForm && (
              <button
                onClick={() => setShowNewForm(false)}
                className="text-base text-amber-700 hover:text-amber-800 font-medium"
              >
                &larr; Back to your interviews
              </button>
            )}

            {/* Name input */}
            <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm">
              <label className="block text-lg font-semibold text-slate-800 mb-3">
                Who is this biography for?
              </label>
              <input
                type="text"
                value={subjectName}
                onChange={(e) => setSubjectName(e.target.value)}
                placeholder="Enter the person's full name"
                className="w-full px-5 py-4 text-xl border-2 border-slate-200 rounded-2xl
                           focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent
                           placeholder-slate-400"
                autoFocus
              />
            </div>

            {/* Detail level selection */}
            <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm">
              <label className="block text-lg font-semibold text-slate-800 mb-2">
                How detailed should the biography be?
              </label>
              <p className="text-base text-slate-500 mb-5">
                You can always generate a draft early — this just sets how many questions we'll ask.
              </p>

              <div className="space-y-3">
                {levels.map(level => (
                  <button
                    key={level.id}
                    onClick={() => setSelectedLevel(level.id)}
                    className={clsx(
                      'w-full text-left p-5 rounded-2xl border-2 transition-all',
                      selectedLevel === level.id
                        ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                        : 'border-slate-200 hover:border-amber-300 hover:bg-amber-50/50'
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div className={clsx(
                        'w-14 h-14 rounded-xl flex items-center justify-center text-lg font-bold flex-shrink-0',
                        selectedLevel === level.id
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-100 text-slate-600'
                      )}>
                        {LEVEL_ICONS[level.id]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="text-lg font-semibold text-slate-800">{level.label}</span>
                          <span className="text-sm text-slate-400 bg-slate-100 px-2.5 py-0.5 rounded-full">
                            {level.pageEstimate}
                          </span>
                        </div>
                        <p className="text-base text-slate-500 mt-1">{level.description}</p>
                        <p className="text-sm text-slate-400 mt-1">
                          {level.questionCount} questions
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Input mode */}
            <div className="bg-white rounded-2xl border border-amber-200 p-6 shadow-sm">
              <label className="block text-lg font-semibold text-slate-800 mb-2">
                How would you like to answer?
              </label>
              <p className="text-base text-slate-500 mb-5">
                You can switch between these at any time during the interview.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <button
                  onClick={() => setInputMode('text')}
                  className={clsx(
                    'p-5 rounded-2xl border-2 transition-all text-center',
                    inputMode === 'text'
                      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                      : 'border-slate-200 hover:border-amber-300'
                  )}
                >
                  <Keyboard size={32} className={clsx(
                    'mx-auto mb-3',
                    inputMode === 'text' ? 'text-amber-600' : 'text-slate-400'
                  )} />
                  <div className="text-lg font-semibold text-slate-800">Type</div>
                  <p className="text-base text-slate-500 mt-1">Type your answers</p>
                </button>

                <button
                  onClick={() => setInputMode('voice')}
                  className={clsx(
                    'p-5 rounded-2xl border-2 transition-all text-center',
                    inputMode === 'voice'
                      ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-200'
                      : 'border-slate-200 hover:border-amber-300'
                  )}
                >
                  <Mic size={32} className={clsx(
                    'mx-auto mb-3',
                    inputMode === 'voice' ? 'text-amber-600' : 'text-slate-400'
                  )} />
                  <div className="text-lg font-semibold text-slate-800">Speak</div>
                  <p className="text-base text-slate-500 mt-1">Speak your answers aloud</p>
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-2xl p-4 text-red-700 text-base">
                {error}
              </div>
            )}

            {/* Start button */}
            <button
              onClick={handleStart}
              disabled={creating}
              className="w-full py-5 bg-amber-600 text-white text-xl font-bold rounded-2xl
                         hover:bg-amber-700 transition-colors shadow-lg shadow-amber-200
                         disabled:opacity-50 disabled:cursor-not-allowed
                         flex items-center justify-center gap-3"
            >
              {creating ? (
                <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  Begin Interview
                  <ArrowRight size={24} />
                </>
              )}
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-6 text-base text-slate-400">
          Your answers are saved automatically. You can pause and come back anytime.
        </div>
      </div>
    </div>
  );
}
