import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import ListRentalModal from '../ListRentalModal';

const keys = [
	{ keyId: 'key-a', keyName: 'Alpha', availableBalance: 2 },
	{ keyId: 'key-b', keyName: 'Beta', availableBalance: 5 },
];

function renderModal(onConfirm = vi.fn().mockResolvedValue(undefined)) {
	render(
		<ListRentalModal
			open
			onOpenChange={vi.fn()}
			keys={keys}
			defaultKeyId="key-b"
			onConfirm={onConfirm}
		/>
	);
	return { onConfirm };
}

async function fill(
	user: ReturnType<typeof userEvent.setup>,
	values: Record<string, string>
) {
	for (const [testId, value] of Object.entries(values)) {
		const input = screen.getByTestId(testId);
		await user.clear(input);
		await user.type(input, value);
	}
}

describe('ListRentalModal', () => {
	it('preselects the requested key and shows its available balance', () => {
		renderModal();
		expect(screen.getByTestId('list-rental-key')).toHaveValue('key-b');
		expect(screen.getByTestId('list-rental-available')).toHaveTextContent(
			'5 available to list'
		);
	});

	it('explains that listed keys cannot be sold or transferred', () => {
		renderModal();
		expect(screen.getByTestId('list-rental-escrow-note')).toHaveTextContent(
			'cannot be sold or transferred while they are listed or rented out'
		);
	});

	it('blocks listing more keys than the balance allows', async () => {
		const user = userEvent.setup();
		const { onConfirm } = renderModal();

		await user.selectOptions(screen.getByTestId('list-rental-key'), 'key-a');
		await fill(user, {
			'list-rental-quantity': '3',
			'list-rental-fee': '0.5',
		});
		await user.click(screen.getByTestId('list-rental-confirm'));

		expect(
			screen.getByTestId('list-rental-quantity-error')
		).toHaveTextContent('You can list at most 2 keys.');
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('submits the listing in stroops for the selected key', async () => {
		const user = userEvent.setup();
		const { onConfirm } = renderModal();

		await fill(user, {
			'list-rental-quantity': '4',
			'list-rental-fee': '0.25',
			'list-rental-max-days': '14',
			'list-rental-collateral': '12.5',
		});
		await user.click(screen.getByTestId('list-rental-confirm'));

		expect(onConfirm).toHaveBeenCalledWith({
			keyId: 'key-b',
			quantity: 4,
			feePerDayStroops: 2_500_000n,
			maxDays: 14,
			collateralStroops: 125_000_000n,
		});
	});

	it('tells holders with nothing to list', () => {
		render(
			<ListRentalModal
				open
				onOpenChange={vi.fn()}
				keys={[]}
				onConfirm={vi.fn()}
			/>
		);
		expect(screen.getByTestId('list-rental-no-keys')).toBeInTheDocument();
	});
});
