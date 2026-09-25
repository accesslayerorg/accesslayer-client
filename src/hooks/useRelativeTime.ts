import { useEffect, useMemo, useState } from 'react';
import { formatRelativeTimeLabel } from '@/utils/time.utils';

const REFRESH_INTERVAL_MS = 60_000;

/**
 * Returns a human-readable relative-time label for the given timestamp,
 * automatically refreshing every 60 seconds so the display stays current.
 */
export function useRelativeTime(
	timestamp: string | number | Date | null | undefined
): string {
	const date = useMemo(() => {
		if (timestamp == null) return null;
		const d = timestamp instanceof Date ? timestamp : new Date(timestamp);
		return Number.isNaN(d.getTime()) ? null : d;
	}, [timestamp]);

	const [now, setNow] = useState(() => new Date());

	useEffect(() => {
		if (date == null) return;
		const id = window.setInterval(() => setNow(new Date()), REFRESH_INTERVAL_MS);
		return () => window.clearInterval(id);
	}, [date]);

	if (date == null) return 'N/A';

	return formatRelativeTimeLabel(date, now);
}
