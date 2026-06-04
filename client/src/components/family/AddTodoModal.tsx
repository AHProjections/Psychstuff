import { useState, useEffect, useRef } from 'react';
import { X, ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { Todo, Category } from '../../api/family';

const PRIORITIES = [
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500', light: 'bg-red-100 text-red-700 border-red-300' },
  { value: 'high',   label: 'High',   color: 'bg-orange-400', light: 'bg-orange-100 text-orange-700 border-orange-300' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-400', light: 'bg-blue-100 text-blue-700 border-blue-300' },
  { value: 'low',    label: 'Low',    color: 'bg-emerald-400', light: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
] as const;

interface Props {
  categories: Category[];
  editTodo?: Todo | null;
  onSave: (data: Partial<Todo> & { title: string }) => Promise<void>;
  onClose: () => void;
}

export default function AddTodoModal({ categories, editTodo, onSave, onClose }: Props) {
  const [title, setTitle] = useState(editTodo?.title || '');
  const [description, setDescription] = useState(editTodo?.description || '');
  const [categoryId, setCategoryId] = useState<number | ''>(editTodo?.category_id ?? '');
  const [priority, setPriority] = useState<Todo['priority']>(editTodo?.priority || 'medium');
  const [deadline, setDeadline] = useState(editTodo?.deadline || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => { titleRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      await onSave({
        title: title.trim(),
        description: description.trim() || undefined,
        category_id: categoryId !== '' ? Number(categoryId) : undefined,
        priority,
        deadline: deadline || undefined,
      });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save');
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full sm:max-w-lg bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white rounded-t-3xl sm:rounded-t-2xl px-5 pt-5 pb-3 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-800">
            {editTodo ? 'Edit task' : 'New task'}
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {error && <div className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</div>}

          {/* Title */}
          <div>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="What needs to be done?"
              className="w-full px-0 py-1 text-base font-medium text-slate-800 placeholder-slate-400 border-0 border-b-2 border-slate-200 focus:border-violet-500 focus:outline-none transition bg-transparent"
            />
          </div>

          {/* Description */}
          <div>
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Add notes (optional)"
              rows={2}
              className="w-full px-3 py-2 text-sm text-slate-700 placeholder-slate-400 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Priority</label>
            <div className="flex gap-2">
              {PRIORITIES.map(p => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setPriority(p.value as Todo['priority'])}
                  className={clsx(
                    'flex-1 py-1.5 rounded-lg text-xs font-semibold border transition',
                    priority === p.value ? p.light : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                  )}
                >
                  <span className={clsx('inline-block w-2 h-2 rounded-full mr-1.5', p.color)} />
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Category + Deadline row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Category</label>
              <div className="relative">
                <select
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full appearance-none px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition pr-8"
                >
                  <option value="">None</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Due date</label>
              <input
                type="date"
                value={deadline}
                onChange={e => setDeadline(e.target.value)}
                className="w-full px-3 py-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-300 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-1 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-semibold hover:from-violet-600 hover:to-pink-600 transition disabled:opacity-50 shadow-md shadow-violet-200"
            >
              {saving ? 'Saving…' : editTodo ? 'Save changes' : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
