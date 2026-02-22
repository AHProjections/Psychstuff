import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Sprout, HeartPulse, BarChart2, Users } from 'lucide-react';

const DEMO_ACCOUNTS = [
  { email: 'sarah@clinic.com', password: 'demo', label: 'Dr. Sarah Chen', role: 'Provider', color: '#4F46E5' },
  { email: 'marcus@clinic.com', password: 'demo', label: 'Dr. Marcus Williams', role: 'Provider', color: '#0D9488' },
  { email: 'alex@patient.com', password: 'demo', label: 'Alex Johnson', role: 'Patient', color: '#F97316' },
  { email: 'jamie@patient.com', password: 'demo', label: 'Jamie Smith', role: 'Patient', color: '#8B5CF6' },
  { email: 'riya@patient.com', password: 'demo', label: 'Riya Patel', role: 'Patient', color: '#22C55E' },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e?: React.FormEvent, demoEmail?: string, demoPassword?: string) => {
    e?.preventDefault();
    const em = demoEmail ?? email;
    const pw = demoPassword ?? password;
    if (!em || !pw) return;

    setLoading(true);
    setError('');
    try {
      await login(em, pw);
      // Redirect based on role — will be handled in App.tsx
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-2/5 bg-gradient-to-br from-indigo-600 to-indigo-800 p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
            <Sprout size={20} className="text-white" />
          </div>
          <span className="text-2xl font-bold">Flourish</span>
        </div>

        <div className="space-y-8">
          <div>
            <h1 className="text-4xl font-bold leading-snug mb-4">
              Evidence-based mental wellness, together.
            </h1>
            <p className="text-indigo-200 text-lg leading-relaxed">
              Collaborate with your care team, track interventions that work, and see how your habits shape your wellbeing.
            </p>
          </div>

          <div className="space-y-4">
            {[
              { icon: <HeartPulse size={18} />, text: 'Clinician-assigned interventions graded by evidence' },
              { icon: <BarChart2 size={18} />, text: 'See how your behaviors correlate with your symptoms' },
              { icon: <Users size={18} />, text: 'Stay connected with your provider between sessions' },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3 text-indigo-100">
                <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  {item.icon}
                </div>
                <span className="text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-indigo-300 text-sm">Built on behavioral activation, CBT, and lifestyle medicine.</p>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Sprout size={16} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800">Flourish</span>
          </div>

          <h2 className="text-2xl font-bold text-slate-800 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-8">Sign in to your account to continue.</p>

          <form onSubmit={handleLogin} className="space-y-4 mb-6">
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                className="input"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
              />
            </div>
            <div>
              <label className="label">Password</label>
              <input
                type="password"
                className="input"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            {error && (
              <div className="bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-2.5">
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Demo accounts */}
          <div>
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center">
                <span className="px-3 bg-slate-50 text-xs text-slate-400">Demo accounts</span>
              </div>
            </div>

            <div className="space-y-2">
              {DEMO_ACCOUNTS.map(acct => (
                <button
                  key={acct.email}
                  onClick={() => handleLogin(undefined, acct.email, acct.password)}
                  disabled={loading}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-all text-left"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                    style={{ backgroundColor: acct.color }}
                  >
                    {acct.label.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-700">{acct.label}</p>
                    <p className="text-xs text-slate-400">{acct.role}</p>
                  </div>
                  <span className="text-xs text-slate-400">→</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
