export type AccountRole = 'reader' | 'writer' | 'admin';
export type AccountGoal = 'reading' | 'writing' | 'both';
export type SocialProvider = 'Google' | 'Microsoft' | 'Apple';

export interface AccountProfile {
  id: string;
  name: string;
  username: string;
  email: string;
  bio: string;
  avatar: string;
  location: string;
  joined: string;
  goals: AccountGoal[];
  roles: {
    reader: boolean;
    writer: boolean;
    admin: boolean;
  };
  activeRole: AccountRole;
  onboardingComplete: boolean;
  connectedSocials: SocialProvider[];
  mfaEnabled: boolean;
  mfaMethod: 'Authenticator app' | 'SMS' | 'Passkey' | 'Not enabled';
}

export interface AccountBookSummary {
  id: string;
  title: string;
  author: string;
  cover: string;
  status: string;
  progress?: string;
}

export interface AccountOrderItem {
  id: string;
  title: string;
  author: string;
  price: number;
  quantity: number;
}

export interface AccountOrder {
  id: string;
  orderedAt: string;
  total: number;
  status: 'Processing' | 'Packed' | 'Shipped' | 'Delivered';
  items: AccountOrderItem[];
  shippingName: string;
  shippingEmail: string;
  shippingAddress: string;
  shippingCity: string;
  shippingZip: string;
}

export interface AccountActivityItem {
  title: string;
  detail: string;
  tone: 'reader' | 'writer' | 'admin';
}

export interface AccountNotificationItem {
  id: string;
  title: string;
  detail: string;
  category: 'reader' | 'writer' | 'admin';
  timestamp: string;
  unread: boolean;
}
