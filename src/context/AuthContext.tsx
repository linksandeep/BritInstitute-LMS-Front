import React, { createContext, useCallback, useContext, useEffect, useRef, useState, ReactNode } from 'react';
import { authApi } from '../api';

interface User {
  id: string;
  name: string;
  username: string;
  role: 'superadmin' | 'admin' | 'teacher' | 'student';
  phone?: string;
  email?: string;
  enrolledCourse?: { _id: string; title: string; description: string };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: (reason?: 'manual' | 'inactivity') => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('brit_token'));
  const [inactivityTimeoutMinutes, setInactivityTimeoutMinutes] = useState(30);
  const [loading, setLoading] = useState(true);
  const lastActivityRef = useRef(Date.now());
  const logoutRef = useRef<(reason?: 'manual' | 'inactivity') => void>(() => undefined);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('brit_token');
      try {
        const configRes = await authApi.getSessionConfig();
        setInactivityTimeoutMinutes(Number(configRes.data.inactivityTimeoutMinutes) || 30);
      } catch {
        setInactivityTimeoutMinutes(30);
      }
      if (savedToken) {
        try {
          const res = await authApi.getMe();
          setUser(res.data.user);
        } catch {
          localStorage.removeItem('brit_token');
          setToken(null);
        }
      }
      setLoading(false);
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (!user || !token) return;

    const markActivity = () => {
      lastActivityRef.current = Date.now();
    };
    const activityEvents = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];
    activityEvents.forEach((event) => window.addEventListener(event, markActivity, { passive: true }));

    const timeoutMs = Math.max(1, inactivityTimeoutMinutes) * 60 * 1000;
    const inactivityInterval = window.setInterval(() => {
      if (Date.now() - lastActivityRef.current >= timeoutMs) {
        logoutRef.current('inactivity');
      }
    }, 15000);

    const heartbeatInterval = window.setInterval(() => {
      authApi.heartbeat().catch(() => undefined);
    }, 60000);
    authApi.heartbeat().catch(() => undefined);

    return () => {
      activityEvents.forEach((event) => window.removeEventListener(event, markActivity));
      window.clearInterval(inactivityInterval);
      window.clearInterval(heartbeatInterval);
    };
  }, [inactivityTimeoutMinutes, token, user]);

  /**
   * Login: fetch token + populate user.
   * Navigation is handled by the caller via a useEffect watching `user`,
   * so we avoid the React 18 batching race where navigate fires before
   * setUser has flushed.
   */
  const login = async (username: string, password: string): Promise<void> => {
    const res = await authApi.login(username, password);
    const { token: newToken, sessionId, inactivityTimeoutMinutes: timeoutMinutes } = res.data;
    localStorage.setItem('brit_token', newToken);
    if (sessionId) localStorage.setItem('brit_session_id', sessionId);
    setToken(newToken);
    if (timeoutMinutes) setInactivityTimeoutMinutes(Number(timeoutMinutes) || 30);
    lastActivityRef.current = Date.now();
    // Fetch fully-populated user (enrolledCourse with _id + title)
    const meRes = await authApi.getMe();
    setUser(meRes.data.user);
  };

  const logout = useCallback((reason: 'manual' | 'inactivity' = 'manual') => {
    if (localStorage.getItem('brit_token')) {
      authApi.logout(reason).catch(() => undefined);
    }
    localStorage.removeItem('brit_token');
    localStorage.removeItem('brit_session_id');
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    logoutRef.current = logout;
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
