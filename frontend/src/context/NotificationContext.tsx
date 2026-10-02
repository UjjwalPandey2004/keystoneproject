import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { notificationApi } from '../services/api';
import { useAuth } from './AuthContext';

interface NotificationContextType {
  unread: number;
  refreshUnread: () => void;
}

const NotificationContext = createContext<NotificationContextType>({ unread: 0, refreshUnread: () => undefined });

const POLL_MS = 30_000;

// Keeps the unread count for the bell and sidebar badge fresh while signed in.
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, token } = useAuth();
  const [unread, setUnread] = useState(0);

  const refreshUnread = useCallback(() => {
    if (!isAuthenticated) return;
    notificationApi.unreadCount().then(setUnread).catch(() => undefined);
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) {
      setUnread(0);
      return;
    }
    refreshUnread();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') refreshUnread();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, token, refreshUnread]);

  return <NotificationContext.Provider value={{ unread, refreshUnread }}>{children}</NotificationContext.Provider>;
};

export const useNotifications = () => useContext(NotificationContext);
