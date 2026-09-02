import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import BuyCooldownCountdown from '../BuyCooldownCountdown';

describe('BuyCooldownCountdown (#873)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders "Next buy available in" with a formatted duration when cooldown is active', () => {
		const nowSec = 1700000000;
		vi.setSystemTime(nowSec * 1000);

		render(<BuyCooldownCountdown nextBuyAllowedAt={nowSec + 272} />);

		expect(screen.getByTestId('buy-cooldown-countdown')).toBeInTheDocument();
		expect(screen.getByTestId('buy-cooldown-text')).toHaveTextContent(
			'Next buy available in 4m 32s'
		);
	});

	it('returns null when nextBuyAllowedAt is null', () => {
		const { container } = render(<BuyCooldownCountdown nextBuyAllowedAt={null} />);
		expect(container.firstChild).toBeNull();
	});

	it('returns null when nextBuyAllowedAt is undefined', () => {
		const { container } = render(<BuyCooldownCountdown />);
		expect(container.firstChild).toBeNull();
	});

	it('returns null when the cooldown has already expired', () => {
		const nowSec = 1700000000;
		vi.setSystemTime(nowSec * 1000);

		const { container } = render(
			<BuyCooldownCountdown nextBuyAllowedAt={nowSec - 10} />
		);
		expect(container.firstChild).toBeNull();
	});

	it('ticks down every second and calls onExpire when it reaches zero', () => {
		const nowSec = 1700000000;
		vi.setSystemTime(nowSec * 1000);
		const onExpire = vi.fn();

		// 2 seconds remaining
		render(
			<BuyCooldownCountdown
				nextBuyAllowedAt={nowSec + 2}
				onExpire={onExpire}
			/>
		);

		expect(screen.getByTestId('buy-cooldown-text')).toHaveTextContent('2s');

		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(screen.getByTestId('buy-cooldown-text')).toHaveTextContent('1s');

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(onExpire).toHaveBeenCalledTimes(1);
		expect(screen.queryByTestId('buy-cooldown-countdown')).not.toBeInTheDocument();
	});

	it('has an accessible status role with a descriptive label', () => {
		const nowSec = 1700000000;
		vi.setSystemTime(nowSec * 1000);

		render(<BuyCooldownCountdown nextBuyAllowedAt={nowSec + 60} />);

		const el = screen.getByRole('status');
		expect(el).toHaveAttribute('aria-label', 'Next buy available in 1m 00s');
	});
});
