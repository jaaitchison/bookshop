"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { AccountGoal, AccountProfile, AccountOrder, AccountOrderItem, AccountRole } from '@/src/types/account';

interface StoredAccountUser {
  id: string;
  email: string;
  password: string;
  profile: AccountProfile;
}

interface AccountContextValue {
  profile: AccountProfile;
  setProfile: React.Dispatch<React.SetStateAction<AccountProfile>>;
  updateProfile: (updates: Partial<AccountProfile>) => void;
  setGoals: (goals: AccountGoal[]) => void;
  completeOnboarding: () => void;
  toggleWriter: (enabled?: boolean) => void;
  toggleAdmin: (enabled?: boolean) => void;
  setActiveRole: (role: AccountRole) => void;
  hasRole: (role: AccountRole) => boolean;
  isAuthenticated: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signIn: (email: string, password: string) => boolean;
  signUp: (input: { name: string; email: string; password: string; username: string }) => boolean;
  signOut: () => void;
  orders: AccountOrder[];
  placeOrder: (input: {
    items: AccountOrderItem[];
    total: number;
    shipping: {
      name: string;
      email: string;
      address: string;
      city: string;
      zip: string;
    };
  }) => boolean;
}

const createBaseProfile = (): AccountProfile => ({
  id: 'demo-user',
  name: 'Maya Chen',
  username: 'maya-reads',
  email: 'maya@example.com',
  bio: 'Reader, writer, and curator of thoughtful stories.',
  avatar: 'MC',
  location: 'Seattle, USA',
  joined: 'June 2024',
  goals: ['reading'],
  roles: {
    reader: true,
    writer: false,
    admin: false,
  },
  activeRole: 'reader',
  onboardingComplete: false,
});

const normalizeProfile = (value?: Partial<AccountProfile>): AccountProfile => {
  const base = createBaseProfile();
  const source = value ?? {};

  return {
    ...base,
    ...source,
    roles: {
      reader: true,
      writer: false,
      admin: false,
      ...(source.roles ?? {}),
    },
    goals: source.goals ?? base.goals,
  };
};

const PROFILE_STORAGE_KEY = 'bookshop-account-profile';
const SESSION_STORAGE_KEY = 'bookshop-auth-session';
const USERS_STORAGE_KEY = 'bookshop-auth-users';
const getOrdersStorageKey = (profileId: string) => `bookshop-account-orders-${profileId}`;

const AccountContext = createContext<AccountContextValue | undefined>(undefined);

const readStoredUsers = (): StoredAccountUser[] => {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(USERS_STORAGE_KEY);
    return stored ? (JSON.parse(stored) as StoredAccountUser[]) : [];
  } catch {
    return [];
  }
};

