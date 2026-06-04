import { useState, useEffect } from 'react';
import { X, Plus, Trash2, MessageSquare } from 'lucide-react';
import clsx from 'clsx';
import { Category, auth, users, categories as catApi } from '../../api/family';
import { useFamilyAuth } from '../../context/FamilyAuthContext';

const AVATAR_COLORS = [
  '#6366F1', '#8B5CF6', '#EC4899', '#EF4444',
  '#F97316', '#F59E0B', '#22C55E', '#0D9488',
  '#3B82F6', '#6B7280',
];

const CATEGORY_ICONS = ['📋', '🛒', '🏠', '👨‍👩‍👧', '💼', '🚗', '❤️', '🏋️', '📚', '🎉', '🐾', '🌱', '✈️', '💰'];
const CATEGORY_COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#EF4444', '#F97316', '#F59E0B', '#22C55E', '#0D9488', '#3B82F6'];

interface Props {
  categoryList: Category[];
  onClose: () => void;
  onCategoriesChange: (cats: Category[]) => void;
}

export default function SettingsModal({ categoryList, onClose, onCategoriesChange }: Props) {
  const { user, refreshUser } = useFamilyAuth();
  const [tab, setTab] = useState<'profile' | 'categories' | 'sms'>('profile');

  // Profile state
  const [displayName, setDisplayName] = useState(user?.display_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarColor, setAvatarColor] = useState(user?.avatar_color || '#6366F1');
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [pwMsg, setPwMsg] = useState('');

  // Category state
  const [cats, setCats] = useState<Category[]>(categoryList);
  const [newCatName, setNewCatName] = useState('');
  const [newCatIcon, setNewCatIcon] = useState('📋');
  const [newCatColor, setNewCatColor] = useState('#6366F1');
  const [catError, setCatError] = useState('');

  useEffect(() => { setCats(categoryList); }, [categoryList]);

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileMsg('');
    try {
      await users.updateMe({ display_name: displayName, phone: phone || undefined, avatar_color: avatarColor });
      await refreshUser();
      setProfileMsg('Saved!');
      setTimeout(() => setProfileMsg(''), 2000);
    } catch {
      setProfileMsg('Failed to save');
    }
  }

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwMsg('');
    if (newPw.length < 6) { setPwMsg('Password must be at least 6 characters'); return; }
    try {
      await auth.changePassword(currentPw, newPw);
      setCurrentPw(''); setNewPw('');
      setPwMsg('Password changed!');
      setTimeout(() => setPwMsg(''), 2000);
    } catch (err: unknown) {
      setPwMsg(err instanceof Error ? err.message : 'Failed');
    }
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setCatError('');
    try {
      const res = await catApi.create({ name: newCatName.trim(), icon: newCatIcon, color: newCatColor });
      const updated = [...cats, res.category];
      setCats(updated);
      onCategoriesChange(updated);
      setNewCatName('');
      setNewCatIcon('📋');
      setNewCatColor('#6366F1');
    } catch {
      setCatError('Failed to add category');
    }
  }

  async function deleteCategory(id: number) {
    await catApi.delete(id);
    const updated = cats.filter(c => c.id !== id);
    setCats(updated);
    onCategoriesChange(updated);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100 shrink-0">
          <h2 className="text-lg font-semibold text-slate-800">Settings</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 shrink-0">
          {(['profile', 'categories', 'sms'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={clsx(
                'flex-1 py-2.5 text-sm font-medium capitalize transition border-b-2 -mb-px',
                tab === t ? 'text-violet-600 border-violet-500' : 'text-slate-500 border-transparent hover:text-slate-700'
              )}
            >
              {t === 'sms' ? 'SMS' : t}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1 px-5 py-4">
          {/* Profile tab */}
          {tab === 'profile' && (
            <div className="space-y-5">
              <form onSubmit={saveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Display name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={e => setDisplayName(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Phone (for SMS todos)</label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="+15551234567"
                    className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 transition"
                  />
                  <p className="text-xs text-slate-400 mt-1">Include country code (e.g. +1 for US)</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {AVATAR_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setAvatarColor(c)}
                        className={clsx('w-8 h-8 rounded-full transition', avatarColor === c && 'ring-2 ring-offset-2 ring-slate-400')}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition"
                >
                  Save profile
                </button>
                {profileMsg && <p className={clsx('text-sm text-center', profileMsg === 'Saved!' ? 'text-emerald-600' : 'text-red-600')}>{profileMsg}</p>}
              </form>

              <hr className="border-slate-100" />

              <form onSubmit={changePassword} className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Change password</p>
                <input
                  type="password"
                  value={currentPw}
                  onChange={e => setCurrentPw(e.target.value)}
                  placeholder="Current password"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 transition"
                />
                <input
                  type="password"
                  value={newPw}
                  onChange={e => setNewPw(e.target.value)}
                  placeholder="New password (min 6 chars)"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 transition"
                />
                <button
                  type="submit"
                  className="w-full py-2 rounded-xl bg-slate-800 text-white text-sm font-semibold hover:bg-slate-700 transition"
                >
                  Change password
                </button>
                {pwMsg && <p className={clsx('text-sm text-center', pwMsg.includes('changed') ? 'text-emerald-600' : 'text-red-600')}>{pwMsg}</p>}
              </form>
            </div>
          )}

          {/* Categories tab */}
          {tab === 'categories' && (
            <div className="space-y-4">
              {cats.map(cat => (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="text-xl w-8 text-center">{cat.icon}</span>
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="flex-1 text-sm font-medium text-slate-700">{cat.name}</span>
                  <button
                    onClick={() => deleteCategory(cat.id)}
                    className="p-1.5 text-slate-400 hover:text-red-500 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}

              <hr className="border-slate-100" />

              <form onSubmit={addCategory} className="space-y-3">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Add category</p>
                <input
                  type="text"
                  value={newCatName}
                  onChange={e => setNewCatName(e.target.value)}
                  placeholder="Category name"
                  className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 transition"
                />
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Icon</p>
                  <div className="flex flex-wrap gap-1.5">
                    {CATEGORY_ICONS.map(ic => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setNewCatIcon(ic)}
                        className={clsx('text-xl w-9 h-9 rounded-lg flex items-center justify-center transition', newCatIcon === ic ? 'bg-violet-100 ring-2 ring-violet-400' : 'bg-slate-50 hover:bg-slate-100')}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1.5">Color</p>
                  <div className="flex flex-wrap gap-2">
                    {CATEGORY_COLORS.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setNewCatColor(c)}
                        className={clsx('w-7 h-7 rounded-full transition', newCatColor === c && 'ring-2 ring-offset-2 ring-slate-400')}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                {catError && <p className="text-sm text-red-600">{catError}</p>}
                <button
                  type="submit"
                  disabled={!newCatName.trim()}
                  className="w-full py-2 rounded-xl bg-violet-500 text-white text-sm font-semibold hover:bg-violet-600 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" /> Add category
                </button>
              </form>
            </div>
          )}

          {/* SMS tab */}
          {tab === 'sms' && (
            <div className="space-y-4 text-sm text-slate-600">
              <div className="flex items-center gap-3 p-3 bg-violet-50 rounded-xl">
                <MessageSquare className="w-8 h-8 text-violet-500 shrink-0" />
                <p>Text a task to your Twilio number and it'll appear in your list automatically.</p>
              </div>

              <div className="space-y-2">
                <p className="font-semibold text-slate-700">Setup steps</p>
                <ol className="list-decimal list-inside space-y-1.5 text-slate-600">
                  <li>Create a free <strong>Twilio</strong> account at twilio.com</li>
                  <li>Buy a phone number (~$1/mo)</li>
                  <li>Set the SMS webhook URL to:<br />
                    <code className="text-xs bg-slate-100 px-2 py-1 rounded mt-1 block break-all">
                      https://your-domain.com/api/family/sms/webhook
                    </code>
                  </li>
                  <li>Add your mobile number in the <strong>Profile</strong> tab above</li>
                </ol>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl space-y-1">
                <p className="font-semibold text-slate-700">Message format</p>
                <p>Just text anything to add it as a task.</p>
                <p className="text-slate-500">Optional tags:</p>
                <ul className="list-disc list-inside space-y-0.5 text-slate-500 text-xs">
                  <li><code>#groceries</code> — set category</li>
                  <li><code>!urgent</code>, <code>!high</code>, <code>!low</code> — set priority</li>
                  <li><code>by 6/15</code> or <code>due 6/15</code> — set deadline</li>
                </ul>
                <p className="text-xs mt-2 text-slate-400 italic">
                  Example: "Buy milk #groceries !high due 6/10"
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
