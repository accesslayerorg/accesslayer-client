import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RedeemKeyDialog from '@/components/common/RedeemKeyDialog';

describe('RedeemKeyDialog (#871)', () => {
	function renderDialog(
		overrides: Partial<React.ComponentProps<typeof RedeemKeyDialog>> = {}
	) {
		const onConfirm = vi.fn();
		const onOpenChange = vi.fn();
		render(
			<RedeemKeyDialog
				open={true}
				creatorName="Alice"
				quantity={5}
				priceFields={{ priceStroops: 1_000_000 }}
				onOpenChange={onOpenChange}
				onConfirm={onConfirm}
				{...overrides}
			/>
		);
		return { onConfirm, onOpenChange };
	}

	it('shows the redemption value computed from quantity * price', () => {
		renderDialog();
		// 5 * 1_000_000 stroops = 5_000_000 stroops = 0.50 XLM
		expect(screen.getByText('0.50 XLM')).toBeInTheDocument();
	});

	it('calls onConfirm when the confirm button is clicked', async () => {
		const { onConfirm } = renderDialog();
		fireEvent.click(screen.getByTestId('redeem-dialog-confirm'));
		expect(onConfirm).toHaveBeenCalledTimes(1);
	});

	it('calls onOpenChange(false) when cancel is clicked', () => {
		const { onOpenChange } = renderDialog();
		fireEvent.click(screen.getByTestId('redeem-dialog-cancel'));
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('disables confirm when the redemption value cannot be estimated', () => {
		renderDialog({ priceFields: {} });
		expect(screen.getByTestId('redeem-dialog-confirm')).toBeDisabled();
	});

	it('disables confirm and cancel while submitting', () => {
		renderDialog({ isSubmitting: true });
		expect(screen.getByTestId('redeem-dialog-confirm')).toBeDisabled();
		expect(screen.getByTestId('redeem-dialog-cancel')).toBeDisabled();
	});

	it('shows the deprecation reason when provided', () => {
		renderDialog({ deprecationReason: 'Creator left the platform' });
		expect(screen.getByText(/Creator left the platform/)).toBeInTheDocument();
	});
});
