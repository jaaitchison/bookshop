'use client';

import React from 'react';
import type { AdminAction } from '@/src/types/admin';
import { formatDate } from '@/src/data/admin';

const getActionIcon = (type: AdminAction['type']) => {
  switch (type) {
    case 'book_added':
      return (
        <div className="bg-blue-100 dark:bg-blue-900 p-2 rounded-full">
          <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5 11h-4v4h-2v-4H7v-2h4V7h2v4h4v2z" />
          </svg>
        </div>
      );
    case 'user_registered':
      return (
        <div className="bg-purple-100 dark:bg-purple-900 p-2 rounded-full">
          <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        </div>
      );
    case 'order_completed':
      return (
        <div className="bg-green-100 dark:bg-green-900 p-2 rounded-full">
          <svg className="w-4 h-4 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6h-2V4c0-.9-.9-2-2-2h-2c-1.1 0-2 1.1-2 2v2H9V4c0-.9-.9-2-2-2H5c-1.1 0-2 1.1-2 2v2H1v2h2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8h2V6zm-4-2h-2v2h2V4zM5 4h2v2H5V4zm0 14v-8h14v8H5z" />
          </svg>
        </div>
      );
    case 'review_posted':
      return (
        <div className="bg-yellow-100 dark:bg-yellow-900 p-2 rounded-full">
          <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2l-2.81 6.63L2 9.24l5.46 4.73L5.82 21z" />
          </svg>
        </div>
      );
  }
};

export const ActivityFeed: React.FC<{ activities: AdminAction[] }> = ({ activities }) => {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Activity</h2>
      <div className="space-y-4">
        {activities.map((activity) => (
          <div key={activity.id} className="flex items-start space-x-4 pb-4 border-b border-gray-200 dark:border-gray-800 last:border-b-0 last:pb-0">
            <div className="flex-shrink-0 mt-1">
              {getActionIcon(activity.type)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {activity.description}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formatDate(activity.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ActivityFeed;
