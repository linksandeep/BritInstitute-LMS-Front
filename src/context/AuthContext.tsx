import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authApi } from '../api';

interface User {
  id: string;
  name: string;
  username: string;
  role: 'admin' | 'student';
  enrolledCourse?: { _id: string; title: string; description: string };
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('brit_token'));
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem('brit_token');
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

  /**
   * Login: fetch token + populate user.
   * Navigation is handled by the caller via a useEffect watching `user`,
   * so we avoid the React 18 batching race where navigate fires before
   * setUser has flushed.
   */
  const login = async (username: string, password: string): Promise<void> => {
    const res = await authApi.login(username, password);
    const { token: newToken } = res.data;
    localStorage.setItem('brit_token', newToken);
    setToken(newToken);
    // Fetch fully-populated user (enrolledCourse with _id + title)
    const meRes = await authApi.getMe();
    setUser(meRes.data.user);
  };

  const logout = () => {
    localStorage.removeItem('brit_token');
    setToken(null);
    setUser(null);
  };

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
