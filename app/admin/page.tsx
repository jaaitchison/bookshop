'use client';

import React from 'react';
import { getAdminStats, getRecentActivity } from '@/src/data/admin';
import AdminStatsPanel from '@/src/components/admin/AdminStatsPanel';
import ActivityFeed from '@/src/components/admin/ActivityFeed';
import { AdminAlert, AdminSection } from '@/src/components/admin/AdminComponents';

export default function AdminPage() {
  const stats = getAdminStats();
  const activities = getRecentActivity();

  return (
    <main className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your bookshop, users, and view analytics
          </p>
        </div>

        {/* Alert */}
        <div className="mb-8">
          <AdminAlert
            type="info"
            title="System Status"
            message="All systems operational. Last backup completed 2 hours ago."
          />
        </div>

        {/* Stats Panel */}
        <AdminSection
          title="Key Metrics"
          description="Overview of your bookshop performance"
        >
          <AdminStatsPanel stats={stats} />
        </AdminSection>

        {/* Activity Feed and Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Activity Feed */}
          <div className="lg:col-span-2">
            <AdminSection title="Recent Activity">
              <ActivityFeed activities={activities} />
            </AdminSection>
          </div>

          {/* Quick Actions */}
          <div>
            <AdminSection title="Quick Actions">
              <div className="space-y-3">
                <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                  Add New Book
                </button>
                <button className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                  Manage Users
                </button>
                <button className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                  View Orders
                </button>
                <button className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors">
                  Generate Report
                </button>
              </div>
            </AdminSection>

            {/* Admin Info */}
            <AdminSection title="Admin Info">
              <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 space-y-3">
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Role</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Super Admin</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last Login</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">Today at 2:34 PM</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Permissions</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">All Access</p>
                </div>
              </div>
            </AdminSection>
          </div>
        </div>
      </div>
    </main>
  );
}
