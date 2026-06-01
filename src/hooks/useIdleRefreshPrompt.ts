import { useCallback, useEffect, useRef, useState } from 'react';

export interface UseIdleRefreshPromptOptions {
	/** Milliseconds of inactivity before the prompt appears. Default: 5 minutes. */
	thresholdMs?: number;
	/** Called when the threshold is crossed and the prompt should be shown. */
	onIdle?: () => void;
}

export interface UseIdleRefreshPromptReturn {
	/** Whether the idle prompt is currently visible. */
	isPromptVisible: boolean;
	/** Call this to show the prompt (e.g. when the threshold fires). */
	showPrompt: () => void;
	/** Dismiss the prompt without refreshing. */
	dismissPrompt: () => void;
	/** Reset the idle timer — call this after a successful refresh. */
	resetTimer: () => void;
}

const INTERACTION_EVENTS = [
	'mousemove',
	'keydown',
	'pointerdown',
	'touchstart',
	'scroll',
] as const;

const DEFAULT_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Detects user inactivity relative to the last creator-list refresh and
 * surfaces a prompt after `thresholdMs` of no interaction.
 *
 * The timer resets whenever the user interacts with the page, so the prompt
 * only appears during genuine idle periods. Dismissing the prompt (without
 * refreshing) also resets the timer so it doesn't immediately re-appear.
 */
export function useIdleRefreshPrompt(
	options: UseIdleRefreshPromptOptions = {}
): UseIdleRefreshPromptReturn {
	const { thresholdMs = DEFAULT_THRESHOLD_MS, onIdle } = options;

	const [isPromptVisible, setIsPromptVisible] = useState(false);
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	// Keep a stable ref to onIdle so the interaction handler never goes stale.
	const onIdleRef = useRef(onIdle);
	useEffect(() => {
		onIdleRef.current = onIdle;
	}, [onIdle]);

	const clearTimer = useCallback(() => {
		if (timerRef.current !== null) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	}, []);

	const startTimer = useCallback(() => {
		clearTimer();
		timerRef.current = setTimeout(() => {
			setIsPromptVisible(true);
			onIdleRef.current?.();
		}, thresholdMs);
	}, [clearTimer, thresholdMs]);

	// Dismiss on any user interaction while the prompt is visible.
	const handleInteraction = useCallback(() => {
		if (isPromptVisible) {
			setIsPromptVisible(false);
		}
		// Always restart the timer on interaction so the clock resets.
		startTimer();
	}, [isPromptVisible, startTimer]);

	// Attach / re-attach interaction listeners whenever handleInteraction changes.
	useEffect(() => {
		INTERACTION_EVENTS.forEach(event =>
			window.addEventListener(event, handleInteraction, { passive: true })
		);
		return () => {
			INTERACTION_EVENTS.forEach(event =>
				window.removeEventListener(event, handleInteraction)
			);
		};
	}, [handleInteraction]);

	// Start the timer on mount.
	useEffect(() => {
		startTimer();
		return clearTimer;
	}, [startTimer, clearTimer]);

	const showPrompt = useCallback(() => setIsPromptVisible(true), []);

	const dismissPrompt = useCallback(() => {
		setIsPromptVisible(false);
		// Reset the timer so the prompt doesn't immediately re-appear.
		startTimer();
	}, [startTimer]);

	const resetTimer = useCallback(() => {
		setIsPromptVisible(false);
		startTimer();
	}, [startTimer]);

	return { isPromptVisible, showPrompt, dismissPrompt, resetTimer };
}
