import { describe, expect, it, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import TransactionHistory from '@/components/common/TransactionHistory';

// TransactionHistory reads localStorage during initialisation.
beforeEach(() => {
	vi.stubEnv('NODE_ENV', 'test');
	localStorage.clear();
});

describe('TransactionHistory – activity feed sign prefix (integration)', () => {
	it('buy event amount is prefixed with a minus sign', () => {
		render(<TransactionHistory />);

		// There is at least one buy activity item in the sample data.
		const buyItems = screen.getAllByTestId('activity-item-buy');
		expect(buyItems.length).toBeGreaterThan(0);

		// For each buy row the visible amount must start with "-".
		buyItems.forEach(item => {
			const amountEl = item.querySelector('[data-testid^="tx-amount-"]');
			expect(amountEl).not.toBeNull();
			expect(amountEl!.textContent).toMatch(/^-/);
		});
	});

	it('sell event amount is prefixed with a plus sign', () => {
		render(<TransactionHistory />);

		const sellItems = screen.getAllByTestId('activity-item-sell');
		expect(sellItems.length).toBeGreaterThan(0);

		sellItems.forEach(item => {
			const amountEl = item.querySelector('[data-testid^="tx-amount-"]');
			expect(amountEl).not.toBeNull();
			expect(amountEl!.textContent).toMatch(/^\+/);
		});
	});

	it('XLM suffix is present on both buy and sell amounts', () => {
		render(<TransactionHistory />);

		const allItems = [
			...screen.getAllByTestId('activity-item-buy'),
			...screen.getAllByTestId('activity-item-sell'),
		];

		allItems.forEach(item => {
			const amountEl = item.querySelector('[data-testid^="tx-amount-"]');
			expect(amountEl).not.toBeNull();
			expect(amountEl!.textContent).toMatch(/XLM$/);
		});
	});

	it('renders relative time label correctly for recent versus older events (#487)', () => {
		render(<TransactionHistory />);

		// SAMPLE_TRANSACTIONS has one from 30 minutes ago, one from 5 days ago (120 hours).
		// We expect the first one to say "30 min ago" and the latter to say "5 days ago".
		// Actually, let's just check for 'min ago' and 'days ago'
		expect(screen.getAllByText(/min ago/)).not.toHaveLength(0);
		expect(screen.getAllByText(/days ago/)).not.toHaveLength(0);
		
		// Ensure raw ISO timestamp is not shown
		const isoRegex = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
		const rawTimestamps = screen.queryAllByText(isoRegex);
		expect(rawTimestamps).toHaveLength(0);
	});
});
