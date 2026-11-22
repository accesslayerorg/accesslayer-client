import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import RentalRow from '../RentalRow';
import type { RentalListing } from '@/types/keyRental';

const OWNER = 'GOWNER';
const RENTER = 'GRENTER';
const NOW = 1_800_000_000_000;
const DAY_MS = 86_400_000;

const rental: RentalListing = {
	id: '5',
	keyId: 'key-a',
	keyName: 'Alpha',
	owner: OWNER,
	quantity: 1,
	feePerDayStroops: 5_000_000n,
	maxDays: 7,
	collateralStroops: 50_000_000n,
	status: 'rented',
	renter: RENTER,
	rentedDays: 3,
	rentedAtMs: NOW - 2 * DAY_MS,
	expiresAtMs: NOW + DAY_MS,
	graceEndsAtMs: NOW + 2 * DAY_MS,
};

function renderRow(wallet: string, nowMs: number, listing = rental) {
	const onEndRental = vi.fn();
	const onClaimCollateral = vi.fn();
	render(
		<ul>
			<RentalRow
				listing={listing}
				wallet={wallet}
				nowMs={nowMs}
				onEndRental={onEndRental}
				onClaimCollateral={onClaimCollateral}
			/>
		</ul>
	);
	return { onEndRental, onClaimCollateral };
}

describe('RentalRow', () => {
	it('shows time remaining and no actions while the rental is active', () => {
		renderRow(RENTER, NOW);
		expect(screen.getByTestId('rental-row-status')).toHaveTextContent(
			'1d remaining'
		);
		expect(screen.queryByTestId('rental-row-end')).not.toBeInTheDocument();
		expect(screen.queryByTestId('rental-row-claim')).not.toBeInTheDocument();
	});

	it('offers End rental after expiry, but not yet Claim collateral', async () => {
		const user = userEvent.setup();
		const { onEndRental } = renderRow(OWNER, NOW + DAY_MS);

		expect(screen.queryByTestId('rental-row-claim')).not.toBeInTheDocument();
		await user.click(screen.getByTestId('rental-row-end'));
		expect(onEndRental).toHaveBeenCalledWith(rental);
	});

	it('offers Claim collateral to the owner after the grace period', async () => {
		const user = userEvent.setup();
		const { onClaimCollateral } = renderRow(OWNER, NOW + 2 * DAY_MS);

		await user.click(screen.getByTestId('rental-row-claim'));
		expect(onClaimCollateral).toHaveBeenCalledWith(rental);
	});

	it('never offers Claim collateral to the renter', () => {
		renderRow(RENTER, NOW + 5 * DAY_MS);
		expect(screen.getByTestId('rental-row-end')).toBeInTheDocument();
		expect(screen.queryByTestId('rental-row-claim')).not.toBeInTheDocument();
	});

	it('shows no actions for a listing still waiting for a renter', () => {
		renderRow(OWNER, NOW + 5 * DAY_MS, {
			...rental,
			status: 'listed',
			renter: null,
			expiresAtMs: null,
			graceEndsAtMs: null,
		});
		expect(screen.getByTestId('rental-row-status')).toHaveTextContent(
			'Waiting for a renter'
		);
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});
});
