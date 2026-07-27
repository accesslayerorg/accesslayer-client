import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TradeDialog from '@/components/common/TradeDialog';

describe('TradeDialog buy price preview', () => {
	function renderDialog(
		overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
	) {
		return render(
			<TradeDialog
				open={true}
				side="buy"
				creatorName="Alice"
				availableHoldings={10}
				keyPriceStroops={100_000}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
				{...overrides}
			/>
		);
	}

	it('shows the price preview for quantity 1', () => {
		renderDialog();

		expect(screen.getByTestId('trade-dialog-amount')).toHaveValue('1');
		expect(screen.getByText('Estimated total (approximate):')).toBeInTheDocument();
	});

	it('updates the price preview when quantity changes to 2', () => {
		renderDialog();

		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;
		fireEvent.change(input, { target: { value: '2' } });

		expect(screen.getByText('Estimated total (approximate):')).toBeInTheDocument();
		expect(screen.getByText('0.02 XLM')).toBeInTheDocument();
	});

	it('does not show the price preview when quantity input is empty', () => {
		renderDialog();

		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;
		fireEvent.change(input, { target: { value: '' } });

		expect(screen.queryByText(/estimated total/i)).not.toBeInTheDocument();
	});

	it('does not show the price preview when quantity is zero', () => {
		renderDialog();

		const input = screen.getByTestId('trade-dialog-amount') as HTMLInputElement;
		fireEvent.change(input, { target: { value: '0' } });

		expect(screen.queryByText(/estimated total/i)).not.toBeInTheDocument();
	});

	it('does not show the price preview when keyPriceStroops is not provided', () => {
		renderDialog({ keyPriceStroops: null });

		expect(screen.queryByText(/estimated total/i)).not.toBeInTheDocument();
	});
});