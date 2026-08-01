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
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-4">
      {statCards.map((card, idx) => (
        <div
          key={idx}
          className="bookshop-card rounded-[1.5rem] p-5 transition hover:-translate-y-0.5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-[var(--bookshop-muted)]">
                {card.label}
              </p>
              <p className="mt-2 text-3xl font-bold text-[var(--bookshop-text)]">
                {card.value}
              </p>
              {card.growth !== null && (
                <p
                  className={`text-sm mt-2 font-medium ${
                    card.growth >= 0
                      ? 'text-emerald-600 dark:text-emerald-300'
                      : 'text-rose-600 dark:text-rose-300'
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
