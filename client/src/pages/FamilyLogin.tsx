import { useState, FormEvent } from 'react';
import { useFamilyAuth } from '../context/FamilyAuthContext';
import { Home } from 'lucide-react';

export default function FamilyLogin() {
  const { login } = useFamilyAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(username.trim().toLowerCase(), password);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-violet-50 via-white to-pink-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 shadow-lg mb-4">
            <Home className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Family Todos</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your family list</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-xl shadow-slate-200/60 p-8 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm rounded-lg px-4 py-3">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="you or spouse"
              autoComplete="username"
              autoCapitalize="none"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent text-slate-800 placeholder-slate-400 text-sm transition"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              required
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent text-slate-800 text-sm transition"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold text-sm hover:from-violet-600 hover:to-pink-600 transition disabled:opacity-60 shadow-md shadow-violet-200 mt-2"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>

          <p className="text-xs text-slate-400 text-center pt-1">
            Default password: <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono">family2024</code>
            <br />Change it in Settings after signing in.
          </p>
        </form>
      </div>
    </div>
  );
}
