import { useState, useEffect, useCallback } from 'react';
import type { Notification as AppNotification, ActivityLogEntry, ActivityActionType } from '../core/models/casting';

interface UseNotificationsOptions {
  currentUserId?: string;
  onNewNotification?: (notification: AppNotification) => void;
}

interface NotificationState {
  notifications: AppNotification[];
  unreadCount: number;
  activityLog: ActivityLogEntry[];
}

export const useNotifications = (options: UseNotificationsOptions = {}) => {
  const { currentUserId, onNewNotification } = options;
  
  const [state, setState] = useState<NotificationState>({
    notifications: [],
    unreadCount: 0,
    activityLog: [],
  });

  const loadFromStorage = useCallback(() => {
    const stored = localStorage.getItem('vs-notifications');
    if (stored) {
      const parsed = JSON.parse(stored);
      setState(prev => ({
        ...prev,
        notifications: parsed.notifications || [],
        unreadCount: (parsed.notifications || []).filter((n: AppNotification) => !n.read).length,
      }));
    }

    const activityStored = localStorage.getItem('vs-activity-log');
    if (activityStored) {
      setState(prev => ({
        ...prev,
        activityLog: JSON.parse(activityStored) || [],
      }));
    }
  }, []);

  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  const saveToStorage = useCallback((notifications: AppNotification[], activityLog: ActivityLogEntry[]) => {
    localStorage.setItem('vs-notifications', JSON.stringify({ notifications }));
    localStorage.setItem('vs-activity-log', JSON.stringify(activityLog));
  }, []);

  const addNotification = useCallback((notification: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) => {
    const newNotification: AppNotification = {
      ...notification,
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      read: false,
    };

    setState(prev => {
      const updated = [newNotification, ...prev.notifications].slice(0, 100);
      saveToStorage(updated, prev.activityLog);
      return {
        ...prev,
        notifications: updated,
        unreadCount: updated.filter(n => !n.read).length,
      };
    });

    if (onNewNotification) {
      onNewNotification(newNotification);
    }

    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/icons/icon-192x192.png',
        tag: newNotification.id,
      });
    }

    return newNotification;
  }, [saveToStorage, onNewNotification]);

  const markAsRead = useCallback((notificationId: string) => {
    setState(prev => {
      const updated = prev.notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      );
      saveToStorage(updated, prev.activityLog);
      return {
        ...prev,
        notifications: updated,
        unreadCount: updated.filter(n => !n.read).length,
      };
    });
  }, [saveToStorage]);

  const markAllAsRead = useCallback(() => {
    setState(prev => {
      const updated = prev.notifications.map(n => ({ ...n, read: true }));
      saveToStorage(updated, prev.activityLog);
      return {
        ...prev,
        notifications: updated,
        unreadCount: 0,
      };
    });
  }, [saveToStorage]);

  const clearNotification = useCallback((notificationId: string) => {
    setState(prev => {
      const updated = prev.notifications.filter(n => n.id !== notificationId);
      saveToStorage(updated, prev.activityLog);
      return {
        ...prev,
        notifications: updated,
        unreadCount: updated.filter(n => !n.read).length,
      };
    });
  }, [saveToStorage]);

  const logActivity = useCallback((
    action: ActivityActionType,
    targetType: 'shot' | 'shotlist' | 'comment' | 'project',
    targetId: string,
    targetName: string,
    details?: { previousValue?: unknown; newValue?: unknown; fieldChanged?: string }
  ) => {
    const entry: ActivityLogEntry = {
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      projectId: 'current',
      userId: currentUserId || 'anonymous',
      userName: 'Bruker',
      action,
      targetType,
      targetId,
      targetName,
      timestamp: new Date().toISOString(),
      details,
      read: false,
    };

    setState(prev => {
      const updated = [entry, ...prev.activityLog].slice(0, 200);
      saveToStorage(prev.notifications, updated);
      return {
        ...prev,
        activityLog: updated,
      };
    });

    return entry;
  }, [currentUserId, saveToStorage]);

  const requestNotificationPermission = useCallback(async () => {
    if ('Notification' in window && Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return Notification.permission === 'granted';
  }, []);

  const getNotificationsForUser = useCallback((userId: string) => {
    return state.notifications.filter(n => n.userId === userId);
  }, [state.notifications]);

  const getRecentActivity = useCallback((limit = 50) => {
    return state.activityLog.slice(0, limit);
  }, [state.activityLog]);

  return {
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    activityLog: state.activityLog,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotification,
    logActivity,
    requestNotificationPermission,
    getNotificationsForUser,
    getRecentActivity,
  };
};

export default useNotifications;
