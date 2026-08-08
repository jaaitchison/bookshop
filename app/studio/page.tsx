'use client';

import React, { useState } from 'react';
import { getWriterStats, getWriterBooks, getRecentActivities } from '@/src/data/studio';
import WriterStatsPanel from '@/src/components/studio/WriterStatsPanel';
import WriterBooksList from '@/src/components/studio/WriterBooksList';
import WriterActivityFeed from '@/src/components/studio/WriterActivityFeed';

export default function WriterStudioPage() {
  const [filterStatus, setFilterStatus] = useState('all');
  const stats = getWriterStats();
  const books = getWriterBooks();
  const activities = getRecentActivities();

  const handlePublishBook = () => {
    // Navigate to book creation form
    console.log('Navigating to book creation...');
    // In a full implementation, would navigate to /studio/new or show modal
    alert('Book creation form would open here');
  };

  const handleFilterChange = (status: string) => {
    setFilterStatus(status);
    console.log('Filtering books by status:', status);
  };

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'write':
        handlePublishBook();
        break;
      case 'analytics':
        console.log('Opening analytics dashboard');
        alert('Analytics dashboard would open here');
        break;
      case 'reviews':
        console.log('Opening reader reviews');
        alert('Reader reviews section would open here');
        break;
      case 'settings':
        console.log('Opening studio settings');
        alert('Studio settings would open here');
        break;
      default:
        break;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100">
                Writer Studio
              </h1>
              <p className="text-lg text-gray-600 dark:text-gray-400 mt-2">
                Manage your books, track sales, and engage with readers
              </p>
            </div>
            <button 
              onClick={handlePublishBook}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
            >
              + Publish New Book
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats Panel */}
        <div className="mb-12">
          <WriterStatsPanel stats={stats} />
        </div>

        {/* Layout: Books List and Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Books List - 2/3 width */}
          <div className="lg:col-span-2">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  My Books
                </h2>
                <div className="flex gap-3">
                  <select 
                    value={filterStatus}
                    onChange={(e) => handleFilterChange(e.target.value)}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm"
                  >
                    <option value="all">All Books</option>
                    <option value="published">Published</option>
                    <option value="draft">Drafts</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>
            </div>
            <WriterBooksList books={books} />
          </div>

          {/* Activity Feed - 1/3 width */}
          <div className="lg:col-span-1">
            <WriterActivityFeed activities={activities} />
          </div>
        </div>

        {/* Quick Start Section */}
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-8">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-6">
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <button 
              onClick={() => handleQuickAction('write')}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-center"
            >
              <div className="text-2xl mb-2">📝</div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Write Book</p>
            </button>
            <button 
              onClick={() => handleQuickAction('analytics')}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-center"
            >
              <div className="text-2xl mb-2">📊</div>
              <p className="font-medium text-gray-900 dark:text-gray-100">View Analytics</p>
            </button>
            <button 
              onClick={() => handleQuickAction('reviews')}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-center"
            >
              <div className="text-2xl mb-2">💬</div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Reader Reviews</p>
            </button>
            <button 
              onClick={() => handleQuickAction('settings')}
              className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-center"
            >
              <div className="text-2xl mb-2">⚙️</div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Settings</p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
