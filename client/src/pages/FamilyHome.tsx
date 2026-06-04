import { useState, useEffect, useCallback } from 'react';
import { Plus, LogOut, Settings, CheckSquare, SlidersHorizontal } from 'lucide-react';
import clsx from 'clsx';
import { todos as todosApi, categories as catApi, Todo, Category } from '../api/family';
import { useFamilyAuth } from '../context/FamilyAuthContext';
import TodoCard from '../components/family/TodoCard';
import AddTodoModal from '../components/family/AddTodoModal';
import SettingsModal from '../components/family/SettingsModal';

type Filter = 'active' | 'completed' | 'all';
type SortKey = 'priority' | 'deadline' | 'created' | 'alpha';

export default function FamilyHome() {
  const { user, logout } = useFamilyAuth();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<Filter>('active');
  const [categoryFilter, setCategoryFilter] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>('priority');
  const [showAdd, setShowAdd] = useState(false);
  const [editTodo, setEditTodo] = useState<Todo | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showSort, setShowSort] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadTodos = useCallback(async () => {
    const params: Parameters<typeof todosApi.list>[0] = { sort };
    if (categoryFilter != null) params.category_id = categoryFilter;
    if (filter === 'active') params.completed = false;
    if (filter === 'completed') params.completed = true;
    const data = await todosApi.list(params);
    setTodos(data.todos);
  }, [filter, categoryFilter, sort]);

  useEffect(() => {
    catApi.list().then(d => setCategories(d.categories));
  }, []);

  useEffect(() => {
    setLoading(true);
    loadTodos().finally(() => setLoading(false));
  }, [loadTodos]);

  async function handleComplete(id: number) {
    const res = await todosApi.complete(id);
    setTodos(prev => prev.map(t => t.id === id ? res.todo : t));
    if (filter !== 'all') {
      setTodos(prev => prev.filter(t => !(
        (filter === 'active' && t.id === id && t.completed) ||
        (filter === 'completed' && t.id === id && !t.completed)
      )));
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this task?')) return;
    await todosApi.delete(id);
    setTodos(prev => prev.filter(t => t.id !== id));
  }

  async function handleSave(data: Partial<Todo> & { title: string }) {
    if (editTodo) {
      const res = await todosApi.update(editTodo.id, data);
      setTodos(prev => prev.map(t => t.id === editTodo.id ? res.todo : t));
    } else {
      const res = await todosApi.create(data);
      if (filter === 'completed') return;
      setTodos(prev => [res.todo, ...prev]);
    }
    setEditTodo(null);
  }

  const activeTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  const SORT_LABELS: Record<SortKey, string> = {
    priority: 'Priority',
    deadline: 'Due date',
    created: 'Newest first',
    alpha: 'A–Z',
  };

  const initials = user?.display_name?.charAt(0).toUpperCase() || '?';

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2 flex-1">
            <CheckSquare className="w-6 h-6 text-violet-500" />
            <h1 className="text-lg font-bold text-slate-800">Family Todos</h1>
          </div>

          {/* User avatar */}
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
            style={{ backgroundColor: user?.avatar_color || '#6366F1' }}
          >
            {initials}
          </div>
          <span className="text-sm font-medium text-slate-600 hidden sm:block">{user?.display_name}</span>

          <button
            onClick={() => setShowSettings(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <Settings className="w-5 h-5" />
          </button>
          <button
            onClick={logout}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pb-24">
        {/* Filter tabs */}
        <div className="flex gap-1 pt-4 pb-3">
          {(['active', 'all', 'completed'] as Filter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'px-4 py-1.5 rounded-full text-sm font-medium capitalize transition',
                filter === f
                  ? 'bg-violet-500 text-white shadow-md shadow-violet-200'
                  : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200'
              )}
            >
              {f}
            </button>
          ))}

          {/* Sort dropdown */}
          <div className="ml-auto relative">
            <button
              onClick={() => setShowSort(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-200 transition"
            >
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:block">{SORT_LABELS[sort]}</span>
            </button>
            {showSort && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowSort(false)} />
                <div className="absolute right-0 top-full mt-1 z-20 bg-white rounded-xl shadow-xl border border-slate-100 py-1 w-40">
                  {(Object.entries(SORT_LABELS) as [SortKey, string][]).map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() => { setSort(key); setShowSort(false); }}
                      className={clsx(
                        'w-full px-4 py-2 text-sm text-left transition',
                        sort === key ? 'text-violet-600 font-medium' : 'text-slate-700 hover:bg-slate-50'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Category filter chips */}
        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-none -mx-4 px-4">
            <button
              onClick={() => setCategoryFilter(null)}
              className={clsx(
                'shrink-0 px-3 py-1 rounded-full text-xs font-medium transition',
                categoryFilter === null
                  ? 'bg-slate-800 text-white'
                  : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
              )}
            >
              All
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
                className={clsx(
                  'shrink-0 px-3 py-1 rounded-full text-xs font-medium transition whitespace-nowrap',
                  categoryFilter === cat.id
                    ? 'text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:border-slate-300'
                )}
                style={categoryFilter === cat.id ? { backgroundColor: cat.color } : {}}
              >
                {cat.icon} {cat.name}
              </button>
            ))}
          </div>
        )}

        {/* Todo list */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : todos.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">
              {filter === 'completed' ? '🎉' : '✅'}
            </div>
            <p className="text-slate-500 font-medium">
              {filter === 'completed' ? 'No completed tasks yet' : 'All clear! Nothing to do.'}
            </p>
            {filter === 'active' && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-violet-500 text-white text-sm font-medium hover:bg-violet-600 transition"
              >
                Add your first task
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {filter !== 'completed' && activeTodos.map(todo => (
              <TodoCard
                key={todo.id}
                todo={todo}
                onComplete={handleComplete}
                onEdit={t => { setEditTodo(t); setShowAdd(true); }}
                onDelete={handleDelete}
              />
            ))}

            {filter !== 'active' && completedTodos.length > 0 && (
              <>
                {filter === 'all' && activeTodos.length > 0 && (
                  <div className="flex items-center gap-2 pt-3 pb-1">
                    <div className="h-px flex-1 bg-slate-200" />
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">Completed</span>
                    <div className="h-px flex-1 bg-slate-200" />
                  </div>
                )}
                {completedTodos.map(todo => (
                  <TodoCard
                    key={todo.id}
                    todo={todo}
                    onComplete={handleComplete}
                    onEdit={t => { setEditTodo(t); setShowAdd(true); }}
                    onDelete={handleDelete}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </main>

      {/* FAB */}
      <button
        onClick={() => { setEditTodo(null); setShowAdd(true); }}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 text-white shadow-lg shadow-violet-300 hover:shadow-xl hover:scale-105 transition-all flex items-center justify-center z-30"
        aria-label="Add task"
      >
        <Plus className="w-7 h-7" />
      </button>

      {/* Modals */}
      {showAdd && (
        <AddTodoModal
          categories={categories}
          editTodo={editTodo}
          onSave={handleSave}
          onClose={() => { setShowAdd(false); setEditTodo(null); }}
        />
      )}
      {showSettings && (
        <SettingsModal
          categoryList={categories}
          onClose={() => setShowSettings(false)}
          onCategoriesChange={setCategories}
        />
      )}
    </div>
  );
}
