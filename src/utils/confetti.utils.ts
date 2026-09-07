import confetti from 'canvas-confetti';

const HAS_BOUGHT_KEY = 'has_bought';

/**
 * Play a confetti animation for the specified duration, then clean up
 * the canvas element from the DOM.
 *
 * Uses canvas-confetti to fire a sequence of bursts, then stops and
 * removes any lingering canvas elements after `durationMs`.
 */
export function playPurchaseConfetti(durationMs = 2500): void {
	const end = Date.now() + durationMs;

	const frame = () => {
		confetti({
			particleCount: 3,
			angle: 60,
			spread: 55,
			origin: { x: 0 },
		});
		confetti({
			particleCount: 3,
			angle: 120,
			spread: 55,
			origin: { x: 1 },
		});

		if (Date.now() < end) {
			requestAnimationFrame(frame);
		}
	};

	frame();

	// Clean up canvas elements after the animation duration.
	setTimeout(() => {
		const canvases = document.querySelectorAll('canvas');
		canvases.forEach(canvas => {
			// Only remove confetti canvases (they don't have meaningful IDs).
			if (!canvas.id) {
				canvas.remove();
			}
		});
	}, durationMs + 100);
}

/**
 * Check whether the current user has already had a successful key purchase
 * recorded in localStorage.
 */
export function hasBoughtBefore(): boolean {
	if (typeof window === 'undefined') return true;
	return window.localStorage.getItem(HAS_BOUGHT_KEY) === 'true';
}

/**
 * Mark that a successful key purchase has occurred so future purchases
 * do not trigger the confetti again.
 */
export function markHasBought(): void {
	if (typeof window === 'undefined') return;
	window.localStorage.setItem(HAS_BOUGHT_KEY, 'true');
}

/**
 * Determine whether confetti should fire for a successful trade mutation.
 *
 * Conditions:
 * - The trade must be a buy (`amount > 0`).
 * - The user must not have purchased before (`has_bought` absent from localStorage).
 *
 * When all conditions pass this also sets `has_bought` and returns true.
 */
export function shouldTriggerConfetti(amount: number): boolean {
	if (amount <= 0) return false;
	if (hasBoughtBefore()) return false;

	markHasBought();
	return true;
}
