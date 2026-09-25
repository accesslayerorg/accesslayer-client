import { useCallback, useEffect, useRef, useState } from 'react';

export const WAITING_THRESHOLD_MS = 3_000;
export const RETRY_INTERVAL_MS = 15_000;
export const MAX_RETRIES = 3;

interface UseWalletReconnectOptions {
	isPending: boolean;
	isConnected: boolean;
	hasError: boolean;
	onRetry: () => void;
	waitingThresholdMs?: number;
	retryIntervalMs?: number;
	maxRetries?: number;
}

export interface UseWalletReconnectResult {
	showWaiting: boolean;
	showFailed: boolean;
	cancelAndReset: () => void;
}

export function useWalletReconnect({
	isPending,
	isConnected,
	hasError,
	onRetry,
	waitingThresholdMs = WAITING_THRESHOLD_MS,
	retryIntervalMs = RETRY_INTERVAL_MS,
	maxRetries = MAX_RETRIES,
}: UseWalletReconnectOptions): UseWalletReconnectResult {
	const [showWaiting, setShowWaiting] = useState(false);
	const [showFailed, setShowFailed] = useState(false);

	const inCycleRef = useRef(false);
	const retryCountRef = useRef(0);
	const waitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const onRetryRef = useRef(onRetry);
	onRetryRef.current = onRetry;

	const clearTimers = useCallback(() => {
		if (waitTimerRef.current != null) {
			clearTimeout(waitTimerRef.current);
			waitTimerRef.current = null;
		}
		if (retryTimerRef.current != null) {
			clearTimeout(retryTimerRef.current);
			retryTimerRef.current = null;
		}
	}, []);

	const cancelAndReset = useCallback(() => {
		clearTimers();
		inCycleRef.current = false;
		retryCountRef.current = 0;
		setShowWaiting(false);
		setShowFailed(false);
	}, [clearTimers]);

	useEffect(() => {
		if (isConnected || hasError) {
			cancelAndReset();
			return;
		}

		// Already managing the retry cycle; don't restart timers on isPending flicker
		if (inCycleRef.current) {
			return;
		}

		if (!isPending) {
			return;
		}

		inCycleRef.current = true;

		waitTimerRef.current = setTimeout(() => {
			setShowWaiting(true);

			const scheduleRetry = () => {
				retryTimerRef.current = setTimeout(() => {
					retryCountRef.current += 1;

					if (retryCountRef.current > maxRetries) {
						inCycleRef.current = false;
						retryCountRef.current = 0;
						setShowWaiting(false);
						setShowFailed(true);
						return;
					}

					onRetryRef.current();
					scheduleRetry();
				}, retryIntervalMs);
			};

			scheduleRetry();
		}, waitingThresholdMs);

		return () => {
			// Only clear timers if we are not inside an active retry cycle so
			// that effect re-runs triggered by isPending flickering during a
			// retry do not interrupt the self-managed timer chain.
			if (!inCycleRef.current) {
				clearTimers();
			}
		};
	}, [
		isPending,
		isConnected,
		hasError,
		waitingThresholdMs,
		retryIntervalMs,
		maxRetries,
		cancelAndReset,
		clearTimers,
	]);

	return { showWaiting, showFailed, cancelAndReset };
}
