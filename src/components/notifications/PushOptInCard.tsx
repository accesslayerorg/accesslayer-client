import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { usePushSubscription } from '../../hooks/usePushSubscription';

export type PushEventType = 'orders' | 'gifts' | 'priceAlerts';

export interface PushPreferences {
  orders: boolean;
  gifts: boolean;
  priceAlerts: boolean;
}

const DEFAULT_PREFERENCES: PushPreferences = {
  orders: true,
  gifts: true,
  priceAlerts: true,
};

const EVENT_DESCRIPTIONS: Array<{
  key: PushEventType;
  label: string;
  description: string;
}> = [
  {
    key: 'orders',
    label: 'Executable orders',
    description:
      'Get notified when an order becomes executable so you never miss a time-sensitive trade.',
  },
  {
    key: 'gifts',
    label: 'Received gifts',
    description: 'Get notified when someone sends you a gift.',
  },
  {
    key: 'priceAlerts',
    label: 'Price alerts',
    description: 'Get notified when a price alert you set is triggered.',
  },
];

export interface PushOptInCardProps {
  /** Initial preferences loaded from the backend, if available. */
  initialPreferences?: Partial<PushPreferences>;
  /** Called whenever the user changes their push preferences. */
  onPreferencesChange?: (preferences: PushPreferences) => void;
  className?: string;
}

export const PushOptInCard: React.FC<PushOptInCardProps> = ({
  initialPreferences,
  onPreferencesChange,
  className,
}) => {
  const {
    isSupported,
    permission,
    isSubscribed,
    isLoading,
    error,
    subscribe,
    unsubscribe,
    updatePreferences,
  } = usePushSubscription();

  const [preferences, setPreferences] = useState<PushPreferences>({
    ...DEFAULT_PREFERENCES,
    ...initialPreferences,
  });
  const [isToggling, setIsToggling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (initialPreferences) {
      setPreferences((prev) => ({ ...prev, ...initialPreferences }));
    }
  }, [initialPreferences]);

  const isDenied = permission === 'denied';
  const isEnabled = isSubscribed && permission === 'granted';

  const handleEnableToggle = useCallback(async () => {
    setActionError(null);
    setIsToggling(true);
    try {
      if (isEnabled) {
        await unsubscribe();
      } else {
        // Permission is requested only here, after an explicit user action.
        await subscribe(preferences);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : 'Unable to update push notifications.',
      );
    } finally {
      setIsToggling(false);
    }
  }, [isEnabled, preferences, subscribe, unsubscribe]);

  const handleEventToggle = useCallback(
    async (key: PushEventType) => {
      const nextPreferences: PushPreferences = {
        ...preferences,
        [key]: !preferences[key],
      };
      setPreferences(nextPreferences);
      setActionError(null);

      if (onPreferencesChange) {
        onPreferencesChange(nextPreferences);
      }

      if (!isEnabled) {
        return;
      }

      setIsToggling(true);
      try {
        await updatePreferences(nextPreferences);
      } catch (err) {
        // Revert optimistic update on failure.
        setPreferences(preferences);
        if (onPreferencesChange) {
          onPreferencesChange(preferences);
        }
        setActionError(
          err instanceof Error
            ? err.message
            : 'Unable to update notification preferences.',
        );
      } finally {
        setIsToggling(false);
      }
    },
    [preferences, isEnabled, updatePreferences, onPreferencesChange],
  );

  const statusLabel = useMemo(() => {
    if (!isSupported) return 'Not supported';
    if (isDenied) return 'Blocked';
    if (isEnabled) return 'Enabled';
    return 'Disabled';
  }, [isSupported, isDenied, isEnabled]);

  if (!isSupported) {
    return (
      <section
        className={className}
        aria-labelledby="push-opt-in-title"
        data-testid="push-opt-in-card"
      >
        <h2 id="push-opt-in-title">Push notifications</h2>
        <p>
          Your browser does not support web push notifications. Try a modern
          browser such as Chrome, Firefox, Edge or Safari to receive alerts.
        </p>
      </section>
    );
  }

  const busy = isLoading || isToggling;

  return (
    <section
      className={className}
      aria-labelledby="push-opt-in-title"
      data-testid="push-opt-in-card"
    >
      <header>
        <h2 id="push-opt-in-title">Push notifications</h2>
        <p>
          Receive alerts even when this tab is closed. Push notifications never
          include sensitive information such as balances.
        </p>
        <span data-testid="push-status">Status: {statusLabel}</span>
      </header>

      {isDenied && (
        <div role="alert" data-testid="push-permission-denied">
          <p>
            Push notifications are blocked for this site. To re-enable them,
            open your browser settings, find the notifications permission for
            this site and change it to &quot;Allow&quot;, then reload the page.
          </p>
        </div>
      )}

      <div>
        <label htmlFor="push-enable-toggle">
          <span>Enable push notifications</span>
        </label>
        <input
          id="push-enable-toggle"
          type="checkbox"
          role="switch"
          checked={isEnabled}
          disabled={busy || isDenied}
          onChange={handleEnableToggle}
          data-testid="push-enable-toggle"
          aria-describedby="push-enable-description"
        />
        <p id="push-enable-description">
          {isEnabled
            ? 'You will receive push notifications for the events selected below.'
            : 'Turn this on to receive push notifications. Your browser will ask for permission.'}
        </p>
      </div>

      <fieldset disabled={busy || !isEnabled}>
        <legend>Notify me about</legend>
        <ul>
          {EVENT_DESCRIPTIONS.map(({ key, label, description }) => (
            <li key={key}>
              <label htmlFor={`push-event-${key}`}>
                <span>{label}</span>
              </label>
              <input
                id={`push-event-${key}`}
                type="checkbox"
                checked={preferences[key]}
                onChange={() => handleEventToggle(key)}
                data-testid={`push-event-toggle-${key}`}
                aria-describedby={`push-event-${key}-description`}
              />
              <p id={`push-event-${key}-description`}>{description}</p>
            </li>
          ))}
        </ul>
      </fieldset>

      {(actionError || error) && (
        <div role="alert" data-testid="push-error">
          {actionError || error}
        </div>
      )}
    </section>
  );
};

export default PushOptInCard;