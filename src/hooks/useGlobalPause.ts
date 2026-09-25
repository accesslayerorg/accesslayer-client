import { useEffect, useState } from 'react';

export interface ProtocolStatus {
	globalTradingPaused: boolean;
	pauseActivatedAt?: string;
}

const POLL_INTERVAL_MS = 60_000;

export function useGlobalPause() {
	const [paused, setPaused] = useState(false);
	const [pauseActivatedAt, setPauseActivatedAt] = useState<
		string | undefined
	>();

	useEffect(() => {
		let active = true;

		const check = async () => {
			try {
				const res = await fetch('/protocol/status');
				if (!res.ok) return;
				const data: ProtocolStatus = await res.json();
				if (!active) return;
				setPaused(data.globalTradingPaused);
				setPauseActivatedAt(data.pauseActivatedAt);
			} catch {
				// silently ignore — will retry next poll
			}
		};

		check();
		const id = window.setInterval(check, POLL_INTERVAL_MS);
		return () => {
			active = false;
			window.clearInterval(id);
		};
	}, []);

	return { paused, pauseActivatedAt };
}
