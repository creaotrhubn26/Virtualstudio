import { useState, useCallback, useEffect } from 'react';

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
    try {
      const stored = localStorage.getItem('adminUser');
      if (stored) {
        const parsed = JSON.parse(stored) as {
          id?: number | string;
          email?: string;
          display_name?: string;
          role?: User['role'];
        };
        return {
          id: parsed.id ? String(parsed.id) : 'unknown-user',
          email: parsed.email || '',
          name: parsed.display_name || parsed.email || 'Ukjent bruker',
          role: parsed.role || 'user',
        };
      }
    } catch (error) {
      console.warn('[Auth] Failed to read adminUser:', error);
    }
    return {
      id: 'guest',
      email: '',
      name: 'Ukjent bruker',
      role: 'viewer',
    };
  };

  const [user, setUser] = useState<User | null>(getStoredUser);
  const [loading] = useState(false);

  useEffect(() => {
    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'adminUser') {
        setUser(getStoredUser());
      }
    };
    const handleAuthUpdate = () => setUser(getStoredUser());
    window.addEventListener('storage', handleStorage);
    window.addEventListener('auth-user-updated', handleAuthUpdate);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('auth-user-updated', handleAuthUpdate);
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
