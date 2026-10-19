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
 * Formats a lock-up countdown in days/hours/minutes, e.g. `2d 14h 32m`,
 * `14h 32m`, or `32m`. Used by the API-backed lock-up indicator (#1163).
 */
export function formatLockupCountdown(totalSeconds: number): string {
	if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '0m';
	const seconds = Math.ceil(totalSeconds);
	const days = Math.floor(seconds / 86_400);
	const hours = Math.floor((seconds % 86_400) / 3_600);
	const minutes = Math.floor((seconds % 3_600) / 60);

	if (days > 0) return `${days}d ${hours}h ${minutes}m`;
	if (hours > 0) return `${hours}h ${minutes}m`;
	return `${minutes}m`;
}
