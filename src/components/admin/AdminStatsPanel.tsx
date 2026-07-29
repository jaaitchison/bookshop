'use client';

import React from 'react';
import type { AdminStats } from '@/src/types/admin';

interface StatCardProps {
  title: string;
  value: string | number;
  growth: number;
  icon: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, growth, icon }) => {
  const isPositive = growth >= 0;
  const color = isPositive ? 'text-green-600' : 'text-red-600';
  const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
          <p className={`text-sm font-semibold mt-2 ${color}`}>
            {isPositive ? '↑' : '↓'} {Math.abs(growth)}% from last month
          </p>
        </div>
        <div className={`p-3 rounded-lg ${bgColor}`}>
          {icon}
        </div>
      </div>
    </div>
  );
};

export const AdminStatsPanel: React.FC<{ stats: AdminStats }> = ({ stats }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Books"
        value={stats.totalBooks.toLocaleString()}
        growth={stats.userGrowth}
        icon={
          <svg className="w-6 h-6 text-blue-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 6.41L12 3l8 3.41V20H4V6.41M12 5l6 2.5V20h-5v-7h-2v7H6V7.5L12 5z" />
          </svg>
        }
      />
      <StatCard
        title="Total Users"
        value={stats.totalUsers.toLocaleString()}
        growth={stats.userGrowth}
        icon={
          <svg className="w-6 h-6 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
          </svg>
        }
      />
      <StatCard
        title="Total Orders"
        value={stats.totalOrders.toLocaleString()}
        growth={stats.orderGrowth}
        icon={
          <svg className="w-6 h-6 text-orange-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19 6h-2V4c0-.9-.9-2-2-2h-2c-1.1 0-2 1.1-2 2v2H9V4c0-.9-.9-2-2-2H5c-1.1 0-2 1.1-2 2v2H1v2h2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8h2V6zm-4-2h-2v2h2V4zM5 4h2v2H5V4zm0 14v-8h14v8H5z" />
          </svg>
        }
      />
      <StatCard
        title="Total Revenue"
        value={`$${(stats.totalRevenue / 1000).toFixed(1)}k`}
        growth={stats.revenueGrowth}
        icon={
          <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z" />
          </svg>
        }
      />
    </div>
  );
};

export default AdminStatsPanel;
