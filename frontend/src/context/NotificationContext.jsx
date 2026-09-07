import React, { createContext, useContext, useState, useEffect } from 'react';
import { getLowStockProducts } from '../services/api';

const NotificationContext = createContext({
  notifications: [],
  addNotification: () => {},
  dismissNotification: () => {},
  clearAllNotifications: () => {},
  markAsRead: () => {},
  markAllAsRead: () => {}
});

export const useNotifications = () => {
  try {
    const context = useContext(NotificationContext);
    if (!context) {
      console.warn('useNotifications called outside NotificationProvider, returning default functions');
      return {
        notifications: [],
        addNotification: () => {},
        dismissNotification: () => {},
        clearAllNotifications: () => {},
        markAsRead: () => {},
        markAllAsRead: () => {}
      };
    }
    return context;
  } catch (error) {
    console.error('useNotifications error:', error);
    return {
      notifications: [],
      addNotification: () => {},
      dismissNotification: () => {},
      clearAllNotifications: () => {},
      markAsRead: () => {},
      markAllAsRead: () => {}
    };
  }
};

export const NotificationProvider = ({ children }) => {
  // Add defensive check for React hooks
  if (!useState || !useEffect) {
    console.error('React hooks not available, React may not be properly loaded');
    return <div>{children}</div>;
  }
  
  const [notifications, setNotifications] = useState([]);

  // Check for low stock every 5 minutes - only when user is authenticated
  useEffect(() => {
    // Only run if user is logged in (has token)
    const token = localStorage.getItem('token');
    if (!token) {
      return; // Don't start interval if not logged in
    }

    checkLowStock();
    const interval = setInterval(checkLowStock, 5 * 60 * 1000); // 5 minutes
    return () => clearInterval(interval);
  }, []);

  const checkLowStock = async () => {
    // Check if user is still logged in before making request
    const token = localStorage.getItem('token');
    if (!token) {
      return; // Don't make request if not logged in
    }

    try {
      const response = await getLowStockProducts();
      const lowStockItems = response.data;

      if (lowStockItems.length > 0) {
        addNotification({
          type: 'warning',
          title: 'Low Stock Alert!',
          message: `${lowStockItems.length} product(s) are running low on stock. Check inventory now.`,
        });
      }
    } catch (error) {
      // Silently fail if unauthorized (user logged out)
      if (error.response?.status !== 401) {
        console.error('Error checking low stock:', error);
      }
    }
  };

  const addNotification = (notification) => {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      read: false,
      ...notification,
    };

    setNotifications(prev => [newNotification, ...prev]);

    // Browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(notification.title, {
        body: notification.message,
        icon: '/favicon.ico',
        tag: 'etimad-mart',
      });
    }

    return newNotification.id;
  };

  const dismissNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
  };

  const markAsRead = (id) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Request notification permission on mount
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const value = {
    notifications,
    addNotification,
    dismissNotification,
    clearAllNotifications,
    markAsRead,
    markAllAsRead,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
