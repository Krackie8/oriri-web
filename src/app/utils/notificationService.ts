// Notification service for managing real-time notifications
export class NotificationService {
  private static instance: NotificationService;
  private notificationCallbacks: ((notification: any) => void)[] = [];

  static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Subscribe to notifications
  subscribe(callback: (notification: any) => void) {
    this.notificationCallbacks.push(callback);
    
    // Return unsubscribe function
    return () => {
      this.notificationCallbacks = this.notificationCallbacks.filter(cb => cb !== callback);
    };
  }

  // Trigger a notification
  notify(type: 'episode' | 'comment' | 'tip' | 'live' | 'system' | 'vip', title: string, message: string, metadata?: any) {
    const notification = {
      type,
      title,
      message,
      metadata,
      timestamp: new Date(),
    };

    // Send to all subscribers
    this.notificationCallbacks.forEach(callback => {
      try {
        callback(notification);
      } catch (error) {
        console.error('Error in notification callback:', error);
      }
    });

    // Browser notification if permission granted
    this.sendBrowserNotification(title, message);
  }

  // Request browser notification permission
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }

  // Send browser notification
  private sendBrowserNotification(title: string, message: string) {
    if (Notification.permission === 'granted') {
      try {
        const notification = new Notification(title, {
          body: message,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'oriri-notification',
          requireInteraction: false,
          silent: false,
        });

        // Auto close after 5 seconds
        setTimeout(() => {
          notification.close();
        }, 5000);
      } catch (error) {
        console.error('Failed to send browser notification:', error);
      }
    }
  }

  // Predefined notification templates
  newEpisodeNotification(episodeTitle: string, episodeId: string) {
    this.notify(
      'episode',
      'New Episode Available',
      `"${episodeTitle}" is now available`,
      { episodeId }
    );
  }

  commentReplyNotification(episodeTitle: string, replierName: string, episodeId: string, commentId: string) {
    this.notify(
      'comment',
      'New Comment Reply',
      `${replierName} replied to your comment on "${episodeTitle}"`,
      { episodeId, commentId }
    );
  }

  tipReceivedNotification(amount: number, senderName: string, episodeTitle: string) {
    this.notify(
      'tip',
      'Tip Received',
      `${senderName} sent you a $${amount} tip for "${episodeTitle}"`,
      { amount, senderName }
    );
  }

  liveSessionNotification(sessionTitle: string, minutesUntilStart: number) {
    this.notify(
      'live',
      'Live Session Starting',
      `"${sessionTitle}" starts in ${minutesUntilStart} minutes`,
      { sessionTitle, minutesUntilStart }
    );
  }

  vipContentNotification(contentTitle: string, contentType: string) {
    this.notify(
      'vip',
      'VIP Content Available',
      `New ${contentType}: "${contentTitle}" is now available for VIP members`,
      { contentTitle, contentType }
    );
  }

  systemNotification(title: string, message: string) {
    this.notify('system', title, message);
  }

  // ---------------------------------------------------------------------------
  // Web Push (server-sent). All methods fail soft and never throw so the UI can
  // toggle opt-in without risking a crash.
  // ---------------------------------------------------------------------------

  /** Whether this browser can receive server push notifications. */
  isPushSupported(): boolean {
    return (
      typeof window !== 'undefined' &&
      'serviceWorker' in navigator &&
      'PushManager' in window &&
      'Notification' in window
    );
  }

  /** Current push subscription, if any. */
  async getPushSubscription(): Promise<PushSubscription | null> {
    if (!this.isPushSupported()) return null;
    try {
      const reg = await navigator.serviceWorker.ready;
      return await reg.pushManager.getSubscription();
    } catch {
      return null;
    }
  }

  /**
   * Subscribe to server push. Requests permission, subscribes via the SW's
   * PushManager using the server VAPID public key, and persists the
   * subscription server-side. Returns true on success.
   */
  async subscribeToPush(baseUrl: string, accessToken: string): Promise<boolean> {
    if (!this.isPushSupported()) return false;
    try {
      const granted = await this.requestPermission();
      if (!granted) return false;

      // Fetch the VAPID public key from the server.
      const keyRes = await fetch(`${baseUrl}/push/vapid-public-key`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const keyJson = await keyRes.json().catch(() => ({}));
      if (!keyJson?.key) return false;

      const reg = await navigator.serviceWorker.ready;
      let subscription = await reg.pushManager.getSubscription();
      if (!subscription) {
        subscription = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(keyJson.key),
        });
      }

      const res = await fetch(`${baseUrl}/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ subscription }),
      });
      return res.ok;
    } catch (error) {
      console.error('[Push] subscribe failed:', error);
      return false;
    }
  }

  /** Unsubscribe locally and remove the server record. */
  async unsubscribeFromPush(baseUrl: string, accessToken: string): Promise<boolean> {
    try {
      const subscription = await this.getPushSubscription();
      if (subscription) await subscription.unsubscribe().catch(() => {});
      await fetch(`${baseUrl}/push/subscribe`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      }).catch(() => {});
      return true;
    } catch (error) {
      console.error('[Push] unsubscribe failed:', error);
      return false;
    }
  }

  /** Convert a base64url VAPID key to the Uint8Array the PushManager expects. */
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();