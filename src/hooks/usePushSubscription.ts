import { useCallback, useEffect, useRef, useState } from 'react';

export type PushEventType = 'orders' | 'gifts' | 'priceAlerts';

export type PushPermissionStatus = 'unsupported' | 'default' | 'denied' | 'granted';

export type PushEventPreferences = Record<PushEventType, boolean>;

export interface PushSubscriptionState {
  /** Whether the browser supports the required APIs. */
  supported: boolean;
  /** Current Notification.permission mapped to a status. */
  permission: PushPermissionStatus;
  /** Whether an active push subscription exists. */
  subscribed: boolean;
  /** Per-event-type opt-in preferences. */
  preferences: PushEventPreferences;
  /** Human-readable guidance, e.g. when permission is denied. */
  guidance: string | null;
  /** Whether an async operation (subscribe/unsubscribe/update) is in flight. */
  loading: boolean;
  /** Last error message, if any. */
  error: string | null;
}

export interface UsePushSubscriptionResult extends PushSubscriptionState {
  /** Request permission (if needed) and subscribe. Must be called from a user action. */
  enable: (preferences?: PushEventPreferences) => Promise<void>;
  /** Unsubscribe and remove the subscription from the backend. */
  disable: () => Promise<void>;
  /** Toggle a single event type and sync preferences to the backend. */
  toggleEvent: (event: PushEventType) => Promise<void>;
  /** Replace all event preferences and sync them to the backend when subscribed. */
  updatePreferences: (preferences: PushEventPreferences) => Promise<void>;
  /** Re-check the current permission/subscription state. */
  refresh: () => Promise<void>;
}

const DEFAULT_PREFERENCES: PushEventPreferences = {
  orders: true,
  gifts: true,
  priceAlerts: false,
};

const SERVICE_WORKER_PATH = '/sw.js';

const DENIED_GUIDANCE =
  'Push notifications are blocked. To re-enable them, open your browser settings for this site, ' +
  'allow notifications, then reload the page.';

const UNSUPPORTED_GUIDANCE =
  'Your browser does not support web push notifications. Try a recent version of Chrome, Firefox, Edge, or Safari.';

const VAPID_PUBLIC_KEY = (import.meta as { env?: Record<string, string | undefined> }).env
  ?.VITE_VAPID_PUBLIC_KEY;

function isSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

function mapPermission(permission: NotificationPermission | 'unsupported'): PushPermissionStatus {
  if (permission === 'unsupported') return 'unsupported';
  return permission;
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function subscriptionToJSON(subscription: PushSubscription): PushSubscriptionJSON {
  return subscription.toJSON();
}

async function postSubscription(
  subscription: PushSubscriptionJSON,
  preferences: PushEventPreferences,
): Promise<void> {
  const response = await fetch('/api/push/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ subscription, preferences }),
  });
  if (!response.ok) {
    throw new Error(`Failed to save push subscription (${response.status})`);
  }
}

async function patchPreferences(preferences: PushEventPreferences): Promise<void> {
  const response = await fetch('/api/push/subscriptions/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ preferences }),
  });
  if (!response.ok) {
    throw new Error(`Failed to update push preferences (${response.status})`);
  }
}

async function deleteSubscription(endpoint: string): Promise<void> {
  const response = await fetch('/api/push/subscriptions', {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ endpoint }),
  });
  // Treat 404 as success: the subscription is already gone.
  if (!response.ok && response.status !== 404) {
    throw new Error(`Failed to remove push subscription (${response.status})`);
  }
}

async function getServiceWorkerRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;
  return navigator.serviceWorker.register(SERVICE_WORKER_PATH);
}

