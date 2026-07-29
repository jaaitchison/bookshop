'use client';

import React from 'react';
import type { WriterStats } from '@/src/types/studio';

interface WriterStatsPanelProps {
  stats: WriterStats;
}

export default function WriterStatsPanel({ stats }: WriterStatsPanelProps) {
  const statCards = [
    {
      label: 'Total Books',
      value: stats.totalBooks,
      growth: null,
      color: 'blue',
      icon: '📚',
    },
    {
      label: 'Total Views',
      value: stats.totalViews.toLocaleString(),
      growth: stats.viewsGrowth,
      color: 'purple',
      icon: '👁️',
    },
    {
      label: 'Total Sales',
      value: stats.totalSales.toLocaleString(),
      growth: stats.salesGrowth,
      color: 'green',
      icon: '💰',
    },
    {
      label: 'Avg Rating',
      value: stats.avgRating.toFixed(1),
      growth: null,
      color: 'amber',
      icon: '⭐',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statCards.map((card, idx) => (
        <div
          key={idx}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                {card.label}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100 mt-2">
                {card.value}
              </p>
              {card.growth !== null && (
                <p
                  className={`text-sm mt-2 font-medium ${
                    card.growth >= 0
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {card.growth >= 0 ? '↑' : '↓'} {Math.abs(card.growth)}% from last month
                </p>
              )}
            </div>
            <div className="text-3xl">{card.icon}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
