import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { ApiError, api, tokenStore } from './api';
import { toast } from './hooks';
import type { AuthResponse, ProfileStatus, Role, SignupResponse, User } from './types';

interface AuthState {
  user: User | null;
  profiles: ProfileStatus | null;
  /** Portal this session signed in to. A session is locked to one role; switching means signing in again. */
  activeRole: Role | null;
  loading: boolean;
  login: (email: string, password: string, role: Role) => Promise<AuthResponse>;
  signup: (body: { name: string; email: string; password: string; role: Role; companyName?: string; industry?: string }) => Promise<SignupResponse>;
  /** Enter the 6-digit code emailed at signup; signs the account in on success. */
  verifyEmail: (email: string, code: string, role: Role) => Promise<AuthResponse>;
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
    // Only a rejected token ends the session. A network blip, a 5xx, a
    // rate-limit answer or a cold-starting server must not sign the user out,
    // so those are retried a few times before giving up for this page load.
    for (let attempt = 1; ; attempt++) {
      try {
        const r = await api.get<{ user: User; profiles: ProfileStatus }>('/auth/me');
        setUser(r.user);
        setProfiles(r.profiles);
        break;
      } catch (e) {
        if (e instanceof ApiError && e.status === 401) {
          tokenStore.clear();
          setUser(null);
          setProfiles(null);
          setActiveRoleState(null);
          break;
        }
        if (attempt >= 3) {
          toast.error('Could not reach the Findry server. Check your connection and reload.');
          break;
        }
        await new Promise((r) => setTimeout(r, 4000 * attempt));
      }
    }
    setLoading(false);
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
        const r = await api.post<SignupResponse>('/auth/signup', body);
        if (!r.verificationRequired) {
          apply(r);
          setActiveRole(body.role);
        }
        return r;
      },
      verifyEmail: async (email, code, role) => {
        const r = apply(await api.post<AuthResponse>('/auth/verify-email', { email, code }));
        setActiveRole(role);
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
