export function computeRemainingLockupSeconds(
	lastBuyTimestamp?: number | string | null
): number {
	if (!lastBuyTimestamp) return 0;

	let lastBuySec = 0;
	if (typeof lastBuyTimestamp === 'number') {
		lastBuySec =
			lastBuyTimestamp > 1e11
				? Math.floor(lastBuyTimestamp / 1000)
				: lastBuyTimestamp;
	} else if (typeof lastBuyTimestamp === 'string') {
		const parsed = new Date(lastBuyTimestamp).getTime();
		if (isNaN(parsed)) return 0;
		lastBuySec = Math.floor(parsed / 1000);
	}

	const nowSec = Math.floor(Date.now() / 1000);
	const elapsed = nowSec - lastBuySec;
	const remaining = 86400 - elapsed;

	return remaining > 0 ? remaining : 0;
}

export function formatCountdownTime(totalSeconds: number): string {
	if (totalSeconds <= 0) return '00:00:00';
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const hh = String(hours).padStart(2, '0');
	const mm = String(minutes).padStart(2, '0');
	const ss = String(seconds).padStart(2, '0');

	return `${hh}:${mm}:${ss}`;
}

/**
 * Seconds remaining until an absolute unlock timestamp (#1163).
 *
 * Accepts seconds epoch, milliseconds epoch, or an ISO string — the same
 * shapes the backend reports elsewhere. Returns 0 when the timestamp is
 * missing, unparseable, or already in the past.
 */
export function computeRemainingUnlockSeconds(
	unlockAt?: number | string | null
): number {
	if (!unlockAt) return 0;

	let unlockMs = 0;
	if (typeof unlockAt === 'number') {
		unlockMs = unlockAt > 1e11 ? unlockAt : unlockAt * 1000;
	} else {
		const parsed = new Date(unlockAt).getTime();
		if (isNaN(parsed)) return 0;
		unlockMs = parsed;
	}

	const remainingMs = unlockMs - Date.now();
	return remainingMs > 0 ? Math.ceil(remainingMs / 1000) : 0;
}

/**
 * Human-readable lock-up countdown in days, hours, and minutes (#1163),
 * e.g. "2d 13h 45m". Zero-valued leading units are omitted; minutes are
 * always shown so the label never reads as a fully elapsed countdown while
 * seconds remain.
 */
export function formatUnlockCountdown(totalSeconds: number): string {
	if (totalSeconds <= 0) return '0m';

	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);

	const parts: string[] = [];
	if (days > 0) parts.push(`${days}d`);
	if (hours > 0) parts.push(`${hours}h`);
	if (minutes > 0 || parts.length === 0) parts.push(`${minutes}m`);

	return parts.join(' ');
}
