import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import toast from 'react-hot-toast';
import TipSentToast from '../TipSentToast';
import type { TipSentToastData } from '@/types/tip.types';

vi.mock('react-hot-toast', () => ({
	default: {
		dismiss: vi.fn(),
		custom: vi.fn(),
		remove: vi.fn(),
	},
}));

const mockTipData: TipSentToastData = {
	tipper: 'GBZXN7PIRZGNMHGA728R3AAX7A8K9R0P1Q2S3T4U5V6W7X8Y9Z0A1B2C',
	creatorName: 'Alice Dev',
	amount: 50,
	netAmount: 49,
	fee: 1,
	message: 'Keep on shipping!',
	txHash: '0x123abc',
};

describe('TipSentToast', () => {
	it('renders title, creator name, total sent, fee deduction, and net amount', () => {
		render(<TipSentToast toastId="tip-toast-1" data={mockTipData} />);

		expect(screen.getByTestId('tip-sent-toast')).toBeInTheDocument();
		expect(screen.getByText('Tip Sent!')).toBeInTheDocument();
		expect(screen.getByText('Alice Dev')).toBeInTheDocument();
		expect(screen.getByText('50.00 XLM')).toBeInTheDocument();
		expect(screen.getByText('-1.00 XLM')).toBeInTheDocument();
		expect(screen.getByText('49.00 XLM')).toBeInTheDocument();
		expect(screen.getByText(/Keep on shipping!/)).toBeInTheDocument();
	});

	it('dismisses when close button is clicked', () => {
		render(<TipSentToast toastId="tip-toast-1" data={mockTipData} />);

		const closeButton = screen.getByRole('button', { name: /dismiss notification/i });
		fireEvent.click(closeButton);

		expect(toast.dismiss).toHaveBeenCalledWith('tip-toast-1');
	});
});
