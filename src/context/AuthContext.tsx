import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types.js';
import { getAuthToken, setAuthToken, getStoredUser, setStoredUser } from '../config/api.js';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  lang: 'en' | 'bn';
  setLang: (lang: 'en' | 'bn') => void;
  t: (en: string, bn: string) => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Pre-seed from stored user if available for instant offline / startup UI
  const [user, setUser] = useState<User | null>(() => getStoredUser());
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<'en' | 'bn'>('en');

  const refreshUser = async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data.user || null);
        setStoredUser(data.user || null);
      } else {
        // If server says unauthorized, clear stored session
        if (res.status === 401 || res.status === 403) {
          setUser(null);
          setStoredUser(null);
          setAuthToken(null);
        }
      }
    } catch (err) {
      console.warn('Network issue fetching current user:', err);
      // Keep offline cached user if present
      const cached = getStoredUser();
      if (cached && !user) {
        setUser(cached);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }
      if (data.token) {
        setAuthToken(data.token);
      }
      if (data.user) {
        setUser(data.user);
        setStoredUser(data.user);
      }
      return { success: true, user: data.user };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error(err);
    } finally {
      setUser(null);
      setStoredUser(null);
      setAuthToken(null);
    }
  };

  const t = (en: string, bn: string) => (lang === 'bn' ? bn : en);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser, lang, setLang, t }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
