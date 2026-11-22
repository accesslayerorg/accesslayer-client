import { act, fireEvent, render, screen } from '@testing-library/react';
import { Toaster, toast } from 'react-hot-toast';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	BADGE_TOAST_DURATION_MS,
	showBadgeEarnedToast,
} from '../badgeAchievementToast';

// Keep jsdom away from a real canvas.
vi.mock('canvas-confetti', () => ({
	default: vi.fn(),
}));

const PROFILE_PATH = '/profile/0xabc#wallet-badges';

describe('showBadgeEarnedToast (#1222)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		toast.remove();
		vi.useRealTimers();
	});

	it('shows the badge name, the criteria met and the badge icon', () => {
		render(<Toaster />);

		act(() => {
			showBadgeEarnedToast({ badgeType: 'whale', profilePath: PROFILE_PATH });
		});

		expect(screen.getByTestId('badge-earned-toast')).toBeInTheDocument();
		expect(screen.getByTestId('badge-earned-toast-name')).toHaveTextContent(
			'Whale'
		);
		expect(screen.getByTestId('badge-earned-toast-criteria')).toHaveTextContent(
			'Criteria met: Trade 10,000 XLM in creator key volume'
		);
		expect(screen.getByTestId('badge-earned-toast-icon')).toBeInTheDocument();
	});

	it('persists for ten seconds before auto-dismissing', () => {
		render(<Toaster />);

		act(() => {
			showBadgeEarnedToast({ badgeType: 'whale', profilePath: PROFILE_PATH });
		});

		expect(BADGE_TOAST_DURATION_MS).toBe(10_000);

		act(() => {
			vi.advanceTimersByTime(BADGE_TOAST_DURATION_MS - 1);
		});
		expect(screen.getByTestId('badge-earned-toast')).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(1_000);
		});
		expect(screen.queryByTestId('badge-earned-toast')).not.toBeInTheDocument();
	});

	it('dismisses manually before the timer fires', () => {
		render(<Toaster />);

		act(() => {
			showBadgeEarnedToast({ badgeType: 'whale', profilePath: PROFILE_PATH });
		});

		fireEvent.click(screen.getByTestId('badge-earned-toast-dismiss'));

		act(() => {
			vi.advanceTimersByTime(1_000);
		});
		expect(screen.queryByTestId('badge-earned-toast')).not.toBeInTheDocument();
	});

	it('routes the View Badges CTA to the badge showcase and dismisses the toast', () => {
		const onViewBadges = vi.fn();
		render(<Toaster />);

		act(() => {
			showBadgeEarnedToast({
				badgeType: 'whale',
				profilePath: PROFILE_PATH,
				onViewBadges,
			});
		});

		fireEvent.click(screen.getByTestId('badge-earned-toast-cta'));

		expect(onViewBadges).toHaveBeenCalledWith(PROFILE_PATH);

		act(() => {
			vi.advanceTimersByTime(1_000);
		});
		expect(screen.queryByTestId('badge-earned-toast')).not.toBeInTheDocument();
	});

	it('falls back to a generic label for a badge outside the catalog', () => {
		render(<Toaster />);

		act(() => {
			showBadgeEarnedToast({
				badgeType: 'unknown-badge' as never,
				profilePath: PROFILE_PATH,
			});
		});

		expect(screen.getByTestId('badge-earned-toast-name')).toHaveTextContent(
			'New badge'
		);
		expect(screen.getByTestId('badge-earned-toast-criteria')).toHaveTextContent(
			'Achievement unlocked'
		);
	});
});
