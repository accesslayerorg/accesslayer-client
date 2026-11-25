import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AllocateStakeModal from '../AllocateStakeModal';

describe('AllocateStakeModal', () => {
	it('slider and input never exceed the unallocated balance plus current stake', () => {
		const onAllocate = vi.fn();
		render(
			<AllocateStakeModal
				isOpen={true}
				onClose={vi.fn()}
				proposalId="conv-1"
				proposalTitle="Grants Program"
				currentStake={20}
				unallocatedBalance={80} // maxAllowed = 100
				onAllocate={onAllocate}
			/>
		);

		const slider = screen.getByTestId('modal-stake-slider') as HTMLInputElement;
		expect(slider.max).toBe('100');

		// Attempting to change slider beyond maxAllowed clamps it
		fireEvent.change(slider, { target: { value: '150' } });
		expect(slider.value).toBe('100');

		// Input also clamps
		const input = screen.getByTestId('modal-amount-input') as HTMLInputElement;
		fireEvent.change(input, { target: { value: '250' } });
		expect(input.value).toBe('100');
	});

	it('clicking max sets the amount to the maximum allowed stake', () => {
		const onAllocate = vi.fn();
		render(
			<AllocateStakeModal
				isOpen={true}
				onClose={vi.fn()}
				proposalId="conv-1"
				proposalTitle="Grants Program"
				currentStake={0}
				unallocatedBalance={120} // max = 120
				onAllocate={onAllocate}
			/>
		);

		const maxButton = screen.getByTestId('modal-max-button');
		fireEvent.click(maxButton);

		const input = screen.getByTestId('modal-amount-input') as HTMLInputElement;
		expect(input.value).toBe('120');

		const confirmButton = screen.getByTestId('modal-confirm-button');
		fireEvent.click(confirmButton);
		expect(onAllocate).toHaveBeenCalledWith(120);
	});
});
