import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role, User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: Role | null;
  isAuthenticated: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  setQuickAuth: (email: string, role: Role, name: string, token: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('keystone_token'));
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('keystone_user');
    return saved ? JSON.parse(saved) : null;
  });

  const role = user?.role || null;
  const isAuthenticated = !!token && !!user;

  useEffect(() => {
    const handleLogout = () => {
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = async (email: string, pass: string) => {
    const res = await authApi.login(email, pass);
    const userObj: User = {
      userEmail: res.email,
      userName: res.name || res.email.split('@')[0],
      role: res.role,
    };
    setToken(res.token);
    setUser(userObj);
    localStorage.setItem('keystone_token', res.token);
    localStorage.setItem('keystone_user', JSON.stringify(userObj));
  };

  const setQuickAuth = (email: string, role: Role, name: string, token: string) => {
    const userObj: User = { userEmail: email, userName: name, role };
    setToken(token);
    setUser(userObj);
    localStorage.setItem('keystone_token', token);
    localStorage.setItem('keystone_user', JSON.stringify(userObj));
  };

  const logout = () => {
    authApi.logout();
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, role, isAuthenticated, login, logout, setQuickAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
