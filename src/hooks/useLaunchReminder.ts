import { useCallback, useEffect, useState } from 'react';
import showToast from '@/utils/toast.util';
import {
	addLaunchReminder,
	hasLaunchReminder,
	markLaunchReminderNotified,
	readLaunchReminders,
	removeLaunchReminder,
} from '@/lib/launchReminderStorage';

const MAX_TIMEOUT_MS = 2_147_483_647;

type NotificationAccess = 'granted' | 'denied' | 'default' | 'unsupported';

function getPermission(): NotificationAccess {
	if (typeof window === 'undefined' || !('Notification' in window)) {
		return 'unsupported';
	}
	return Notification.permission;
}

export function useLaunchReminder(keyId: string, startMs: number) {
	const [hasReminder, setHasReminder] = useState(() =>
		hasLaunchReminder(keyId)
	);
	const [permission, setPermission] = useState<NotificationAccess>(getPermission);

	useEffect(() => {
		setHasReminder(hasLaunchReminder(keyId));
		setPermission(getPermission());
	}, [keyId]);

	const toggleReminder = useCallback(async () => {
		if (hasLaunchReminder(keyId)) {
			removeLaunchReminder(keyId);
			setHasReminder(false);
			showToast.message('Launch reminder removed');
			return;
		}

		let nextPermission = getPermission();
		if (nextPermission === 'default') {
			try {
				nextPermission = await Notification.requestPermission();
			} catch {
				nextPermission = 'denied';
			}
		}
		setPermission(nextPermission);
		addLaunchReminder(keyId, startMs);
		setHasReminder(true);
		showToast.message(
			nextPermission === 'granted'
				? 'Reminder saved. We’ll notify you when this launch opens.'
				: 'Reminder saved locally. Enable notifications to get an alert.'
		);
	}, [keyId, startMs]);

	useEffect(() => {
		if (!hasReminder || getPermission() !== 'granted') return;
		const delay = startMs - Date.now();
		if (delay <= 0) return;

		const timeoutId = window.setTimeout(() => {
			const reminder = readLaunchReminders().find(
				item => item.keyId === keyId && !item.notified
			);
			if (!reminder || Notification.permission !== 'granted') return;
			markLaunchReminderNotified(keyId);
			new Notification('Launch is live', {
				body: 'A key you wanted to be reminded about has just launched.',
			});
			showToast.message('A launch you are tracking is now live');
		}, Math.min(delay, MAX_TIMEOUT_MS));

		return () => window.clearTimeout(timeoutId);
	}, [hasReminder, keyId, startMs]);

	return { hasReminder, permission, toggleReminder };
}
