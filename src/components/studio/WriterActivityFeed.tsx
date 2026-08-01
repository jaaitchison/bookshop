'use client';

import React from 'react';
import type { WriterActivity } from '@/src/types/studio';
import { formatDate } from '@/src/data/studio';

interface WriterActivityFeedProps {
  activities: WriterActivity[];
}

export default function WriterActivityFeed({ activities }: WriterActivityFeedProps) {
  const getActivityIcon = (type: WriterActivity['type']) => {
    const icons = {
      book_published: '📤',
      review_received: '⭐',
      sale_made: '💵',
      view_milestone: '🎯',
    };
    return icons[type];
  };

  const getActivityColor = (type: WriterActivity['type']) => {
    const colors = {
      book_published: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800/50',
      review_received: 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50',
      sale_made: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800/50',
      view_milestone: 'bg-fuchsia-50 dark:bg-fuchsia-950/30 border-fuchsia-200 dark:border-fuchsia-800/50',
    };
    return colors[type];
  };

  return (
    <div className="bookshop-card rounded-[1.5rem] p-6">
      <h2 className="mb-6 text-xl font-bold text-[var(--bookshop-text)]">
        Recent Activity
      </h2>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div
            key={activity.id}
            className={`border rounded-lg p-4 ${getActivityColor(activity.type)}`}
          >
            <div className="flex items-start gap-4">
              <div className="text-2xl flex-shrink-0">{getActivityIcon(activity.type)}</div>
              <div className="flex-grow">
                <p className="text-sm font-medium text-[var(--bookshop-text)]">
                  {activity.message}
                </p>
                <p className="mt-1 text-xs text-[var(--bookshop-muted)]">
                  {formatDate(activity.timestamp)}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
