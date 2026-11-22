import { useCallback, useEffect, useRef, useState } from 'react';
import type { Signer } from '@/lib/signing/types';
import {
	NOTIFICATION_PREFERENCE_TYPES,
	notificationPreferencesService,
	type NotificationPreferences,
	type NotificationPreferenceType,
} from '@/services/notificationPreferences.service';

export function getDefaultNotificationPreferences(): NotificationPreferences {
	return {
		settlement: true,
		kyc_expiry: true,
		watchlist_change: true,
		auto_invest: true,
		maturity_approaching: true,
	};
}

export function normalizeNotificationPreferences(
	raw: Partial<Record<NotificationPreferenceType, unknown>> | null | undefined
): NotificationPreferences {
	const defaults = getDefaultNotificationPreferences();
	const normalized = { ...defaults };

	for (const type of NOTIFICATION_PREFERENCE_TYPES) {
		if (typeof raw?.[type] === 'boolean') {
			normalized[type] = raw[type];
		}
	}

	return normalized;
}

export type PreferencesLoadStatus =
	'loading' | 'ready' | 'error' | 'disconnected';
export type PreferencesSaveStatus = 'idle' | 'saving' | 'error';

export interface UseNotificationPreferencesOptions {
	address?: string;
	signer: Signer | null;
	fetchPreferences?: (
		address: string
	) => Promise<NotificationPreferences | null | undefined>;
	updatePreferences?: (
		address: string,
		preferences: NotificationPreferences,
		signer: Signer
	) => Promise<void>;
	onSaveSuccess?: () => void;
	onSaveError?: (error: unknown) => void;
}

const fetchPreferencesFromContract = (address: string) =>
	notificationPreferencesService.getPreferences(address);
const updatePreferencesOnContract = (
	address: string,
	preferences: NotificationPreferences,
	signer: Signer
) =>
	notificationPreferencesService.updatePreferences(
		address,
		preferences,
		signer
	);

export interface UseNotificationPreferencesResult {
	preferences: NotificationPreferences | null;
	loadStatus: PreferencesLoadStatus;
	saveStatus: PreferencesSaveStatus;
	hasChanges: boolean;
	setPreference: (type: NotificationPreferenceType, enabled: boolean) => void;
	save: () => Promise<void>;
	reload: () => void;
}

export function useNotificationPreferences({
	address,
	signer,
	fetchPreferences = fetchPreferencesFromContract,
	updatePreferences = updatePreferencesOnContract,
	onSaveSuccess,
	onSaveError,
}: UseNotificationPreferencesOptions): UseNotificationPreferencesResult {
	const [preferences, setPreferences] =
		useState<NotificationPreferences | null>(null);
	const [loadStatus, setLoadStatus] =
		useState<PreferencesLoadStatus>('loading');
	const [saveStatus, setSaveStatus] = useState<PreferencesSaveStatus>('idle');
	const [reloadToken, setReloadToken] = useState(0);
	const savedPreferences = useRef<NotificationPreferences | null>(null);

	useEffect(() => {
		if (!address) {
			setPreferences(null);
			savedPreferences.current = null;
			setLoadStatus('disconnected');
			return;
		}

		let cancelled = false;
		setPreferences(null);
		setLoadStatus('loading');
		setSaveStatus('idle');

		fetchPreferences(address)
			.then(data => {
				if (cancelled) return;
				const normalized = normalizeNotificationPreferences(data);
				savedPreferences.current = normalized;
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
	}, [address, fetchPreferences, reloadToken]);

	const setPreference = useCallback(
		(type: NotificationPreferenceType, enabled: boolean) => {
			setPreferences(current =>
				current ? { ...current, [type]: enabled } : current
			);
			setSaveStatus('idle');
		},
		[]
	);

	const save = useCallback(async () => {
		if (!address || !signer || !preferences || saveStatus === 'saving')
			return;

		setSaveStatus('saving');
		try {
			await updatePreferences(address, preferences, signer);
			savedPreferences.current = preferences;
			setSaveStatus('idle');
			onSaveSuccess?.();
		} catch (error) {
			setSaveStatus('error');
			onSaveError?.(error);
		}
	}, [
		address,
		onSaveError,
		onSaveSuccess,
		preferences,
		saveStatus,
		signer,
		updatePreferences,
	]);

	const hasChanges =
		preferences !== null &&
		(savedPreferences.current === null ||
			NOTIFICATION_PREFERENCE_TYPES.some(
				type => preferences[type] !== savedPreferences.current?.[type]
			));

	return {
		preferences,
		loadStatus,
		saveStatus,
		hasChanges,
		setPreference,
		save,
		reload: () => setReloadToken(token => token + 1),
	};
}
