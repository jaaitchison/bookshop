"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import type {
  AccountGoal,
  AccountOrder,
  AccountProfile,
  AccountRole,
} from "@/src/types/account";

const ACCOUNT_API_URL = "/api/account";
const ACCOUNT_PROFILE_API_URL = "/api/account/profile";
const AUTH_ME_URL = "/api/auth/me";
const AUTH_SIGNIN_URL = "/api/auth/signin";
const AUTH_SIGNUP_URL = "/api/auth/signup";
const AUTH_SIGNOUT_URL = "/api/auth/signout";

interface AccountContextValue {
  profile: AccountProfile;
  setProfile: React.Dispatch<React.SetStateAction<AccountProfile>>;
  updateProfile: (updates: Partial<AccountProfile>) => void;
  setGoals: (goals: AccountGoal[]) => void;
  completeOnboarding: () => void;
  setActiveRole: (role: AccountRole) => void;
  hasRole: (role: AccountRole) => boolean;
  isAuthenticated: boolean;
  isAuthLoading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  refreshSession: () => Promise<boolean>;
  signIn: (email: string, password: string) => Promise<boolean>;
  signUp: (input: {
    name: string;
    email: string;
    password: string;
    username: string;
  }) => Promise<boolean>;
  signOut: () => Promise<void>;
  orders: AccountOrder[];
  refreshOrders: () => Promise<boolean>;
}

const createBaseProfile = (): AccountProfile => ({
  id: "",
  name: "",
  username: "",
  email: "",
  bio: "",
  avatar: "",
  location: "",
  joined: "",
  goals: ["reading"],
  roles: {
    reader: false,
    writer: false,
    admin: false,
  },
  activeRole: "reader",
  onboardingComplete: false,
  connectedSocials: [],
  mfaEnabled: false,
  mfaMethod: "Not enabled",
});

const normalizeProfile = (
  value?: Partial<AccountProfile>,
): AccountProfile => {
  const base = createBaseProfile();
  const source = value ?? {};

  return {
    ...base,
    ...source,
    roles: {
      ...base.roles,
      ...(source.roles ?? {}),
    },
    goals: source.goals ?? base.goals,
    connectedSocials: source.connectedSocials ?? base.connectedSocials,
    mfaEnabled: source.mfaEnabled ?? base.mfaEnabled,
    mfaMethod: source.mfaMethod ?? base.mfaMethod,
  };
};


const AccountContext = createContext<AccountContextValue | undefined>(
  undefined,
);

type AuthPayload = {
  profile?: AccountProfile | null;
  authenticated?: boolean;
  error?: string;
  code?: string;
};

