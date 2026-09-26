import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import SelfFreezeDialog from '@/components/common/SelfFreezeDialog';

describe('SelfFreezeDialog', () => {
	it('requires confirmation and submits the requested freeze amount', async () => {
		const user = userEvent.setup();
		const onConfirm = vi.fn();

		render(
			<SelfFreezeDialog
				open
				action="freeze"
				creatorName="Ada Creator"
				availableQuantity={12}
				onOpenChange={vi.fn()}
				onConfirm={onConfirm}
			/>
		);

		expect(screen.getByRole('dialog')).toHaveTextContent(
			'cannot be sold or transferred'
		);
		await user.clear(screen.getByTestId('self-freeze-amount'));
		await user.type(screen.getByTestId('self-freeze-amount'), '3');
		await user.click(screen.getByTestId('self-freeze-confirm'));

		expect(onConfirm).toHaveBeenCalledWith(3);
	});

	it('prevents freezing more than the liquid balance', async () => {
		const user = userEvent.setup();

		render(
			<SelfFreezeDialog
				open
				action="freeze"
				creatorName="Ada Creator"
				availableQuantity={2}
				onOpenChange={vi.fn()}
				onConfirm={vi.fn()}
			/>
		);

		const amount = screen.getByTestId('self-freeze-amount');
		await user.clear(amount);
		await user.type(amount, '3');

		expect(screen.getByRole('alert')).toHaveTextContent(
			"can't freeze more than your available balance"
		);
		expect(screen.getByTestId('self-freeze-confirm')).toBeDisabled();
	});
});
