import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { api, tokenStore } from './api';
import type { AuthResponse, ProfileStatus, Role, User } from './types';

interface AuthState {
  user: User | null;
  profiles: ProfileStatus | null;
  /** Portal this session signed in to. A session is locked to one role; switching means signing in again. */
  activeRole: Role | null;
  loading: boolean;
  login: (email: string, password: string, role: Role) => Promise<AuthResponse>;
  signup: (body: { name: string; email: string; password: string; role: Role; companyName?: string; industry?: string }) => Promise<AuthResponse>;
  logout: () => void;
  refresh: () => Promise<void>;
  /** Edit the account itself (name / email). */
  updateAccount: (body: { name?: string; email?: string }) => Promise<void>;
  /** Change password; other sessions are signed out, this one gets a fresh token. */
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profiles, setProfiles] = useState<ProfileStatus | null>(null);
  const [activeRole, setActiveRoleState] = useState<Role | null>(tokenStore.getRole());
  const [loading, setLoading] = useState(!!tokenStore.get());
  const setActiveRole = (r: Role) => {
    tokenStore.setRole(r);
    setActiveRoleState(r);
  };

  const refresh = useCallback(async () => {
    if (!tokenStore.get()) {
      setUser(null);
      setProfiles(null);
      setActiveRoleState(null);
      setLoading(false);
      return;
    }
    try {
      const r = await api.get<{ user: User; profiles: ProfileStatus }>('/auth/me');
      setUser(r.user);
      setProfiles(r.profiles);
    } catch {
      tokenStore.clear();
      setUser(null);
      setProfiles(null);
      setActiveRoleState(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const apply = (r: AuthResponse) => {
    tokenStore.set(r.token);
    setUser(r.user);
    setProfiles(r.profiles);
    return r;
  };

  const value = useMemo<AuthState>(
    () => ({
      user,
      profiles,
      activeRole,
      loading,
      refresh,
      // The server rejects (403 ROLE_MISMATCH) when the account isn't registered under `role`.
      login: async (email, password, role) => {
        const r = apply(await api.post<AuthResponse>('/auth/login', { email, password, role }));
        setActiveRole(role);
        return r;
      },
      signup: async (body) => {
        const r = apply(await api.post<AuthResponse>('/auth/signup', body));
        setActiveRole(body.role);
        return r;
      },
      logout: () => {
        tokenStore.clear();
        setUser(null);
        setProfiles(null);
        setActiveRoleState(null);
      },
      updateAccount: async (body) => {
        const r = await api.patch<{ user: User; profiles: ProfileStatus }>('/auth/me', body);
        setUser(r.user);
        setProfiles(r.profiles);
      },
      changePassword: async (currentPassword, newPassword) => {
        const r = await api.post<{ ok: true; token: string }>('/auth/change-password', { currentPassword, newPassword });
        tokenStore.set(r.token);
      },
    }),
    [user, profiles, activeRole, loading, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Where a user should land after login, based on roles + onboarding state. */
export function homeFor(user: User, profiles: ProfileStatus | null, preferred?: Role): string {
  const role = preferred && user.roles.includes(preferred) ? preferred : user.lastRole && user.roles.includes(user.lastRole) ? user.lastRole : user.roles[0];
  if (!role) return '/';
  if (role === 'seeker') return profiles?.seekerOnboarded ? '/seeker' : '/seeker/onboarding';
  return profiles?.employerOnboarded ? '/employer' : '/employer/onboarding';
}
