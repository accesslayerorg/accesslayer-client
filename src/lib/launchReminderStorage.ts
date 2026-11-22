export const LAUNCH_REMINDERS_STORAGE_KEY = 'accesslayer:launch-reminders';

export interface LaunchReminder {
	keyId: string;
	startMs: number;
	createdAt: number;
	notified: boolean;
}

function safeStorage(): Storage | null {
	try {
		return typeof window === 'undefined' ? null : window.localStorage;
	} catch {
		return null;
	}
}

export function readLaunchReminders(): LaunchReminder[] {
	const storage = safeStorage();
	if (!storage) return [];
	try {
		const raw = storage.getItem(LAUNCH_REMINDERS_STORAGE_KEY);
		if (!raw) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter(
			(item): item is LaunchReminder =>
				Boolean(item) &&
				typeof item === 'object' &&
				typeof item.keyId === 'string' &&
				typeof item.startMs === 'number' &&
				Number.isFinite(item.startMs)
		);
	} catch {
		return [];
	}
}

export function saveLaunchReminders(reminders: LaunchReminder[]): void {
	const storage = safeStorage();
	if (!storage) return;
	try {
		storage.setItem(
			LAUNCH_REMINDERS_STORAGE_KEY,
			JSON.stringify(reminders)
		);
	} catch {
		return;
	}
}

export function addLaunchReminder(keyId: string, startMs: number): void {
	const reminders = readLaunchReminders().filter(
		reminder => reminder.keyId !== keyId
	);
	saveLaunchReminders([
		...reminders,
		{ keyId, startMs, createdAt: Date.now(), notified: false },
	]);
}

export function removeLaunchReminder(keyId: string): void {
	saveLaunchReminders(
		readLaunchReminders().filter(reminder => reminder.keyId !== keyId)
	);
}

export function hasLaunchReminder(keyId: string): boolean {
	return readLaunchReminders().some(reminder => reminder.keyId === keyId);
}

export function markLaunchReminderNotified(keyId: string): void {
	saveLaunchReminders(
		readLaunchReminders().map(reminder =>
			reminder.keyId === keyId
				? { ...reminder, notified: true }
				: reminder
		)
	);
}