const writeStoredUsers = (users: StoredAccountUser[]) => {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useState<AccountProfile>(() => normalizeProfile());
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedProfile = window.localStorage.getItem(PROFILE_STORAGE_KEY);
    const storedSession = window.localStorage.getItem(SESSION_STORAGE_KEY);

    if (storedProfile) {
      try {
        const parsed = JSON.parse(storedProfile) as Partial<AccountProfile>;
        setProfile(normalizeProfile(parsed));
      } catch {
        window.localStorage.removeItem(PROFILE_STORAGE_KEY);
      }
    }

    if (storedSession) {
      try {
        const parsed = JSON.parse(storedSession) as { profile?: Partial<AccountProfile> };
        if (parsed.profile) {
          setProfile(normalizeProfile(parsed.profile));
          setIsAuthenticated(true);
        }
      } catch {
        window.localStorage.removeItem(SESSION_STORAGE_KEY);
      }
    }

    if (!readStoredUsers().length) {
      const demoProfile = normalizeProfile({
        id: 'demo-user',
        name: 'Maya Chen',
        username: 'maya-reads',
        email: 'maya@example.com',
        avatar: 'MC',
        location: 'Seattle, USA',
        joined: 'June 2024',
        goals: ['reading'],
        roles: {
          reader: true,
          writer: false,
          admin: false,
        },
        activeRole: 'reader',
        onboardingComplete: false,
      });

      writeStoredUsers([{ id: demoProfile.id, email: demoProfile.email, password: 'bookshop', profile: demoProfile }]);
    }

    setHasLoaded(true);
  }, []);

  useEffect(() => {
    if (!hasLoaded || typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));

    if (isAuthenticated) {
      const users = readStoredUsers();
      const updatedUsers = users.filter((entry) => entry.email.toLowerCase() !== profile.email.toLowerCase());
      updatedUsers.push({
        id: profile.id,
        email: profile.email,
        password: users.find((entry) => entry.email.toLowerCase() === profile.email.toLowerCase())?.password ?? '',
        profile,
      });
      writeStoredUsers(updatedUsers);
      window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify({ profile }));
    } else {
      window.localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  }, [hasLoaded, isAuthenticated, profile]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!profile.id) {
      return;
    }

    window.localStorage.setItem(getOrdersStorageKey(profile.id), JSON.stringify(orders));
  }, [orders, profile.id]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (!profile.id) {
      return;
    }

    const storedOrders = window.localStorage.getItem(getOrdersStorageKey(profile.id));
    if (storedOrders) {
      try {
        const parsed = JSON.parse(storedOrders) as AccountOrder[];
        if (Array.isArray(parsed)) {
          setOrders(parsed);
        }
      } catch {
        window.localStorage.removeItem(getOrdersStorageKey(profile.id));
      }
    }
  }, [profile.id]);

  const updateProfile = (updates: Partial<AccountProfile>) => {
    setProfile((current) => normalizeProfile({
      ...current,
      ...updates,
      roles: {
        ...current.roles,
        ...(updates.roles ?? {}),
      },
    }));
  };

  const setGoals = (goals: AccountGoal[]) => {
    setProfile((current) => {
      const writerEnabled = goals.includes('writing') || goals.includes('both');
      const nextActiveRole = current.activeRole === 'admin'
        ? 'admin'
        : writerEnabled
          ? 'writer'
          : current.activeRole === 'writer'
            ? 'reader'
            : current.activeRole;

      return normalizeProfile({
        ...current,
        goals,
        roles: {
          ...current.roles,
          writer: writerEnabled,
        },
        activeRole: nextActiveRole,
      });
    });
  };

  const completeOnboarding = () => {
    setProfile((current) => normalizeProfile({
      ...current,
      onboardingComplete: true,
      roles: {
        ...current.roles,
        writer: current.goals.includes('writing') || current.goals.includes('both'),
      },
      activeRole: current.goals.includes('writing') || current.goals.includes('both')
        ? 'writer'
        : 'reader',
    }));
  };

  const toggleWriter = (enabled?: boolean) => {
    setProfile((current) => {
      const writerEnabled = enabled ?? !current.roles.writer;
      const nextActiveRole = writerEnabled ? 'writer' : 'reader';
      return normalizeProfile({
        ...current,
        roles: {
          ...current.roles,
          writer: writerEnabled,
        },
        activeRole: current.roles.admin ? 'admin' : nextActiveRole,
      });
    });
  };

  const toggleAdmin = (enabled?: boolean) => {
    setProfile((current) => {
      const adminEnabled = enabled ?? !current.roles.admin;
      const nextActiveRole = adminEnabled ? 'admin' : current.roles.writer ? 'writer' : 'reader';
      return normalizeProfile({
        ...current,
        roles: {
          ...current.roles,
          admin: adminEnabled,
        },
        activeRole: nextActiveRole,
      });
    });
  };

  const setActiveRole = (role: AccountRole) => {
    setProfile((current) => {
      if (role === 'writer' && !current.roles.writer) {
        return current;
      }

      if (role === 'admin' && !current.roles.admin) {
        return current;
      }

      return normalizeProfile({
        ...current,
        activeRole: role,
      });
    });
  };

  const hasRole = (role: AccountRole) => {
    if (role === 'reader') {
      return profile.roles.reader;
    }

    if (role === 'writer') {
      return profile.roles.writer;
    }

    return profile.roles.admin;
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const signIn = (email: string, password: string) => {
    if (typeof window === 'undefined') {
      return false;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const users = readStoredUsers();
    const existingUser = users.find((entry) => entry.email.toLowerCase() === normalizedEmail && entry.password === password);

    if (!existingUser) {
      setAuthError('We could not find an account with that email and password.');
      return false;
    }

    setAuthError(null);
    setProfile(normalizeProfile(existingUser.profile));
    setIsAuthenticated(true);
    return true;
  };

  const signUp = (input: { name: string; email: string; password: string; username: string }) => {
    if (typeof window === 'undefined') {
      return false;
    }

    const name = input.name.trim();
    const email = input.email.trim().toLowerCase();
    const username = input.username.trim() || `reader-${Math.random().toString(36).slice(2, 6)}`;

    if (!name || !email || !input.password) {
      setAuthError('Please complete all required fields.');
      return false;
    }

    const users = readStoredUsers();
    if (users.some((entry) => entry.email.toLowerCase() === email)) {
      setAuthError('That email is already registered for the demo experience.');
      return false;
    }

    const avatar = name
      .split(/\s+/)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || 'U';

    const nextProfile = normalizeProfile({
      id: `user-${Date.now()}`,
      name,
      username,
      email,
      avatar,
      joined: new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(new Date()),
      goals: ['reading'],
      roles: {
        reader: true,
        writer: false,
        admin: false,
      },
      activeRole: 'reader',
      onboardingComplete: false,
    });

    const nextUsers = [...users, {
      id: nextProfile.id,
      email,
      password: input.password,
      profile: nextProfile,
    }];

    writeStoredUsers(nextUsers);
    setAuthError(null);
    setProfile(nextProfile);
    setIsAuthenticated(true);
    return true;
  };

  const signOut = () => {
    setAuthError(null);
    setProfile(normalizeProfile());
    setIsAuthenticated(false);
  };

  const placeOrder = (input: {
    items: AccountOrderItem[];
    total: number;
    shipping: {
      name: string;
      email: string;
      address: string;
      city: string;
      zip: string;
    };
  }) => {
    if (!isAuthenticated) {
      return false;
    }

    const order: AccountOrder = {
      id: `order-${Date.now()}`,
      orderedAt: new Date().toISOString(),
      total: input.total,
      status: 'Processing',
      items: input.items,
      shippingName: input.shipping.name,
      shippingEmail: input.shipping.email,
      shippingAddress: input.shipping.address,
      shippingCity: input.shipping.city,
      shippingZip: input.shipping.zip,
    };

    setOrders((current) => [order, ...current]);
    return true;
  };

  const value = useMemo(
    () => ({
      profile,
      setProfile,
      updateProfile,
      setGoals,
      completeOnboarding,
      toggleWriter,
      toggleAdmin,
      setActiveRole,
      hasRole,
      isAuthenticated,
      authError,
      clearAuthError,
      signIn,
      signUp,
      signOut,
      orders,
      placeOrder,
    }),
    [authError, isAuthenticated, orders, profile]
  );

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
};

export const useAccount = () => {
  const context = useContext(AccountContext);
  if (!context) {
    throw new Error('useAccount must be used inside an AccountProvider');
  }
  return context;
};
