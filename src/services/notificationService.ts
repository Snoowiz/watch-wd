import { getToken, onMessage } from 'firebase/messaging';
import { messaging } from '../lib/firebase';

export const getNotificationPermission = (): string => {
  try {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission;
    }
  } catch (error) {
    console.warn('Failed to access Notification permission safely:', error);
  }
  return 'default';
};

export const requestNotificationPermission = async (userId: string | number) => {
  if (!messaging) {
    console.warn('Messaging is not supported on this browser.');
    return null;
  }

  const userIdStr = String(userId);

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const currentToken = await getToken(messaging, { 
         vapidKey: (import.meta as any).env.VITE_FCM_VAPID_KEY || undefined
      });
      if (currentToken) {
        console.log('FCM Registration Token generated.');
        // Save FCM token via REST API
        const token = localStorage.getItem('token');
        if (token) {
          await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ fcmToken: currentToken })
          });
        }
        return currentToken;
      }
    }
  } catch (error) {
    console.error('An error occurred while retrieving token. ', error);
  }
  return null;
};

export const subscribeToMatch = async (userId: string | number, matchId: string | number) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return true;

    // Optimistically update via REST API instead of firebase directly
    const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` }});
    const { user } = await res.json();
    
    let currentSubs = user.subscribedMatches || [];
    currentSubs = Array.from(new Set([...currentSubs, matchId]));

    await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ subscribedMatches: currentSubs })
    });

    return true;
  } catch (error) {
    return true; 
  }
};

export const unsubscribeFromMatch = async (userId: string | number, matchId: string | number) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return true;

    const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` }});
    const { user } = await res.json();
    
    let currentSubs = user.subscribedMatches || [];
    currentSubs = currentSubs.filter((id: any) => id !== matchId);

    await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ subscribedMatches: currentSubs })
    });
    return true;
  } catch (error) {
    return true;
  }
};

export const subscribeToCategory = async (userId: string | number, categoryId: string | number, isSubscribing: boolean) => {
  try {
    const token = localStorage.getItem('token');
    if (!token) return true; // Fail silently or optimistically 

    // Optimistically update category subscriptions via REST API
    const res = await fetch('/api/auth/me', { headers: { 'Authorization': `Bearer ${token}` }});
    const { user } = await res.json();
    
    let currentSubs = user.subscribedCategories || [];
    if (isSubscribing) {
      currentSubs = Array.from(new Set([...currentSubs, categoryId]));
    } else {
      currentSubs = currentSubs.filter((id: any) => id !== categoryId);
    }

    await fetch('/api/auth/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ subscribedCategories: currentSubs })
    });

    return true;
  } catch (error) {
    return true;
  }
};

export const setupMessageListener = () => {
  if (!messaging) return;
  onMessage(messaging, (payload) => {
    console.log('Message received. ', payload);
    if (getNotificationPermission() === 'granted' && payload.notification) {
      new Notification(payload.notification.title || 'New Notification', {
        body: payload.notification.body,
        icon: '/vite.svg'
      });
    }
  });
};

export const notifyMatchLive = async (matchId: string, matchTitle: string) => {
  try {
    const res = await fetch(`/api/notifications/notify-match-live`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      // send title additionally if needed
      body: JSON.stringify({ matchId, matchTitle })
    });
    return await res.json();
  } catch (err) {
    console.error('Failed to notify match live', err);
    throw err;
  }
};
