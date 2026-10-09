import { useEffect, useState } from 'react';

export interface ProtocolStatus {
	globalTradingPaused: boolean;
	pauseActivatedAt?: string;
}

const POLL_INTERVAL_MS = 30_000;

let globalPaused = false;
let globalPauseActivatedAt: string | undefined;
let listeners: Array<() => void> = [];

const notify = () => listeners.forEach(l => l());

const check = async () => {
	try {
		const res = await fetch('/protocol/status');
		if (!res.ok) return;
		const data: ProtocolStatus = await res.json();
		if (
			globalPaused !== data.globalTradingPaused ||
			globalPauseActivatedAt !== data.pauseActivatedAt
		) {
			globalPaused = data.globalTradingPaused;
			globalPauseActivatedAt = data.pauseActivatedAt;
			notify();
		}
	} catch {
		// silently ignore — will retry next poll
	}
};

let pollTimer: number | undefined;

export function useGlobalPause() {
	const [state, setState] = useState({
		paused: globalPaused,
		pauseActivatedAt: globalPauseActivatedAt,
	});

	useEffect(() => {
		const listener = () =>
			setState({
				paused: globalPaused,
				pauseActivatedAt: globalPauseActivatedAt,
			});
		listeners.push(listener);

		if (listeners.length === 1) {
			check();
			pollTimer = window.setInterval(check, POLL_INTERVAL_MS);
		}

		return () => {
			listeners = listeners.filter(l => l !== listener);
			if (listeners.length === 0 && pollTimer !== undefined) {
				window.clearInterval(pollTimer);
				pollTimer = undefined;
			}
		};
	}, []);

	return state;
}
