import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import TransactionTypeBadge from '../TransactionTypeBadge';

describe('TransactionTypeBadge', () => {
	it('renders a green badge with label "Buy" for buy transaction type', () => {
		expect(() => {
			render(<TransactionTypeBadge type="buy" />);
		}).not.toThrow();

		const badge = screen.getByTestId('transaction-type-badge-buy');
		expect(badge).toHaveTextContent('Buy');
		expect(badge.className).toContain('emerald');
	});

	it('renders a red badge with label "Sell" for sell transaction type', () => {
		expect(() => {
			render(<TransactionTypeBadge type="sell" />);
		}).not.toThrow();

		const badge = screen.getByTestId('transaction-type-badge-sell');
		expect(badge).toHaveTextContent('Sell');
		expect(badge.className).toContain('rose');
	});

	it('renders a grey badge with label "Unknown" for unknown transaction type', () => {
		expect(() => {
			render(<TransactionTypeBadge type="other" />);
		}).not.toThrow();

		const badge = screen.getByTestId('transaction-type-badge-other');
		expect(badge).toHaveTextContent('Unknown');
		expect(badge.className).toContain('gray');
	});

	it('handles null type gracefully without throwing errors', () => {
		expect(() => {
			render(<TransactionTypeBadge type={null} />);
		}).not.toThrow();

		const badge = screen.getByTestId('transaction-type-badge-unknown');
		expect(badge).toHaveTextContent('Unknown');
		expect(badge.className).toContain('gray');
	});

	it('handles undefined type gracefully without throwing errors', () => {
		expect(() => {
			render(<TransactionTypeBadge type={undefined} />);
		}).not.toThrow();

		const badge = screen.getByTestId('transaction-type-badge-unknown');
		expect(badge).toHaveTextContent('Unknown');
		expect(badge.className).toContain('gray');
	});
});
