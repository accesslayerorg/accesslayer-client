import { useEffect, useState } from 'react';

/**
 * Shared ticking clock used by views that render a live countdown.
 *
 * Owning a single interval at the page level and passing `nowMs` down keeps
 * expiry-derived state (countdown labels, automatic archiving) in sync across
 * every row, and lets components stay pure and deterministic in tests.
 */
export function useNowMs(intervalMs = 1000): number {
	const [nowMs, setNowMs] = useState(() => Date.now());

	useEffect(() => {
		const id = window.setInterval(() => setNowMs(Date.now()), intervalMs);
		return () => window.clearInterval(id);
	}, [intervalMs]);

	return nowMs;
}
