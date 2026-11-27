import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import LiveClaimable from '../LiveClaimable';
import type { EarningsStream } from '@/types/stream';

describe('LiveClaimable', () => {
	it('ticks up using stream rate and never exceeds funded minus withdrawn', () => {
		vi.useFakeTimers();
		const now = Date.now();

		const stream: EarningsStream = {
			id: 'test-s1',
			creatorAddress: 'GCXW1234',
			keyId: 'key-1',
			keySymbol: 'TEST',
			keyName: 'Test Key',
			fundedAmount: 100,
			withdrawnAmount: 20, // max claimable = 80
			ratePerSecond: 1.0, // 1 XLM per second
			startTime: now - 20 * 1000, // 20s elapsed covers the 20 withdrawn
			stopTime: now + 200 * 1000,
			lastWithdrawalTime: now,
			isPaused: false,
			withdrawals: [],
		};

		render(<LiveClaimable stream={stream} />);

		// Initially at now, 20s elapsed * 1.0 = 20 accrued - 20 withdrawn = 0 claimable
		expect(screen.getByTestId('live-claimable-value')).toHaveTextContent('0.0000');

		// Fast forward 10 seconds => 10 XLM accrued
		act(() => {
			vi.advanceTimersByTime(10_000);
		});
		expect(screen.getByTestId('live-claimable-value')).toHaveTextContent('10.0000');

		// Fast forward 150 seconds => reaches max claimable (funded - withdrawn = 80)
		act(() => {
			vi.advanceTimersByTime(150_000);
		});
		expect(screen.getByTestId('live-claimable-value')).toHaveTextContent('80.0000');

		vi.useRealTimers();
	});

	it('shows paused notice and frozen claimable value when paused', () => {
		vi.useFakeTimers();
		const now = Date.now();

		const stream: EarningsStream = {
			id: 'test-s2',
			creatorAddress: 'GCXW1234',
			keyId: 'key-2',
			keySymbol: 'PAUSED',
			keyName: 'Paused Stream',
			fundedAmount: 1000,
			withdrawnAmount: 100,
			ratePerSecond: 0.5,
			startTime: now - 100 * 1000, // started 100s ago
			stopTime: now + 1000 * 1000,
			lastWithdrawalTime: now - 100 * 1000,
			isPaused: true,
			pausedAt: now - 50 * 1000, // paused 50s after start => accrued 25, withdrawn 100 => 0 or accrued before
			withdrawals: [],
		};

		render(<LiveClaimable stream={stream} />);

		// Frozen badge is present
		expect(screen.getByTestId('claimable-frozen-badge')).toBeInTheDocument();

		// Advancing time does NOT change value
		const valueBefore = screen.getByTestId('live-claimable-value').textContent;
		act(() => {
			vi.advanceTimersByTime(20_000);
		});
		const valueAfter = screen.getByTestId('live-claimable-value').textContent;
		expect(valueBefore).toBe(valueAfter);

		vi.useRealTimers();
	});
});
