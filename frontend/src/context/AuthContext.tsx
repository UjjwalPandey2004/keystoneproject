import React, { createContext, useContext, useState, useEffect } from 'react';
import { Role, User } from '../types';
import { authApi } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  role: Role | null;
  // The role whose screens are shown. Equals `role`, except when a manager uses "View As".
  viewRole: Role | null;
  setViewAs: (role: Role) => void;
  isAuthenticated: boolean;
  demoMode: boolean;
  login: (email: string, pass: string) => Promise<void>;
  logout: () => void;
  setQuickAuth: (email: string, role: Role, name: string, token: string) => void;
  // After a password change the server issues a new token; older ones stop working.
  replaceToken: (token: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const VIEW_AS_KEY = 'keystone_view_as';

const readSavedUser =(): User | null => {
  try {
    const saved = localStorage.getItem('keystone_user');
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('keystone_token'));
  const [user, setUser] = useState<User | null>(readSavedUser);

  const [demoMode, setDemoMode] = useState(false);

  // "View As" is a UI-only preview for managers: the token, the backend role and every API
  // permission stay the manager's. It lives in sessionStorage so it ends with the browser tab.
  const [viewAs, setViewAsState] = useState<Role | null>(() => sessionStorage.getItem(VIEW_AS_KEY) as Role | null);

  const role = user?.role || null;
  const viewRole = role === 'MANAGER' && viewAs ? viewAs : role;
  const isAuthenticated = !!token && !!user;

  const setViewAs = (next: Role) => {
    if (role !== 'MANAGER') return;
    if (next === 'MANAGER') {
      sessionStorage.removeItem(VIEW_AS_KEY);
      setViewAsState(null);
    } else {
      sessionStorage.setItem(VIEW_AS_KEY, next);
      setViewAsState(next);
    }
  };

  const clearViewAs = () => {
    sessionStorage.removeItem(VIEW_AS_KEY);
    setViewAsState(null);
  };

  // Demo logins are only offered when the backend says it is running in demo mode.
  useEffect(() => {
    authApi.getConfig()
      .then((config) => setDemoMode(config.demoMode === true))
      .catch(() => setDemoMode(false));
  }, []);

  useEffect(() => {
    const handleLogout = () => {
      clearViewAs();
      setToken(null);
      setUser(null);
    };
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const storeUser = (userObj: User) => {
    setUser(userObj);
    localStorage.setItem('keystone_user', JSON.stringify(userObj));
  };

  // Whenever there is a token (page load or new login), confirm it with the backend and take the
  // user's role and details from the server. An invalid or expired token gets a 401, and the
  // API interceptor then clears the session.
  useEffect(() => {
    if (!token) return;
    authApi.me()
      .then(storeUser)
      .catch(() => { /* 401 is handled by the interceptor; keep the session if the backend is just unreachable */ });
  }, [token]);

  const login = async (email: string, pass: string) => {
    const res = await authApi.login(email, pass);
    clearViewAs();
    localStorage.setItem('keystone_token', res.token);
    setToken(res.token);
    storeUser({
      userEmail: res.email,
      userName: res.name || res.email.split('@')[0],
      role: res.role,
    });
  };

  const setQuickAuth = (email: string, role: Role, name: string, token: string) => {
    clearViewAs();
    localStorage.setItem('keystone_token', token);
    setToken(token);
    storeUser({ userEmail: email, userName: name, role });
  };

  const replaceToken = (next: string) => {
    localStorage.setItem('keystone_token', next);
    setToken(next);
  };

  const refreshUser = async () => {
    storeUser(await authApi.me());
  };

  const logout = () => {
    authApi.logout(); // invalidates the token server-side, then clears the token from local storage
    localStorage.removeItem('keystone_user');
    clearViewAs();
    setToken(null);
    setUser(null);
    window.location.hash = '/login'; // back to the login screen
  };

  return (
    <AuthContext.Provider value={{ user, token, role, viewRole, setViewAs, isAuthenticated, demoMode, login, logout, setQuickAuth, replaceToken, refreshUser }}>
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
