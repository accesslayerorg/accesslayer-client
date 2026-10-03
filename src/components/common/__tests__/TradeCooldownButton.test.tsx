import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import TradeCooldownButton from '../TradeCooldownButton';
import type { ActiveTradeCooldown } from '@/utils/tradeCooldown.utils';

const nowSec = 1700000000;

const makeCooldown = (
	remainingSeconds: number,
	cooldownDurationSeconds: number | null = 300
): ActiveTradeCooldown => ({
	creatorId: 'creator-1',
	nextBuyAllowedAt: nowSec + remainingSeconds,
	cooldownDurationSeconds,
});

describe('TradeCooldownButton (#998)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.setSystemTime(nowSec * 1000);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders the regular label and is enabled when there is no cooldown', () => {
		const onClick = vi.fn();

		render(
			<TradeCooldownButton cooldown={null} label="Buy" onClick={onClick} />
		);

		const button = screen.getByRole('button', { name: 'Buy' });
		expect(button).toBeEnabled();
		fireEvent.click(button);
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(
			screen.queryByTestId('trade-cooldown-countdown')
		).not.toBeInTheDocument();
	});

	it('replaces the label with a live countdown while the cooldown is active', () => {
		const onClick = vi.fn();

		render(
			<TradeCooldownButton
				cooldown={makeCooldown(272)}
				label="Buy"
				onClick={onClick}
			/>
		);

		expect(
			screen.queryByRole('button', { name: 'Buy' })
		).not.toBeInTheDocument();
		expect(screen.getByTestId('trade-cooldown-countdown')).toBeInTheDocument();
		expect(screen.getByTestId('trade-cooldown-text')).toHaveTextContent(
			'Cooldown 4m 32s'
		);
	});

	it('ticks down every second and is accurate to seconds', () => {
		render(<TradeCooldownButton cooldown={makeCooldown(4)} label="Sell" />);

		expect(screen.getByTestId('trade-cooldown-text')).toHaveTextContent('4s');

		for (let i = 3; i >= 1; i -= 1) {
			act(() => {
				vi.advanceTimersByTime(1000);
			});
			expect(screen.getByTestId('trade-cooldown-text')).toHaveTextContent(
				`${i}s`
			);
		}

		// At zero the cooldown is over — the countdown disappears entirely.
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(
			screen.queryByTestId('trade-cooldown-text')
		).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Sell' })).toBeEnabled();
	});

	it('disables the button for the whole cooldown — no click activation', () => {
		const onClick = vi.fn();

		render(
			<TradeCooldownButton
				cooldown={makeCooldown(30)}
				label="Buy"
				onClick={onClick}
			/>
		);

		const button = screen.getByRole('button');
		expect(button).toBeDisabled();

		fireEvent.click(button);
		expect(onClick).not.toHaveBeenCalled();
	});

	it('re-enables immediately with the original label when the cooldown expires', () => {
		const onClick = vi.fn();

		render(
			<TradeCooldownButton
				cooldown={makeCooldown(2)}
				label="Sell"
				onClick={onClick}
			/>
		);

		expect(screen.getByRole('button')).toBeDisabled();

		act(() => {
			vi.advanceTimersByTime(2000);
		});

		const button = screen.getByRole('button', { name: 'Sell' });
		expect(button).toBeEnabled();
		fireEvent.click(button);
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(
			screen.queryByTestId('trade-cooldown-countdown')
		).not.toBeInTheDocument();
		expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
	});

	it('restarts the countdown when a new cooldown is provided (post-trade refetch)', () => {
		const { rerender } = render(
			<TradeCooldownButton cooldown={makeCooldown(5)} label="Buy" />
		);

		act(() => {
			vi.advanceTimersByTime(3000);
		});
		expect(screen.getByTestId('trade-cooldown-text')).toHaveTextContent('2s');

		// Rewind the (also-mocked) wall clock so the new cooldown starts fresh.
		vi.setSystemTime(nowSec * 1000);

		// A fresh cooldown arrives (e.g. after the next buy).
		rerender(
			<TradeCooldownButton cooldown={makeCooldown(90)} label="Buy" />
		);
		expect(screen.getByTestId('trade-cooldown-text')).toHaveTextContent(
			'1m 30s'
		);
	});

	it('shows a tooltip explaining the cooldown reason and the creator-set duration policy', () => {
		render(
			<TradeCooldownButton
				cooldown={makeCooldown(120, 300)}
				label="Buy"
			/>
		);

		const tooltip = screen.getByRole('tooltip');
		expect(tooltip).toHaveTextContent(
			'You can trade this key again in 2m 00s.'
		);
		expect(tooltip).toHaveTextContent(
			'This key enforces a 5m 00s cooldown between trades, set by the creator.'
		);
	});

	it('falls back to a generic policy line in the tooltip when the duration is unknown', () => {
		render(
			<TradeCooldownButton
				cooldown={makeCooldown(45, null)}
				label="Sell"
			/>
		);

		const tooltip = screen.getByRole('tooltip');
		expect(tooltip).toHaveTextContent('You can trade this key again in 45s.');
		expect(tooltip).toHaveTextContent('This cooldown is set by the creator.');
	});

	it('stays disabled when the cooldown is active even if external props allow it', () => {
		render(
			<TradeCooldownButton
				cooldown={makeCooldown(30)}
				label="Buy"
				buttonProps={{ disabled: false }}
			/>
		);

		expect(screen.getByRole('button')).toBeDisabled();
	});

	it('respects an externally disabled state when no cooldown is active', () => {
		const onClick = vi.fn();

		render(
			<TradeCooldownButton
				cooldown={null}
				label="Buy"
				onClick={onClick}
				buttonProps={{ disabled: true, 'data-testid': 'holding-buy-button' }}
			/>
		);

		const button = screen.getByTestId('holding-buy-button');
		expect(button).toBeDisabled();
		fireEvent.click(button);
		expect(onClick).not.toHaveBeenCalled();
	});
});
