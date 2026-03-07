import { useState, useCallback, useEffect } from 'react';
import authSessionService from '@/services/authSessionService';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  profession?: string;
  role: 'admin' | 'user' | 'viewer';
}

export function useAuth() {
  const getStoredUser = (): User | null => {
    const session = authSessionService.getSessionSync();
    const stored = session.adminUser;
    if (stored) {
      return {
        id: stored.id ? String(stored.id) : 'unknown-user',
        email: stored.email || '',
        name: stored.display_name || stored.email || 'Ukjent bruker',
        role: (stored.role as User['role']) || 'user',
      };
    }
    return {
      id: 'guest',
      email: '',
      name: 'Ukjent bruker',
      role: 'viewer',
    };
  };

  const [user, setUser] = useState<User | null>(getStoredUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    authSessionService.loadSession().then(() => {
      if (!isMounted) return;
      setUser(getStoredUser());
      setLoading(false);
    });

    const handleAuthUpdate = () => setUser(getStoredUser());
    window.addEventListener('auth-session-updated', handleAuthUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('auth-session-updated', handleAuthUpdate);
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    console.log('[Auth] Login attempt:', email);
    return { success: true };
  }, []);

  const logout = useCallback(async () => {
    console.log('[Auth] Logout');
  }, []);

  const isAuthenticated = user !== null;

  return { user, loading, login, logout, isAuthenticated };
}

export default useAuth;
