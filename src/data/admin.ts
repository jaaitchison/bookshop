import type { AdminStats, AdminAction } from '@/src/types/admin';
import { formatGbp } from '@/src/lib/currency';

export const getAdminStats = (): AdminStats => {
  return {
    totalBooks: 12847,
    totalUsers: 45230,
    totalRevenue: 1245670,
    totalOrders: 8932,
    revenueGrowth: 12.5,
    orderGrowth: 8.3,
    userGrowth: 15.2,
  };
};

export const getRecentActivity = (): AdminAction[] => [
  {
    id: '1',
    type: 'book_added',
    description: 'New book "The Midnight Library" added to catalogue',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
  },
  {
    id: '2',
    type: 'user_registered',
    description: 'New user registered: Sarah Johnson',
    timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
  },
  {
    id: '3',
    type: 'order_completed',
    description: 'Order #12847 completed - Total: £145.99',
    timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
  },
  {
    id: '4',
    type: 'review_posted',
    description: '5-star review posted for "Project Hail Mary"',
    timestamp: new Date(Date.now() - 8 * 60 * 60 * 1000),
  },
  {
    id: '5',
    type: 'book_added',
    description: 'New book "Lessons in Chemistry" added to catalogue',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000),
  },
];

export const formatCurrency = (value: number): string => {
  return formatGbp(value);
};

export const formatDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-GB', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};
