import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CooldownBadge from '../CooldownBadge';

describe('CooldownBadge', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-01-01T00:00:00Z'));
	});

	afterEach(() => vi.useRealTimers());

	it('renders mm:ss and renders nothing at zero', () => {
		const { rerender } = render(
			<CooldownBadge
				remainingSeconds={125}
				cooldownDurationSeconds={300}
				nextTradeUnlockAt="2026-01-01T00:02:05Z"
			/>
		);

		expect(screen.getByTestId('cooldown-countdown')).toHaveTextContent('02:05');
		rerender(
			<CooldownBadge
				remainingSeconds={0}
				cooldownDurationSeconds={300}
			/>
		);
		expect(screen.queryByTestId('cooldown-badge')).not.toBeInTheDocument();
	});

	it('renders nothing for a zero cooldown', () => {
		render(
			<CooldownBadge
				remainingSeconds={60}
				cooldownDurationSeconds={0}
			/>
		);
		expect(screen.queryByTestId('cooldown-badge')).not.toBeInTheDocument();
	});

	it('ticks when given a live next unlock timestamp', () => {
		render(
			<CooldownBadge
				remainingSeconds={2}
				cooldownDurationSeconds={2}
				nextTradeUnlockAt={Date.now() + 2000}
			/>
		);
		expect(screen.getByTestId('cooldown-countdown')).toHaveTextContent('00:02');
		act(() => vi.advanceTimersByTime(2000));
		expect(screen.queryByTestId('cooldown-badge')).not.toBeInTheDocument();
	});
});
