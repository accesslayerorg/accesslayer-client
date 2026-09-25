import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import LockupCountdown from '../LockupCountdown';
import {
	computeRemainingLockupSeconds,
	formatCountdownTime,
} from '@/utils/lockupCountdown.utils';
import PortfolioHoldingRow from '../PortfolioHoldingRow';

describe('LockupCountdown', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	describe('helpers', () => {
		it('computes remaining lockup seconds correctly', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);

			// Bought 1 hour ago (3600s ago) => 86400 - 3600 = 82800s remaining
			const buyTimestamp = nowSec - 3600;
			expect(computeRemainingLockupSeconds(buyTimestamp)).toBe(82800);

			// Bought 25 hours ago => 0s remaining (expired)
			const expiredTimestamp = nowSec - 90000;
			expect(computeRemainingLockupSeconds(expiredTimestamp)).toBe(0);
		});

		it('formats remaining seconds in HH:MM:SS format', () => {
			expect(formatCountdownTime(82800)).toBe('23:00:00');
			expect(formatCountdownTime(3661)).toBe('01:01:01');
			expect(formatCountdownTime(59)).toBe('00:00:59');
			expect(formatCountdownTime(0)).toBe('00:00:00');
		});
	});

	describe('component rendering & behavior', () => {
		it('renders countdown in HH:MM:SS format when lockup is active', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);

			// 2 hours ago => remaining 22 hours = 79200 seconds -> 22:00:00
			const lastBuyTimestamp = nowSec - 7200;

			render(<LockupCountdown lastBuyTimestamp={lastBuyTimestamp} />);

			expect(screen.getByTestId('lockup-countdown')).toBeInTheDocument();
			expect(screen.getByTestId('lockup-timer-text')).toHaveTextContent('22:00:00');
		});

		it('returns null when lockup is expired or timestamp missing', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);

			const { container: containerExpired } = render(
				<LockupCountdown lastBuyTimestamp={nowSec - 90000} />
			);
			expect(containerExpired.firstChild).toBeNull();

			const { container: containerNull } = render(
				<LockupCountdown lastBuyTimestamp={null} />
			);
			expect(containerNull.firstChild).toBeNull();
		});

		it('updates countdown every second and triggers onExpire on completion', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);
			const onExpire = vi.fn();

			// 86398s ago => 2 seconds remaining
			const lastBuyTimestamp = nowSec - 86398;

			render(
				<LockupCountdown
					lastBuyTimestamp={lastBuyTimestamp}
					onExpire={onExpire}
				/>
			);

			expect(screen.getByTestId('lockup-timer-text')).toHaveTextContent('00:00:02');

			// Tick 1 second
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			expect(screen.getByTestId('lockup-timer-text')).toHaveTextContent('00:00:01');

			// Tick 1 second -> reaches 00:00:00 and expires
			act(() => {
				vi.advanceTimersByTime(1000);
			});

			expect(onExpire).toHaveBeenCalledTimes(1);
			expect(screen.queryByTestId('lockup-countdown')).not.toBeInTheDocument();
		});
	});

	describe('PortfolioHoldingRow integration', () => {
		it('disables sell button while lockup is active and enables after expiration', () => {
			const nowSec = 1700000000;
			vi.setSystemTime(nowSec * 1000);
			const onSell = vi.fn();

			// 2 seconds remaining
			const lastBuyTimestamp = nowSec - 86398;

			const position = {
				creatorId: 'creator-1',
				quantity: 5,
				priceStroops: 1000000,
				last_buy_timestamp: lastBuyTimestamp,
			};

			const creator = {
				id: 'creator-1',
				title: 'Test Creator',
				description: 'Desc',
				price: 0.1,
				instructorId: 'inst-1',
				category: 'Tech',
				level: 'BEGINNER' as const,
			};

			render(
				<PortfolioHoldingRow
					position={position}
					creator={creator}
					onSell={onSell}
				/>
			);

			const sellButton = screen.getByTestId('holding-sell-button');
			expect(sellButton).toBeDisabled();
			expect(screen.getByTestId('lockup-countdown')).toBeInTheDocument();

			// Advance time by 2 seconds to expire lockup
			act(() => {
				vi.advanceTimersByTime(2000);
			});

			expect(screen.queryByTestId('lockup-countdown')).not.toBeInTheDocument();
			expect(sellButton).not.toBeDisabled();

			fireEvent.click(sellButton);
			expect(onSell).toHaveBeenCalledWith('creator-1');
		});

		it('enables sell button immediately when holding has no active lockup', () => {
			const position = {
				creatorId: 'creator-2',
				quantity: 3,
				priceStroops: 500000,
				last_buy_timestamp: null,
			};

			render(
				<PortfolioHoldingRow
					position={position}
					onSell={vi.fn()}
				/>
			);

			const sellButton = screen.getByTestId('holding-sell-button');
			expect(sellButton).not.toBeDisabled();
			expect(screen.queryByTestId('lockup-countdown')).not.toBeInTheDocument();
		});
	});
});
