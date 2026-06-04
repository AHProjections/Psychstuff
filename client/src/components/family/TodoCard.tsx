import { useState } from 'react';
import { Trash2, Pencil, ChevronDown, ChevronUp } from 'lucide-react';
import { format, parseISO, isPast, isToday, isTomorrow, differenceInCalendarDays } from 'date-fns';
import clsx from 'clsx';
import { Todo } from '../../api/family';

const PRIORITY_STYLES = {
  urgent: { bar: 'bg-red-500', badge: 'bg-red-100 text-red-700', label: 'Urgent' },
  high:   { bar: 'bg-orange-400', badge: 'bg-orange-100 text-orange-700', label: 'High' },
  medium: { bar: 'bg-blue-400', badge: 'bg-blue-100 text-blue-700', label: 'Medium' },
  low:    { bar: 'bg-emerald-400', badge: 'bg-emerald-100 text-emerald-700', label: 'Low' },
};

function DeadlineChip({ deadline }: { deadline: string }) {
  const d = parseISO(deadline);
  const overdue = isPast(d) && !isToday(d);
  const dueToday = isToday(d);
  const dueTomorrow = isTomorrow(d);
  const daysLeft = differenceInCalendarDays(d, new Date());

  let text = format(d, 'MMM d');
  if (dueToday) text = 'Due today';
  else if (dueTomorrow) text = 'Due tomorrow';
  else if (overdue) text = `${Math.abs(daysLeft)}d overdue`;

  return (
    <span className={clsx(
      'inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full',
      overdue ? 'bg-red-100 text-red-700' :
      dueToday ? 'bg-amber-100 text-amber-700' :
      dueTomorrow ? 'bg-yellow-100 text-yellow-700' :
      'bg-slate-100 text-slate-600'
    )}>
      📅 {text}
    </span>
  );
}

interface Props {
  todo: Todo;
  onComplete: (id: number) => void;
  onEdit: (todo: Todo) => void;
  onDelete: (id: number) => void;
}

export default function TodoCard({ todo, onComplete, onEdit, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false);
  const priority = PRIORITY_STYLES[todo.priority] || PRIORITY_STYLES.medium;

  return (
    <div className={clsx(
      'bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden transition-opacity',
      todo.completed && 'opacity-60'
    )}>
      <div className="flex">
        {/* Priority bar */}
        <div className={clsx('w-1 shrink-0 rounded-l-xl', priority.bar)} />

        <div className="flex-1 px-4 py-3 min-w-0">
          <div className="flex items-start gap-3">
            {/* Checkbox */}
            <button
              onClick={() => onComplete(todo.id)}
              className={clsx(
                'mt-0.5 w-5 h-5 rounded-full border-2 shrink-0 flex items-center justify-center transition-all',
                todo.completed
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'border-slate-300 hover:border-violet-400'
              )}
              aria-label={todo.completed ? 'Mark incomplete' : 'Mark complete'}
            >
              {todo.completed && (
                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                  <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </button>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={clsx(
                'text-sm font-medium text-slate-800 leading-snug',
                todo.completed && 'line-through text-slate-400'
              )}>
                {todo.title}
              </p>

              {/* Meta row */}
              <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                {todo.category_name && (
                  <span
                    className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: todo.category_color + '22', color: todo.category_color }}
                  >
                    {todo.category_icon} {todo.category_name}
                  </span>
                )}
                {todo.deadline && <DeadlineChip deadline={todo.deadline} />}
                {todo.priority !== 'medium' && (
                  <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', priority.badge)}>
                    {priority.label}
                  </span>
                )}
              </div>

              {/* Completed by / added by */}
              {todo.completed && todo.completed_by_name ? (
                <p className="text-xs text-slate-400 mt-1.5">
                  ✓ Done by {todo.completed_by_name}
                  {todo.completed_at && ` · ${format(parseISO(todo.completed_at), 'MMM d')}`}
                </p>
              ) : todo.created_by_name ? (
                <p className="text-xs text-slate-400 mt-1.5">Added by {todo.created_by_name}</p>
              ) : null}

              {/* Expanded description */}
              {expanded && todo.description && (
                <p className="text-sm text-slate-600 mt-2 leading-relaxed">{todo.description}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0">
              {todo.description && (
                <button
                  onClick={() => setExpanded(v => !v)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition"
                >
                  {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={() => onEdit(todo)}
                className="p-1 text-slate-400 hover:text-violet-500 transition"
                aria-label="Edit"
              >
                <Pencil className="w-4 h-4" />
              </button>
              <button
                onClick={() => onDelete(todo.id)}
                className="p-1 text-slate-400 hover:text-red-500 transition"
                aria-label="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
