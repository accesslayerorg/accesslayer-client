import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BuyCooldownPanel from '@/components/common/BuyCooldownPanel';

function setup(
	props: Partial<React.ComponentProps<typeof BuyCooldownPanel>> = {}
) {
	const onSubmit = vi.fn();
	render(<BuyCooldownPanel onSubmit={onSubmit} {...props} />);
	return { onSubmit };
}

describe('BuyCooldownPanel (#889)', () => {
	it('shows "No cooldown" with no cooldown data', () => {
		setup();
		expect(screen.getByTestId('buy-cooldown-display')).toHaveTextContent(
			'No cooldown'
		);
		expect((screen.getByTestId('buy-cooldown-input') as HTMLInputElement).value).toBe(
			'0'
		);
	});

	it('shows "No cooldown" when the stored ledger value is 0', () => {
		setup({ buyCooldownLedgers: 0 });
		expect(screen.getByTestId('buy-cooldown-display')).toHaveTextContent(
			'No cooldown'
		);
	});

	it('displays the current cooldown converted from ledgers to minutes', () => {
		setup({ buyCooldownLedgers: 120 });
		expect(screen.getByTestId('buy-cooldown-display')).toHaveTextContent('10 min');
		expect((screen.getByTestId('buy-cooldown-input') as HTMLInputElement).value).toBe(
			'10'
		);
	});

	it('pre-fills the input from a sub-minute ledger value as 0', () => {
		setup({ buyCooldownLedgers: 3 });
		expect(screen.getByTestId('buy-cooldown-display')).toHaveTextContent(
			'No cooldown'
		);
	});

	it('constrains the number input to 0–60 minutes', () => {
		setup();
		const input = screen.getByTestId('buy-cooldown-input') as HTMLInputElement;
		expect(input.min).toBe('0');
		expect(input.max).toBe('60');
	});

	it('validates input before submitting and shows an error', () => {
		const { onSubmit } = setup();

		fireEvent.change(screen.getByTestId('buy-cooldown-input'), {
			target: { value: '61' },
		});
		fireEvent.click(screen.getByTestId('buy-cooldown-submit'));

		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getByTestId('buy-cooldown-error')).toBeInTheDocument();
	});

	it('submits minutes converted to ledger units when valid', () => {
		const { onSubmit } = setup();

		fireEvent.change(screen.getByTestId('buy-cooldown-input'), {
			target: { value: '5' },
		});
		fireEvent.click(screen.getByTestId('buy-cooldown-submit'));

		expect(onSubmit).toHaveBeenCalledWith(60);
	});

	it('submits 0 ledgers for "No cooldown"', () => {
		const { onSubmit } = setup({ buyCooldownLedgers: 120 });

		fireEvent.change(screen.getByTestId('buy-cooldown-input'), {
			target: { value: '0' },
		});
		fireEvent.click(screen.getByTestId('buy-cooldown-submit'));

		expect(onSubmit).toHaveBeenCalledWith(0);
	});

	it('shows a submitting state on the button', () => {
		setup({ isSubmitting: true });
		expect(screen.getByTestId('buy-cooldown-submit')).toHaveTextContent(
			'Submitting…'
		);
		expect(screen.getByTestId('buy-cooldown-submit')).toBeDisabled();
	});
});