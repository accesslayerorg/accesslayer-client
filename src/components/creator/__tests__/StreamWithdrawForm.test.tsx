import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import StreamWithdrawForm from '../StreamWithdrawForm';

describe('StreamWithdrawForm', () => {
	it('blocks withdrawing above claimable balance inline and disables submit', () => {
		const onWithdraw = vi.fn();
		render(
			<StreamWithdrawForm
				streamId="stream-1"
				claimableBalance={50.0}
				onWithdraw={onWithdraw}
			/>
		);

		const input = screen.getByTestId('stream-withdraw-input');
		const submitButton = screen.getByTestId('stream-withdraw-submit');

		// Enter amount exceeding claimable balance (60 > 50)
		fireEvent.change(input, { target: { value: '60' } });

		// Error message displayed inline (#acceptance criteria)
		expect(screen.getByTestId('withdraw-exceed-error')).toBeInTheDocument();
		expect(screen.getByTestId('withdraw-exceed-error')).toHaveTextContent(
			'Amount exceeds claimable balance of 50.0000 XLM.'
		);

		// Button is disabled
		expect(submitButton).toBeDisabled();

		// Enter valid amount within claimable balance
		fireEvent.change(input, { target: { value: '40' } });
		expect(screen.queryByTestId('withdraw-exceed-error')).toBeNull();
		expect(submitButton).not.toBeDisabled();
	});

	it('displays fee preview with protocol fee and net payout', () => {
		render(
			<StreamWithdrawForm
				streamId="stream-1"
				claimableBalance={100.0}
				onWithdraw={vi.fn()}
			/>
		);

		const input = screen.getByTestId('stream-withdraw-input');
		fireEvent.change(input, { target: { value: '100' } });

		expect(screen.getByTestId('withdraw-fee-preview')).toBeInTheDocument();
		// 0.5% of 100 = 0.5 XLM fee, net = 99.5 XLM
		expect(screen.getByTestId('withdraw-fee-preview')).toHaveTextContent('0.5000 XLM');
		expect(screen.getByTestId('withdraw-net-payout')).toHaveTextContent('99.5000 XLM');
	});

	it('clicking max sets amount to claimable balance', () => {
		render(
			<StreamWithdrawForm
				streamId="stream-1"
				claimableBalance={75.5}
				onWithdraw={vi.fn()}
			/>
		);

		const maxBtn = screen.getByTestId('withdraw-max-button');
		fireEvent.click(maxBtn);

		const input = screen.getByTestId('stream-withdraw-input') as HTMLInputElement;
		expect(input.value).toBe('75.5');
	});
});
