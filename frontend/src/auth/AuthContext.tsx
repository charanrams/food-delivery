import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AuthResponseDto, UserDto, UserRole } from '@a3/contracts';
import { api, onSessionExpired, refreshSession, setAccessToken } from '@/lib/api';

export type SessionUser = Pick<UserDto, 'id' | 'name' | 'role'> & Partial<UserDto>;

interface AuthState {
  user: SessionUser | null;
  /** 'loading' until the refresh cookie has been tried on first load. */
  status: 'loading' | 'ready';
  login: (identifier: string, password: string) => Promise<SessionUser>;
  /** Signs in with an auth response the caller already obtained (e.g. after sign-up). */
  acceptSession: (res: AuthResponseDto) => SessionUser;
  logout: () => Promise<void>;
  updateUser: (u: SessionUser) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children, initialUser }: { children: ReactNode; initialUser?: SessionUser | null }) {
  const [user, setUser] = useState<SessionUser | null>(initialUser ?? null);
  const [status, setStatus] = useState<AuthState['status']>(initialUser !== undefined ? 'ready' : 'loading');

  useEffect(() => {
    onSessionExpired(() => setUser(null));
    if (initialUser !== undefined) return;
    // Restore the session from the HttpOnly refresh cookie (docs/SECURITY.md §1).
    refreshSession().then((s) => {
      setUser(s?.user ?? null);
      setStatus('ready');
    });
  }, [initialUser]);

  const acceptSession = useCallback((res: AuthResponseDto) => {
    setAccessToken(res.accessToken);
    setUser(res.user);
    return res.user;
  }, []);

  const updateUser = useCallback((u: SessionUser) => {
    setUser((prev) => (prev ? { ...prev, ...u } : u));
  }, []);

  const login = useCallback(
    async (identifier: string, password: string) => acceptSession(await api.post<AuthResponseDto>('/auth/login', { identifier, password })),
    [acceptSession],
  );

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => undefined);
    setAccessToken(null);
    setUser(null);
  }, []);

  const value = useMemo(() => ({ user, status, login, acceptSession, logout, updateUser }), [user, status, login, acceptSession, logout, updateUser]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

/** Where each role lands after login. */
export const HOME_FOR_ROLE: Record<UserRole, string> = {
  CUSTOMER: '/',
  ADMIN: '/admin',
  DELIVERY_PARTNER: '/delivery',
};
