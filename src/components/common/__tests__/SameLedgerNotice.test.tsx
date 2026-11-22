import { render, screen, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import SameLedgerNotice from '@/components/common/SameLedgerNotice';

describe('SameLedgerNotice (#1354)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders when lockedBalance > 0', () => {
		render(
			<SameLedgerNotice
				lockedBalance={40}
				totalBalance={100}
				nextLedgerCloseEstimate={Date.now() + 5000}
			/>
		);

		expect(screen.getByTestId('same-ledger-notice')).toBeInTheDocument();
		expect(screen.getByText('Same-Ledger Sell Restriction')).toBeInTheDocument();
		expect(screen.getByText(/40 of 100 keys \(40%\) are locked/)).toBeInTheDocument();
	});

	it('does not render when lockedBalance is 0', () => {
		render(
			<SameLedgerNotice
				lockedBalance={0}
				totalBalance={100}
				nextLedgerCloseEstimate={Date.now() + 5000}
			/>
		);

		expect(screen.queryByTestId('same-ledger-notice')).not.toBeInTheDocument();
	});

	it('does not render when lockedBalance is negative', () => {
		render(
			<SameLedgerNotice
				lockedBalance={-10}
				totalBalance={100}
				nextLedgerCloseEstimate={Date.now() + 5000}
			/>
		);

		expect(screen.queryByTestId('same-ledger-notice')).not.toBeInTheDocument();
	});

	it('shows countdown that updates every second', () => {
		const futureTime = Date.now() + 10000; // 10 seconds in future
		render(
			<SameLedgerNotice
				lockedBalance={40}
				totalBalance={100}
				nextLedgerCloseEstimate={futureTime}
			/>
		);

		// Initial render should show ~10s
		expect(screen.getByText(/10s/)).toBeInTheDocument();

		// Advance timers by 5 seconds
		act(() => {
			vi.advanceTimersByTime(5000);
		});

		expect(screen.getByText(/5s/)).toBeInTheDocument();
	});

	it('shows "unlocking..." when countdown reaches zero', () => {
		const pastTime = Date.now() - 1000; // 1 second ago
		render(
			<SameLedgerNotice
				lockedBalance={40}
				totalBalance={100}
				nextLedgerCloseEstimate={pastTime}
			/>
		);

		expect(screen.getByText('unlocking...')).toBeInTheDocument();
	});

	it('calculates percentage correctly', () => {
		render(
			<SameLedgerNotice
				lockedBalance={25}
				totalBalance={100}
				nextLedgerCloseEstimate={Date.now() + 5000}
			/>
		);

		expect(screen.getByText(/25 of 100 keys \(25%\) are locked/)).toBeInTheDocument();
	});

	it('handles missing nextLedgerCloseEstimate gracefully', () => {
		render(
			<SameLedgerNotice
				lockedBalance={40}
				totalBalance={100}
				// nextLedgerCloseEstimate not provided
			/>
		);

		expect(screen.getByTestId('same-ledger-notice')).toBeInTheDocument();
		// Countdown should not be shown or should show default
	});
});