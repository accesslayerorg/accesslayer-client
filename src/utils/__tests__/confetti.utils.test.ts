import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import {
	hasBoughtBefore,
	markHasBought,
	shouldTriggerConfetti,
	playPurchaseConfetti,
} from '../confetti.utils';

const HAS_BOUGHT_KEY = 'has_bought';

// Mock canvas-confetti so it doesn't touch a real canvas in jsdom.
vi.mock('canvas-confetti', () => ({
	default: vi.fn(),
}));

beforeEach(() => {
	window.localStorage.clear();
	vi.useFakeTimers();
});

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe('hasBoughtBefore', () => {
	it('returns false when has_bought is absent from localStorage', () => {
		expect(hasBoughtBefore()).toBe(false);
	});

	it('returns true when has_bought is set to "true"', () => {
		window.localStorage.setItem(HAS_BOUGHT_KEY, 'true');
		expect(hasBoughtBefore()).toBe(true);
	});

	it('returns false when has_bought is set to any other value', () => {
		window.localStorage.setItem(HAS_BOUGHT_KEY, 'false');
		expect(hasBoughtBefore()).toBe(false);
	});
});

describe('markHasBought', () => {
	it('writes has_bought = "true" to localStorage', () => {
		expect(hasBoughtBefore()).toBe(false);
		markHasBought();
		expect(hasBoughtBefore()).toBe(true);
	});
});

describe('shouldTriggerConfetti', () => {
	it('returns true for a positive amount when no prior purchase exists', () => {
		expect(shouldTriggerConfetti(1)).toBe(true);
	});

	it('returns false when amount is zero', () => {
		expect(shouldTriggerConfetti(0)).toBe(false);
	});

	it('returns false when amount is negative (sell)', () => {
		expect(shouldTriggerConfetti(-5)).toBe(false);
	});

	it('returns false on subsequent purchases (has_bought present)', () => {
		markHasBought();
		expect(shouldTriggerConfetti(1)).toBe(false);
	});

	it('sets has_bought in localStorage on first trigger', () => {
		expect(hasBoughtBefore()).toBe(false);
		shouldTriggerConfetti(1);
		expect(hasBoughtBefore()).toBe(true);
	});

	it('does not set has_bought when amount is zero', () => {
		shouldTriggerConfetti(0);
		expect(hasBoughtBefore()).toBe(false);
	});

	it('does not set has_bought when amount is negative', () => {
		shouldTriggerConfetti(-3);
		expect(hasBoughtBefore()).toBe(false);
	});
});

describe('playPurchaseConfetti', () => {
	it('cleans up confetti canvas elements after duration', () => {
		// Create a fake canvas element that looks like a confetti canvas (no id).
		const fakeCanvas = document.createElement('canvas');
		fakeCanvas.className = 'confetti-canvas';
		document.body.appendChild(fakeCanvas);

		playPurchaseConfetti(2500);

		// Canvas should still exist before the timeout.
		expect(document.body.contains(fakeCanvas)).toBe(true);

		// Advance timers past the cleanup delay.
		vi.advanceTimersByTime(2600);

		// Canvas should be removed.
		expect(document.body.contains(fakeCanvas)).toBe(false);
	});

	it('does not remove canvas elements that have an id', () => {
		const myCanvas = document.createElement('canvas');
		myCanvas.id = 'main-canvas';
		document.body.appendChild(myCanvas);

		playPurchaseConfetti(2500);

		vi.advanceTimersByTime(2600);

		// Canvas with id should not be removed.
		expect(document.body.contains(myCanvas)).toBe(true);
	});
});
