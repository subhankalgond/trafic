import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import { authService, AuthUser } from '../services/services';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (body: { name: string; email: string; phone: string; password: string }) => Promise<AuthUser>;
  logout: () => void;
  isOperator: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('sf_token');
    if (!token) {
      setLoading(false);
      return;
    }
    authService
      .me()
      .then((d) => setUser(d.user))
      .catch(() => {
        localStorage.removeItem('sf_token');
      })
      .finally(() => setLoading(false));
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      async login(email, password) {
        const { data } = await authService.login({ email, password });
        localStorage.setItem('sf_token', data.token);
        setUser(data.user);
        return data.user;
      },
      async register(body) {
        const { data } = await authService.register(body);
        localStorage.setItem('sf_token', data.token);
        setUser(data.user);
        return data.user;
      },
      logout() {
        localStorage.removeItem('sf_token');
        setUser(null);
      },
      isOperator: user?.role === 'operator' || user?.role === 'admin',
      isAdmin: user?.role === 'admin',
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
