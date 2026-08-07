'use client';

import React from 'react';
import DisplaySection from '@/src/components/layout/DisplaySection';

export const AdminAlert: React.FC<{
  type: 'warning' | 'info' | 'success' | 'error';
  title: string;
  message: string;
}> = ({ type, title, message }) => {
  const colors = {
    warning: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50',
    info: 'bg-violet-50 border-violet-200 dark:bg-violet-950/30 dark:border-violet-800/50',
    success: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50',
    error: 'bg-rose-50 border-rose-200 dark:bg-rose-950/30 dark:border-rose-800/50',
  };

  const textColors = {
    warning: 'text-amber-800 dark:text-amber-200',
    info: 'text-violet-800 dark:text-violet-200',
    success: 'text-emerald-800 dark:text-emerald-200',
    error: 'text-rose-800 dark:text-rose-200',
  };

  const titleColors = {
    warning: 'text-amber-900 dark:text-amber-100',
    info: 'text-violet-900 dark:text-violet-100',
    success: 'text-emerald-900 dark:text-emerald-100',
    error: 'text-rose-900 dark:text-rose-100',
  };

  return (
    <div className={`rounded-[1.5rem] border p-4 ${colors[type]}`}>
      <h3 className={`font-semibold ${titleColors[type]}`}>{title}</h3>
      <p className={`mt-1 text-sm ${textColors[type]}`}>{message}</p>
    </div>
  );
};

export const AdminSection: React.FC<{
  title: string;
  description?: string;
  children: React.ReactNode;
}> = ({ title, description, children }) => {
  return (
    <DisplaySection title={title} description={description} className="mb-6">
      {children}
    </DisplaySection>
  );
};

export default AdminAlert;
