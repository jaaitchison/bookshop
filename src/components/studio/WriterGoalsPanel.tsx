'use client';

import { useState } from 'react';
import type { WriterGoalProgress } from '@/src/types/studio';

interface WriterGoalsPanelProps {
  goals: WriterGoalProgress[];
  onSave: (bookId: string, targetWordCount: number, deadline: string) => Promise<void>;
  onRemove: (bookId: string) => Promise<void>;
}

function GoalCard({
  goal,
  onSave,
  onRemove,
}: {
  goal: WriterGoalProgress;
  onSave: WriterGoalsPanelProps['onSave'];
  onRemove: WriterGoalsPanelProps['onRemove'];
}) {
  const [target, setTarget] = useState(goal.targetWordCount?.toString() ?? '80000');
  const [deadline, setDeadline] = useState(goal.deadline?.slice(0, 10) ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const statusLabel = {
    not_set: 'Goal not set',
    active: 'In progress',
    overdue: 'Deadline passed',
    completed: 'Target reached',
  }[goal.status];
  const statusClass = {
    not_set: 'bg-slate-100 text-slate-700',
    active: 'bg-amber-100 text-amber-800',
    overdue: 'bg-rose-100 text-rose-800',
    completed: 'bg-emerald-100 text-emerald-800',
  }[goal.status];

  const submit = async () => {
    setSaving(true);
    setError('');
    try {
      await onSave(goal.bookId, Number(target), deadline);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Unable to save writing goal.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setSaving(true);
    setError('');
    try {
      await onRemove(goal.bookId);
    } catch (removeError) {
      setError(removeError instanceof Error ? removeError.message : 'Unable to remove writing goal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <article className="bookshop-card rounded-[1.5rem] p-5" data-testid={`writing-goal-${goal.bookId}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-[var(--bookshop-text)]">{goal.title}</h3>
          <p className="mt-1 text-sm text-[var(--bookshop-muted)]">
            {goal.currentWordCount.toLocaleString('en-GB')} words written
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass}`}>
          {statusLabel}
        </span>
      </div>

      {goal.targetWordCount ? (
        <div className="mt-5" data-testid="writing-goal-progress">
          <div className="mb-2 flex justify-between gap-4 text-sm">
            <span className="font-semibold text-[var(--bookshop-text)]">{goal.percentage}% complete</span>
            <span className="text-[var(--bookshop-muted)]">
              {goal.remainingWords.toLocaleString('en-GB')} words remaining
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-slate-200" aria-label={`${goal.percentage}% complete`}>
            <div
              className="h-full rounded-full bg-amber-500 transition-[width]"
              style={{ width: `${goal.percentage}%` }}
            />
          </div>
          <p className="mt-3 text-sm text-[var(--bookshop-muted)]">
            {goal.status === 'completed'
              ? 'Manuscript target reached.'
              : goal.status === 'overdue'
                ? `${Math.abs(goal.daysRemaining ?? 0)} days past the deadline.`
                : `${goal.daysRemaining ?? 0} days remaining · ${goal.wordsPerDay?.toLocaleString('en-GB') ?? 0} words per day needed.`}
          </p>
        </div>
      ) : null}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-semibold text-[var(--bookshop-text)]">
          Word target for {goal.title}
          <input
            className="bookshop-input mt-2"
            type="number"
            min="1000"
            max="2000000"
            step="1000"
            value={target}
            onChange={(event) => setTarget(event.target.value)}
          />
        </label>
        <label className="text-sm font-semibold text-[var(--bookshop-text)]">
          Deadline for {goal.title}
          <input
            className="bookshop-input mt-2"
            type="date"
            value={deadline}
            onChange={(event) => setDeadline(event.target.value)}
          />
        </label>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          className="bookshop-button-primary px-4 py-2 text-sm"
          disabled={saving || !deadline}
          onClick={() => void submit()}
        >
          {saving ? 'Saving...' : `Save goal for ${goal.title}`}
        </button>
        {goal.targetWordCount ? (
          <button
            type="button"
            className="bookshop-button-quiet px-4 py-2 text-sm"
            disabled={saving}
            onClick={() => void remove()}
          >
            Remove goal
          </button>
        ) : null}
        {error ? <p className="text-sm font-semibold text-rose-700">{error}</p> : null}
      </div>
    </article>
  );
}

export default function WriterGoalsPanel({ goals, onSave, onRemove }: WriterGoalsPanelProps) {
  if (goals.length === 0) {
    return (
      <div className="bookshop-subcard p-6 text-center text-[var(--bookshop-muted)]">
        Create your first Draft to set a writing target and deadline.
      </div>
    );
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2" data-testid="writer-goals-panel">
      {goals.map((goal) => (
        <GoalCard
          key={`${goal.bookId}:${goal.updatedAt ?? 'not-set'}`}
          goal={goal}
          onSave={onSave}
          onRemove={onRemove}
        />
      ))}
    </div>
  );
}
