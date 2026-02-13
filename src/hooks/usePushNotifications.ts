import { useState, useCallback } from 'react';

interface PushNotificationState {
  isEnabled: boolean;
  isSupported: boolean;
  permission: NotificationPermission | 'default';
}

export function usePushNotifications(_userId?: string) {
  const [state, setState] = useState<PushNotificationState>(() => ({
    isEnabled: false,
    isSupported: 'Notification' in window,
    permission: 'Notification' in window ? Notification.permission : 'default',
  }));

  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      console.warn('Push notifications not supported');
      return false;
    }

    try {
      const permission = await Notification.requestPermission();
      setState((prev) => ({
        ...prev,
        permission,
        isEnabled: permission === 'granted',
      }));
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }, [state.isSupported]);

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (!state.isEnabled) {
      console.warn('Notifications not enabled');
      return null;
    }

    return new Notification(title, options);
  }, [state.isEnabled]);

  const toggleNotifications = useCallback(async (enabled: boolean) => {
    if (enabled && state.permission !== 'granted') {
      await requestPermission();
    } else {
      setState((prev) => ({ ...prev, isEnabled: enabled }));
    }
  }, [state.permission, requestPermission]);

  return {
    ...state,
    pushEnabled: state.isEnabled,
    requestPermission,
    sendNotification,
    toggleNotifications,
  };
}

export default usePushNotifications;
