import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import RagequitModal from '../RagequitModal';

describe('RagequitModal', () => {
	it('requires explicit acknowledgement of irreversibility before confirming', () => {
		const onConfirm = vi.fn();
		render(
			<RagequitModal
				isOpen={true}
				onClose={vi.fn()}
				proposalId="prop-1"
				maxKeys={40}
				payoutPerKeyXlm={5}
				onConfirm={onConfirm}
			/>
		);

		const confirmButton = screen.getByTestId('ragequit-confirm-button');
		// Button should be disabled initially
		expect(confirmButton).toBeDisabled();

		// Check the estimated payout display
		expect(screen.getByTestId('ragequit-estimated-payout')).toHaveTextContent('200.00 XLM');

		// Toggle acknowledgement checkbox
		const checkbox = screen.getByTestId('ragequit-ack-checkbox');
		fireEvent.click(checkbox);

		// Now confirm button is enabled
		expect(confirmButton).not.toBeDisabled();

		// Submit
		fireEvent.click(confirmButton);
		expect(onConfirm).toHaveBeenCalledWith(40);
	});

	it('updates estimated payout when user changes keys to burn', () => {
		render(
			<RagequitModal
				isOpen={true}
				onClose={vi.fn()}
				proposalId="prop-1"
				maxKeys={50}
				payoutPerKeyXlm={10}
				onConfirm={vi.fn()}
			/>
		);

		const input = screen.getByTestId('ragequit-keys-input');
		fireEvent.change(input, { target: { value: '20' } });

		expect(screen.getByTestId('ragequit-estimated-payout')).toHaveTextContent('200.00 XLM');
	});
});
