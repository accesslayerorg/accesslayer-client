import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ReinvestDividendDialog from '../ReinvestDividendDialog';

describe('ReinvestDividendDialog', () => {
	const baseProps = {
		open: true,
		creatorName: 'Alex Rivers',
		unclaimedDividend: 1.25,
		keyPriceStroops: 5_000_000,
		onOpenChange: vi.fn(),
		onConfirm: vi.fn(),
		isSubmitting: false,
	};

	it('shows the unclaimed amount, estimated keys and XLM remainder', () => {
		render(<ReinvestDividendDialog {...baseProps} />);

		expect(screen.getByText('Reinvest dividends')).toBeInTheDocument();
		// 1.25 XLM at 0.5 XLM/key => 2 whole keys, 0.25 XLM remainder
		expect(screen.getByText(/2 keys/)).toBeInTheDocument();
		expect(screen.getByText(/Unclaimed dividends/i)).toBeInTheDocument();
	});

	it('shows an unavailable estimate when key price is missing', () => {
		render(<ReinvestDividendDialog {...baseProps} keyPriceStroops={null} />);

		expect(screen.getByText(/Unavailable/)).toBeInTheDocument();
		expect(screen.getByTestId('reinvest-dialog-confirm')).toBeDisabled();
	});
});
