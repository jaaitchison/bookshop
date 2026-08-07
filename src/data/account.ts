import type { AccountActivityItem, AccountNotificationItem, AccountOrder, AccountProfile } from '@/src/types/account';

export const accountActivity: AccountActivityItem[] = [
  {
    title: 'Order confirmation received',
    detail: 'Your latest order is packed and will arrive on Friday.',
    tone: 'reader',
  },
  {
    title: 'Reader reviews are growing',
    detail: 'Your latest release received 14 new reviews this week.',
    tone: 'writer',
  },
  {
    title: 'Moderation queue updated',
    detail: 'Three flagged reviews were reviewed and resolved.',
    tone: 'admin',
  },
];

export const accountNotifications: AccountNotificationItem[] = [
  {
    id: 'notif-order',
    title: 'Order update',
    detail: 'Your latest shipment was scanned and is in transit.',
    category: 'reader',
    timestamp: '12 min ago',
    unread: true,
  },
  {
    id: 'notif-sales',
    title: 'Creator insight',
    detail: 'Your newest book reached a new sales milestone this week.',
    category: 'writer',
    timestamp: '1 hr ago',
    unread: true,
  },
  {
    id: 'notif-mod',
    title: 'Admin note',
    detail: 'A moderation decision was logged for the recent review queue.',
    category: 'admin',
    timestamp: '3 hrs ago',
    unread: false,
  },
];

export const getPersonalizedNotifications = (profile: AccountProfile, orders: AccountOrder[]): AccountNotificationItem[] => {
  const dynamicItems: AccountNotificationItem[] = [];

  if (!profile.onboardingComplete) {
    dynamicItems.push({
      id: 'notif-onboarding',
      title: 'Onboarding still in progress',
      detail: 'Complete your goals so the account experience can reflect your reading or creator preferences.',
      category: 'reader',
      timestamp: 'Now',
      unread: true,
    });
  }

  if (profile.roles.writer) {
    dynamicItems.push({
      id: 'notif-writer',
      title: 'Creator tools are live',
      detail: 'Your writer persona is active, so the studio and publishing updates are now in focus.',
      category: 'writer',
      timestamp: 'Just now',
      unread: true,
    });
  }

  if (profile.roles.admin) {
    dynamicItems.push({
      id: 'notif-admin',
      title: 'Admin shortcuts ready',
      detail: 'Moderation and platform insights are available for your current role.',
      category: 'admin',
      timestamp: 'Just now',
      unread: false,
    });
  }

  if (orders.length > 0) {
    dynamicItems.push({
      id: 'notif-order-history',
      title: 'Order history updated',
      detail: `You now have ${orders.length} saved order${orders.length === 1 ? '' : 's'} in your account timeline.`,
      category: 'reader',
      timestamp: 'Now',
      unread: true,
    });
  }

  return [...dynamicItems, ...accountNotifications].slice(0, 6);
};
