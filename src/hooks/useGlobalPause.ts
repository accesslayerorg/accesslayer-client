import { useEffect, useState } from 'react';

export interface ProtocolStatus {
	globalTradingPaused: boolean;
	pauseActivatedAt?: string;
	/** Admin-supplied reason shown in the emergency pause banner (#1157). */
	pauseReason?: string | null;
	/** ISO timestamp for the expected resume; null/absent means until further notice (#1157). */
	resumeAt?: string | null;
}

export interface GlobalPauseState {
	paused: boolean;
	pauseActivatedAt?: string;
	pauseReason: string | null;
	resumeAt: string | null;
}

const POLL_INTERVAL_MS = 30_000;

let globalState: GlobalPauseState = {
	paused: false,
	pauseActivatedAt: undefined,
	pauseReason: null,
	resumeAt: null,
};
let listeners: Array<() => void> = [];

const notify = () => listeners.forEach(l => l());

const check = async () => {
	try {
		const res = await fetch('/protocol/status');
		if (!res.ok) return;
		const data: ProtocolStatus = await res.json();
		const next: GlobalPauseState = {
			paused: data.globalTradingPaused,
			pauseActivatedAt: data.pauseActivatedAt,
			pauseReason: data.pauseReason ?? null,
			resumeAt: data.resumeAt ?? null,
		};
		const changed =
			globalState.paused !== next.paused ||
			globalState.pauseActivatedAt !== next.pauseActivatedAt ||
			globalState.pauseReason !== next.pauseReason ||
			globalState.resumeAt !== next.resumeAt;
		if (changed) {
			globalState = next;
			notify();
		}
	} catch {
		// silently ignore — will retry next poll
	}
};

let pollTimer: number | undefined;

export function useGlobalPause(): GlobalPauseState {
	const [state, setState] = useState<GlobalPauseState>(globalState);

	useEffect(() => {
		const listener = () => setState(globalState);
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
