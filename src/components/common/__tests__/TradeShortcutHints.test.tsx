import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import TradeShortcutHints from '@/components/common/TradeShortcutHints';

describe('TradeShortcutHints', () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('does not render when dialog is closed', () => {
		render(<TradeShortcutHints open={false} side="buy" />);

		expect(
			screen.queryByTestId('trade-shortcut-hints')
		).not.toBeInTheDocument();
	});

	it('shows hints briefly when dialog opens', () => {
		render(<TradeShortcutHints open side="buy" />);

		// Should appear after the initial 300ms delay
		act(() => {
			vi.advanceTimersByTime(350);
		});

		expect(screen.getByTestId('trade-shortcut-hints')).toBeInTheDocument();
	});

	it('auto-hides after 4 seconds', () => {
		render(<TradeShortcutHints open side="buy" />);

		// Show after delay
		act(() => {
			vi.advanceTimersByTime(350);
		});

		expect(screen.getByTestId('trade-shortcut-hints')).toBeInTheDocument();

		// Hide after 4s
		act(() => {
			vi.advanceTimersByTime(4000);
		});

		expect(
			screen.queryByTestId('trade-shortcut-hints')
		).not.toBeInTheDocument();
	});

	it('displays buy shortcuts for buy side', () => {
		render(<TradeShortcutHints open side="buy" />);

		act(() => {
			vi.advanceTimersByTime(350);
		});

		expect(screen.getByText('Buy shortcuts:')).toBeInTheDocument();
	});

	it('displays sell shortcuts for sell side', () => {
		render(<TradeShortcutHints open side="sell" />);

		act(() => {
			vi.advanceTimersByTime(350);
		});

		expect(screen.getByText('Sell shortcuts:')).toBeInTheDocument();
	});

	it('shows keyboard shortcut labels', () => {
		render(<TradeShortcutHints open side="buy" />);

		act(() => {
			vi.advanceTimersByTime(350);
		});

		expect(screen.getAllByText('Enter').length).toBeGreaterThan(0);
		expect(screen.getAllByText('+').length).toBeGreaterThan(0);
		expect(screen.getAllByText('-').length).toBeGreaterThan(0);
	});
});