export const AccountProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [profile, setProfile] = useState<AccountProfile>(() =>
    createBaseProfile(),
  );
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [orders, setOrders] = useState<AccountOrder[]>([]);

  const applyAuthenticatedProfile = (nextProfile: AccountProfile) => {
    setProfile(normalizeProfile(nextProfile));
    setIsAuthenticated(true);
    setAuthError(null);
  };

  const clearAuthenticatedState = () => {
    setProfile(createBaseProfile());
    setIsAuthenticated(false);
    setOrders([]);
  };

  const refreshSession = async (): Promise<boolean> => {
    try {
      const response = await fetch(AUTH_ME_URL, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        clearAuthenticatedState();
        return false;
      }

      const payload = (await response.json()) as AuthPayload;

      if (!payload.authenticated || !payload.profile) {
        clearAuthenticatedState();
        return false;
      }

      applyAuthenticatedProfile(payload.profile);
      return true;
    } catch {
      clearAuthenticatedState();
      return false;
    }
  };

  useEffect(() => {
    let active = true;

    const hydrateAuthentication = async () => {
      try {
        const response = await fetch(AUTH_ME_URL, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!active) {
          return;
        }

        if (!response.ok) {
          clearAuthenticatedState();
          return;
        }

        const payload = (await response.json()) as AuthPayload;

        if (payload.authenticated && payload.profile) {
          applyAuthenticatedProfile(payload.profile);
        } else {
          clearAuthenticatedState();
        }
      } catch {
        if (active) {
          clearAuthenticatedState();
        }
      } finally {
        if (active) {
          setIsAuthLoading(false);
        }
      }
    };

    void hydrateAuthentication();

    return () => {
      active = false;
    };
  }, []);

  const refreshOrders = useCallback(async (): Promise<boolean> => {
    if (!isAuthenticated || !profile.id) {
      setOrders([]);
      return false;
    }

    try {
      const response = await fetch(ACCOUNT_API_URL, {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        setOrders([]);
        return false;
      }

      const payload = (await response.json()) as
        | { orders?: AccountOrder[] }
        | AccountOrder[];

      const nextOrders = Array.isArray(payload)
        ? payload
        : payload.orders;

      if (!Array.isArray(nextOrders)) {
        setOrders([]);
        return false;
      }

      setOrders(nextOrders);
      return true;
    } catch {
      setOrders([]);
      return false;
    }
  }, [isAuthenticated, profile.id]);

  useEffect(() => {
    if (!isAuthenticated || !profile.id) {
      return;
    }

    let active = true;

    const loadOrders = async () => {
      try {
        const response = await fetch(ACCOUNT_API_URL, {
          method: "GET",
          credentials: "include",
          cache: "no-store",
        });

        if (!response.ok) {
          if (active) {
            setOrders([]);
          }
          return;
        }

        const payload = (await response.json()) as
          | { orders?: AccountOrder[] }
          | AccountOrder[];

        const nextOrders = Array.isArray(payload)
          ? payload
          : payload.orders;

        if (active) {
          setOrders(Array.isArray(nextOrders) ? nextOrders : []);
        }
      } catch {
        if (active) {
          setOrders([]);
        }
      }
    };

    void loadOrders();

    return () => {
      active = false;
    };
  }, [isAuthenticated, profile.id]);
  const persistProfileUpdates = async (
    updates: Partial<AccountProfile>,
  ) => {
    try {
      const response = await fetch(ACCOUNT_PROFILE_API_URL, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const payload = (await response.json()) as {
        profile?: AccountProfile;
        error?: string;
      };

      if (!response.ok || !payload.profile) {
        setAuthError(payload.error ?? "Profile update failed.");
        await refreshSession();
        return;
      }

      setProfile(normalizeProfile(payload.profile));
      setAuthError(null);
    } catch {
      setAuthError("Profile update failed.");
      await refreshSession();
    }
  };

  const updateProfile = (updates: Partial<AccountProfile>) => {
    const safeUpdates: Partial<AccountProfile> = {
      ...(updates.name !== undefined ? { name: updates.name } : {}),
      ...(updates.username !== undefined
        ? { username: updates.username }
        : {}),
      ...(updates.bio !== undefined ? { bio: updates.bio } : {}),
      ...(updates.avatar !== undefined ? { avatar: updates.avatar } : {}),
      ...(updates.location !== undefined
        ? { location: updates.location }
        : {}),
    };

    setProfile((current) =>
      normalizeProfile({
        ...current,
        ...safeUpdates,
        id: current.id,
        email: current.email,
        roles: current.roles,
      }),
    );

    void persistProfileUpdates(safeUpdates);
  };

  const setGoals = (goals: AccountGoal[]) => {
    setProfile((current) =>
      normalizeProfile({
        ...current,
        goals,
        roles: current.roles,
      }),
    );

    void persistProfileUpdates({ goals });
  };

  const completeOnboarding = () => {
    setProfile((current) =>
      normalizeProfile({
        ...current,
        onboardingComplete: true,
        roles: current.roles,
      }),
    );

    void persistProfileUpdates({
      onboardingComplete: true,
    });
  };

  const setActiveRole = (role: AccountRole) => {
    let permitted = false;

    setProfile((current) => {
      if (role === "writer" && !current.roles.writer) {
        return current;
      }

      if (role === "admin" && !current.roles.admin) {
        return current;
      }

      if (role === "reader" && !current.roles.reader) {
        return current;
      }

      permitted = true;

      return normalizeProfile({
        ...current,
        activeRole: role,
        roles: current.roles,
      });
    });

    if (permitted) {
      void persistProfileUpdates({
        activeRole: role,
      });
    }
  };

  const hasRole = (role: AccountRole) => {
    if (!isAuthenticated) {
      return false;
    }

    if (role === "reader") {
      return profile.roles.reader;
    }

    if (role === "writer") {
      return profile.roles.writer;
    }

    return profile.roles.admin;
  };

  const clearAuthError = () => {
    setAuthError(null);
  };

  const signIn = async (
    email: string,
    password: string,
  ): Promise<boolean> => {
    setAuthError(null);

    try {
      const response = await fetch(AUTH_SIGNIN_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const payload = (await response.json()) as AuthPayload;

      if (!response.ok || !payload.profile) {
        setAuthError(
          payload.error ??
            "We could not sign you in with that email and password.",
        );
        clearAuthenticatedState();
        return false;
      }

      applyAuthenticatedProfile(payload.profile);
      return true;
    } catch {
      setAuthError("Unable to sign you in right now.");
      clearAuthenticatedState();
      return false;
    }
  };

  const signUp = async (input: {
    name: string;
    email: string;
    password: string;
    username: string;
  }): Promise<boolean> => {
    setAuthError(null);

    try {
      const response = await fetch(AUTH_SIGNUP_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(input),
      });

      const payload = (await response.json()) as AuthPayload;

      if (!response.ok || !payload.profile) {
        setAuthError(
          payload.error ?? "Unable to create your account right now.",
        );
        clearAuthenticatedState();
        return false;
      }

      applyAuthenticatedProfile(payload.profile);
      return true;
    } catch {
      setAuthError("Unable to create your account right now.");
      clearAuthenticatedState();
      return false;
    }
  };

  const signOut = async () => {
    try {
      await fetch(AUTH_SIGNOUT_URL, {
        method: "POST",
        credentials: "include",
      });
    } finally {
      clearAuthenticatedState();
      setAuthError(null);
    }
  };

  return (
    <AccountContext.Provider
      value={{
        profile,
        setProfile,
        updateProfile,
        setGoals,
        completeOnboarding,
        setActiveRole,
        hasRole,
        isAuthenticated,
        isAuthLoading,
        authError,
        clearAuthError,
        refreshSession,
        signIn,
        signUp,
        signOut,
        orders,
        refreshOrders,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
};

export function useAccount(): AccountContextValue {
  const context = useContext(AccountContext);

  if (!context) {
    throw new Error("useAccount must be used within AccountProvider.");
  }

  return context;
}
