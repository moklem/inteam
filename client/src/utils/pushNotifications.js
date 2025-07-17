import axios from './axios';

const PUBLIC_VAPID_KEY = process.env.REACT_APP_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const checkNotificationSupport = () => {
  if (!('Notification' in window)) {
    console.log('This browser does not support notifications');
    return false;
  }

  if (!('serviceWorker' in navigator)) {
    console.log('Service Worker not supported');
    return false;
  }

  if (!('PushManager' in window)) {
    console.log('Push notifications not supported');
    return false;
  }

  return true;
};

export const requestNotificationPermission = async () => {
  if (!checkNotificationSupport()) {
    return false;
  }

  const permission = await Notification.requestPermission();
  return permission === 'granted';
};

export const subscribeToPushNotifications = async () => {
  if (!checkNotificationSupport()) {
    throw new Error('Push notifications not supported');
  }

  if (!PUBLIC_VAPID_KEY) {
    throw new Error('VAPID public key not configured');
  }

  try {
    const registration = await navigator.serviceWorker.ready;

    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      // Subscribe to push notifications
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(PUBLIC_VAPID_KEY)
      });
    }

    // Send subscription to backend
    const response = await axios.post('/notifications/subscribe', {
      subscription: subscription.toJSON()
    });

    return response.data;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    throw error;
  }
};

export const unsubscribeFromPushNotifications = async () => {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      await subscription.unsubscribe();
      
      // Notify backend
      await axios.post('/notifications/unsubscribe', {
        endpoint: subscription.endpoint
      });
    }

    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    throw error;
  }
};

export const getNotificationStatus = async () => {
  if (!checkNotificationSupport()) {
    return { supported: false, permission: 'unsupported', subscribed: false };
  }

  const permission = Notification.permission;
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    return {
      supported: true,
      permission,
      subscribed: !!subscription
    };
  } catch (error) {
    return {
      supported: true,
      permission,
      subscribed: false
    };
  }
};

export const updateNotificationPreferences = async (preferences) => {
  try {
    const response = await axios.put('/notifications/preferences', preferences);
    return response.data;
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    throw error;
  }
};

export const sendTestNotification = async () => {
  try {
    const response = await axios.post('/notifications/test');
    return response.data;
  } catch (error) {
    console.error('Error sending test notification:', error);
    throw error;
  }
};

export const getNotificationStatus = async () => {
  try {
    const response = await axios.get('/notifications/status');
    return response.data;
  } catch (error) {
    console.error('Error getting notification status:', error);
    throw error;
  }
};