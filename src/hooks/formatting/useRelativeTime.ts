import { useEffect, useMemo, useState } from 'react';

/** Refresh cadence for the relative label while the component stays mounted. */
const REFRESH_INTERVAL_MS = 60_000;

const relativeFormatter = new Intl.RelativeTimeFormat('en-US', {
	numeric: 'auto',
});

/**
 * Produces a human-readable relative-time string ("2 minutes ago", "3 days
 * ago") from a millisecond epoch timestamp using `Intl.RelativeTimeFormat`.
 *
 * The unit-selection thresholds intentionally mirror the previous hand-rolled
 * logic in `TransactionHistory.tsx` (minutes < 60 → minutes, hours < 24 →
 * hours, otherwise days) so the chosen granularity does not visibly change —
 * only the formatting mechanism does.
 */
function formatRelative(timestamp: number, now: number): string {
	const diff = now - timestamp;
	const minutes = Math.floor(diff / (1000 * 60));
	const hours = Math.floor(diff / (1000 * 60 * 60));
	const days = Math.floor(diff / (1000 * 60 * 60 * 24));

	if (minutes < 1) return relativeFormatter.format(0, 'second');
	if (minutes < 60) return relativeFormatter.format(-minutes, 'minute');
	if (hours < 24) return relativeFormatter.format(-hours, 'hour');
	return relativeFormatter.format(-days, 'day');
}

/**
 * Returns a relative-time label for `timestamp` and re-renders the consuming
 * component every 60 seconds so the label stays current while mounted. The
 * interval is cleared on unmount / timestamp change (matching the cleanup
 * convention in `useDropCountdown.ts`).
 */
export function useRelativeTime(timestamp: number): string {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		setNow(Date.now());
		const id = window.setInterval(
			() => setNow(Date.now()),
			REFRESH_INTERVAL_MS
		);
		return () => window.clearInterval(id);
	}, [timestamp]);

	return useMemo(() => formatRelative(timestamp, now), [timestamp, now]);
}