export function usePushSubscription(): UsePushSubscriptionResult {
  const supported = isSupported();

  const [permission, setPermission] = useState<PushPermissionStatus>(
    supported ? mapPermission(Notification.permission) : 'unsupported',
  );
  const [subscribed, setSubscribed] = useState(false);
  const [preferences, setPreferences] = useState<PushEventPreferences>(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep a ref to the current subscription so we can unsubscribe on sign-out.
  const subscriptionRef = useRef<PushSubscription | null>(null);

  const guidance = (() => {
    if (!supported) return UNSUPPORTED_GUIDANCE;
    if (permission === 'denied') return DENIED_GUIDANCE;
    return null;
  })();

  const syncState = useCallback(async () => {
    if (!supported) {
      setPermission('unsupported');
      setSubscribed(false);
      return;
    }

    setPermission(mapPermission(Notification.permission));

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = registration ? await registration.pushManager.getSubscription() : null;
      subscriptionRef.current = subscription;
      setSubscribed(Boolean(subscription));
    } catch {
      subscriptionRef.current = null;
      setSubscribed(false);
    }
  }, [supported]);

  const refresh = useCallback(async () => {
    await syncState();
  }, [syncState]);

  // Initial state sync.
  useEffect(() => {
    void syncState();
  }, [syncState]);

  // React to permission changes made in browser settings.
  useEffect(() => {
    if (!supported) return undefined;

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncState();
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [supported, syncState]);

  const enable = useCallback(async (nextPreferences: PushEventPreferences = preferences) => {
    if (!supported) {
      setError(UNSUPPORTED_GUIDANCE);
      return;
    }
    if (!VAPID_PUBLIC_KEY) {
      setError('Push notifications are not configured. Please try again later.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Request permission only after an explicit user action.
      let currentPermission = Notification.permission;
      if (currentPermission === 'default') {
        currentPermission = await Notification.requestPermission();
      }
      setPermission(mapPermission(currentPermission));

      if (currentPermission !== 'granted') {
        // Denied or dismissed: do not subscribe.
        setSubscribed(false);
        return;
      }

      const registration = await getServiceWorkerRegistration();
      await navigator.serviceWorker.ready;

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      subscriptionRef.current = subscription;
      await postSubscription(subscriptionToJSON(subscription), nextPreferences);
      setPreferences(nextPreferences);
      setSubscribed(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to enable push notifications.');
    } finally {
      setLoading(false);
    }
  }, [supported, preferences]);

  const disable = useCallback(async () => {
    if (!supported) return;

    setLoading(true);
    setError(null);

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription =
        subscriptionRef.current ?? (registration ? await registration.pushManager.getSubscription() : null);

      if (subscription) {
        const endpoint = subscription.endpoint;
        await subscription.unsubscribe();
        await deleteSubscription(endpoint);
      }

      subscriptionRef.current = null;
      setSubscribed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to disable push notifications.');
    } finally {
      setLoading(false);
    }
  }, [supported]);

  const toggleEvent = useCallback(
    async (event: PushEventType) => {
      const nextPreferences: PushEventPreferences = {
        ...preferences,
        [event]: !preferences[event],
      };

      // Optimistically update local state.
      setPreferences(nextPreferences);
      setError(null);

      if (!subscribed) {
        // Preferences are stored locally and sent when the user subscribes.
        return;
      }

      setLoading(true);
      try {
        await patchPreferences(nextPreferences);
      } catch (err) {
        // Roll back on failure.
        setPreferences(preferences);
        setError(err instanceof Error ? err.message : 'Failed to update notification preferences.');
      } finally {
        setLoading(false);
      }
    },
    [preferences, subscribed],
  );

  const updatePreferences = useCallback(
    async (nextPreferences: PushEventPreferences) => {
      setPreferences(nextPreferences);
      setError(null);

      if (!subscribed) {
        // Preferences are stored locally and sent when the user subscribes.
        return;
      }

      setLoading(true);
      try {
        await patchPreferences(nextPreferences);
      } catch (err) {
        setPreferences(preferences);
        setError(
          err instanceof Error
            ? err.message
            : 'Failed to update notification preferences.',
        );
      } finally {
        setLoading(false);
      }
    },
    [preferences, subscribed],
  );

  // Remove the subscription from the backend on sign-out.
  useEffect(() => {
    if (!supported) return undefined;

    const handleSignOut = () => {
      const subscription = subscriptionRef.current;
      if (!subscription) return;
      const endpoint = subscription.endpoint;
      // Fire-and-forget: the user is signing out, so we cannot block on UI.
      void subscription
        .unsubscribe()
        .catch(() => undefined)
        .then(() => deleteSubscription(endpoint))
        .catch(() => undefined);
      subscriptionRef.current = null;
      setSubscribed(false);
    };

    window.addEventListener('app:sign-out', handleSignOut);
    return () => window.removeEventListener('app:sign-out', handleSignOut);
  }, [supported]);

  return {
    supported,
    permission,
    subscribed,
    preferences,
    guidance,
    loading,
    error,
    enable,
    disable,
    toggleEvent,
    updatePreferences,
    refresh,
  };
}

export default usePushSubscription;