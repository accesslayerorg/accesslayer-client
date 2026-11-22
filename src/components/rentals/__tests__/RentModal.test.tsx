import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RentModal from '../RentModal';
import type { RentalListing } from '@/types/keyRental';

const listing: RentalListing = {
	id: '9',
	keyId: 'key-a',
	keyName: 'Alpha',
	owner: 'GOWNER',
	quantity: 1,
	feePerDayStroops: 12_345_678n, // 1.2345678 XLM a day
	maxDays: 30,
	collateralStroops: 100_000_000n, // 10 XLM
	status: 'listed',
	renter: null,
	rentedDays: null,
	rentedAtMs: null,
	expiresAtMs: null,
	graceEndsAtMs: null,
};

function renderModal(onConfirm = vi.fn()) {
	render(
		<RentModal
			open
			onOpenChange={vi.fn()}
			listing={listing}
			onConfirm={onConfirm}
		/>
	);
	return { onConfirm };
}

describe('RentModal', () => {
	it('shows the fee per day, collateral and a total equal to fee per day times days', async () => {
		const user = userEvent.setup();
		renderModal();

		expect(screen.getByTestId('rent-fee-per-day')).toHaveTextContent(
			'1.2345678 XLM'
		);
		expect(screen.getByTestId('rent-collateral')).toHaveTextContent('10 XLM');
		expect(screen.getByTestId('rent-total-fee')).toHaveTextContent(
			'1.2345678 XLM'
		);

		const days = screen.getByTestId('rent-days-input');
		await user.clear(days);
		await user.type(days, '7');
		// 1.2345678 x 7 = 8.6419746, exact.
		expect(screen.getByTestId('rent-total-fee')).toHaveTextContent(
			'8.6419746 XLM'
		);
		expect(screen.getByTestId('rent-total-due')).toHaveTextContent(
			'18.6419746 XLM'
		);

		await user.click(screen.getByTestId('rent-days-increment'));
		expect(days).toHaveValue(8);
		expect(screen.getByTestId('rent-total-fee')).toHaveTextContent(
			'9.8765424 XLM'
		);
	});

	it('blocks more days than the listing allows', async () => {
		const user = userEvent.setup();
		renderModal();

		const days = screen.getByTestId('rent-days-input');
		await user.clear(days);
		await user.type(days, '31');

		expect(screen.getByTestId('rent-days-error')).toHaveTextContent(
			'This listing allows at most 30 days.'
		);
		expect(screen.getByTestId('rent-confirm')).toBeDisabled();
	});

	it('confirms with the chosen number of days', async () => {
		const user = userEvent.setup();
		const { onConfirm } = renderModal(vi.fn().mockResolvedValue(undefined));

		const days = screen.getByTestId('rent-days-input');
		await user.clear(days);
		await user.type(days, '3');
		await user.click(screen.getByTestId('rent-confirm'));

		expect(onConfirm).toHaveBeenCalledWith(3);
	});
});
