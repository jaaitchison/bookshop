'use client';

import React from 'react';

export const AdminAlert: React.FC<{
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
}> = ({ type, title, message }) => {
  const colors = {
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
  };

  const textColors = {
    warning: 'text-yellow-800 dark:text-yellow-200',
    info: 'text-blue-800 dark:text-blue-200',
    success: 'text-green-800 dark:text-green-200',
    error: 'text-red-800 dark:text-red-200',
  };

  const titleColors = {
    warning: 'text-yellow-900 dark:text-yellow-100',
    info: 'text-blue-900 dark:text-blue-100',
    success: 'text-green-900 dark:text-green-100',
    error: 'text-red-900 dark:text-red-100',
  };

  return (
    <div className={`rounded-lg border p-4 ${colors[type]}`}>
      <h3 className={`font-semibold ${titleColors[type]}`}>{title}</h3>
      <p className={`text-sm mt-1 ${textColors[type]}`}>{message}</p>
    </div>
  );
};

export const AdminSection: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => {
  return (
    <section className="mb-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{title}</h2>
        {description && (
          <p className="text-gray-600 dark:text-gray-400 mt-1">{description}</p>
        )}
      </div>
      <div>{children}</div>
    </section>
  );
};

export default AdminAlert;
