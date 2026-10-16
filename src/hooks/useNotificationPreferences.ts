import { useCallback, useEffect, useRef, useState } from 'react';
import {
	NOTIFICATION_CHANNELS,
	NOTIFICATION_PREFERENCE_TYPES,
	notificationPreferencesService,
	type NotificationChannel,
	type NotificationPreferences,
	type NotificationPreferenceType,
} from '@/services/notificationPreferences.service';

/**
 * Channel defaults used when the API omits a notification type (e.g. a
 * type added on the client before the backend knows about it). In-app is
 * on so users still see the event; email stays opt-in.
 */
const DEFAULT_CHANNEL_PREFERENCES = { email: false, inApp: true } as const;

/**
 * Fills any notification types or channels missing from the API payload so
 * every row always renders with a defined boolean state.
 */
export function normalizeNotificationPreferences(
	raw:
		| Partial<Record<string, Partial<Record<string, unknown>>>>
		| null
		| undefined
): NotificationPreferences {
	const result = {} as NotificationPreferences;
	for (const type of NOTIFICATION_PREFERENCE_TYPES) {
		const source = raw?.[type] ?? {};
		result[type] = {
			email:
				typeof source.email === 'boolean'
					? source.email
					: DEFAULT_CHANNEL_PREFERENCES.email,
			inApp:
				typeof source.inApp === 'boolean'
					? source.inApp
					: DEFAULT_CHANNEL_PREFERENCES.inApp,
		};
	}
	return result;
}

export function areAllNotificationsEnabled(
	preferences: NotificationPreferences
): boolean {
	return NOTIFICATION_PREFERENCE_TYPES.every(type =>
		NOTIFICATION_CHANNELS.every(channel => preferences[type][channel])
	);
}

export function setAllNotificationPreferences(
	enabled: boolean
): NotificationPreferences {
	const result = {} as NotificationPreferences;
	for (const type of NOTIFICATION_PREFERENCE_TYPES) {
		result[type] = { email: enabled, inApp: enabled };
	}
	return result;
}

export type PreferencesLoadStatus = 'loading' | 'ready' | 'error';
export type PreferencesSaveStatus = 'idle' | 'saving' | 'error';

export interface UseNotificationPreferencesOptions {
	/** Injectable for tests; defaults to the API service. */
	fetchPreferences?: () => Promise<NotificationPreferences>;
	/** Injectable for tests; defaults to the API service. */
	updatePreferences?: (
		preferences: NotificationPreferences
	) => Promise<NotificationPreferences | undefined>;
	onSaveSuccess?: () => void;
	onSaveError?: (error: unknown) => void;
}

export interface UseNotificationPreferencesResult {
	preferences: NotificationPreferences | null;
	loadStatus: PreferencesLoadStatus;
	saveStatus: PreferencesSaveStatus;
	allEnabled: boolean;
	setChannel: (
		type: NotificationPreferenceType,
		channel: NotificationChannel,
		enabled: boolean
	) => void;
	setAll: (enabled: boolean) => void;
	/** Re-sends the last change that failed to save. */
	retrySave: () => void;
	/** Re-fetches preferences after a failed initial load. */
	reload: () => void;
}

/**
 * Loads the user's notification preferences and saves every change
 * immediately. Changes are applied optimistically; if a save fails the UI
 * rolls back to the last server-confirmed state and the failed change is
 * kept so `retrySave` can re-send it.
 */
export function useNotificationPreferences({
	fetchPreferences = () => notificationPreferencesService.getPreferences(),
	updatePreferences = preferences =>
		notificationPreferencesService.updatePreferences(preferences),
	onSaveSuccess,
	onSaveError,
}: UseNotificationPreferencesOptions = {}): UseNotificationPreferencesResult {
	const [preferences, setPreferences] =
		useState<NotificationPreferences | null>(null);
	const [loadStatus, setLoadStatus] =
		useState<PreferencesLoadStatus>('loading');
	const [saveStatus, setSaveStatus] = useState<PreferencesSaveStatus>('idle');
	const [reloadToken, setReloadToken] = useState(0);

	const confirmedRef = useRef<NotificationPreferences | null>(null);
	const failedRef = useRef<NotificationPreferences | null>(null);
	const latestRequestRef = useRef(0);

	// Keep the latest callbacks without re-running the load effect.
	const fetchRef = useRef(fetchPreferences);
	const updateRef = useRef(updatePreferences);
	const onSaveSuccessRef = useRef(onSaveSuccess);
	const onSaveErrorRef = useRef(onSaveError);
	useEffect(() => {
		fetchRef.current = fetchPreferences;
		updateRef.current = updatePreferences;
		onSaveSuccessRef.current = onSaveSuccess;
		onSaveErrorRef.current = onSaveError;
	});

	useEffect(() => {
		let cancelled = false;
		setLoadStatus('loading');

		fetchRef
			.current()
			.then(data => {
				if (cancelled) return;
				const normalized = normalizeNotificationPreferences(data);
				confirmedRef.current = normalized;
				setPreferences(normalized);
				setLoadStatus('ready');
			})
			.catch(() => {
				if (cancelled) return;
				setLoadStatus('error');
			});

		return () => {
			cancelled = true;
		};
	}, [reloadToken]);

	const save = useCallback((next: NotificationPreferences) => {
		const requestId = ++latestRequestRef.current;
		setPreferences(next);
		setSaveStatus('saving');

		updateRef
			.current(next)
			.then(saved => {
				const confirmed = saved
					? normalizeNotificationPreferences(saved)
					: next;
				confirmedRef.current = confirmed;
				// A newer change is already in flight; let it own the UI.
				if (requestId !== latestRequestRef.current) return;
				failedRef.current = null;
				setPreferences(confirmed);
				setSaveStatus('idle');
				onSaveSuccessRef.current?.();
			})
			.catch(error => {
				if (requestId !== latestRequestRef.current) return;
				failedRef.current = next;
				setPreferences(confirmedRef.current);
				setSaveStatus('error');
				onSaveErrorRef.current?.(error);
			});
	}, []);

	const setChannel = useCallback(
		(
			type: NotificationPreferenceType,
			channel: NotificationChannel,
			enabled: boolean
		) => {
			if (!preferences) return;
			save({
				...preferences,
				[type]: { ...preferences[type], [channel]: enabled },
			});
		},
		[preferences, save]
	);

	const setAll = useCallback(
		(enabled: boolean) => {
			if (!preferences) return;
			save(setAllNotificationPreferences(enabled));
		},
		[preferences, save]
	);

	const retrySave = useCallback(() => {
		if (failedRef.current) save(failedRef.current);
	}, [save]);

	const reload = useCallback(() => setReloadToken(token => token + 1), []);

	return {
		preferences,
		loadStatus,
		saveStatus,
		allEnabled: preferences ? areAllNotificationsEnabled(preferences) : false,
		setChannel,
		setAll,
		retrySave,
		reload,
	};
}
