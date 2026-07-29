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
      book_published: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
      review_received: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
      sale_made: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
      view_milestone: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
    };
    return colors[type];
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
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
                <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  {activity.message}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
