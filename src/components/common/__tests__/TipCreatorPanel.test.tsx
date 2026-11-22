import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import TipCreatorPanel from '../TipCreatorPanel';
import { tipService } from '@/services/tip.service';
import { creatorKeysContractService } from '@/services/creatorKeysContract.service';
import * as tipToastModule from '@/utils/tipToast';

vi.mock('@/services/tip.service', () => ({
	tipService: {
		uploadTipMessage: vi.fn(),
		getRecentTips: vi.fn(),
		recordTip: vi.fn(),
	},
}));

vi.mock('@/services/creatorKeysContract.service', () => ({
	creatorKeysContractService: {
		send_tip: vi.fn(),
	},
}));

vi.mock('@/hooks/useCreatorContractActions', () => ({
	submitCreatorContractCall: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('@/utils/tipToast', () => ({
	showTipSentToast: vi.fn(),
}));

function renderWithClient(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('TipCreatorPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(tipService.uploadTipMessage).mockResolvedValue('bafkreibodyhash123');
		vi.mocked(creatorKeysContractService.send_tip).mockResolvedValue({
			success: true,
			hash: '0xtesttxhash456',
		});
	});

	it('renders panel with amount input, message textarea, summary, and presets', () => {
		renderWithClient(
			<TipCreatorPanel
				creatorId="creator-1"
				creatorName="Alice"
				isHolder={true}
				userAddress="GBZXN7PIRZGNMHGA728R3AAX7A8K9R0P1Q2S3T4U5V6W7X8Y9Z0A1B2C"
			/>
		);

		expect(screen.getByTestId('tip-creator-panel')).toBeInTheDocument();
		expect(screen.getByTestId('tip-amount-input')).toBeInTheDocument();
		expect(screen.getByTestId('tip-message-input')).toBeInTheDocument();
		expect(screen.getByTestId('tip-char-counter')).toHaveTextContent('0/280');
		expect(screen.getByTestId('tip-summary')).toBeInTheDocument();
		expect(screen.getByTestId('send-tip-button')).toBeInTheDocument();
	});

	it('computes and displays 2% fee deduction correctly in summary', async () => {
		renderWithClient(
			<TipCreatorPanel
				creatorId="creator-1"
				creatorName="Alice"
				isHolder={true}
				userAddress="GBZXN7PIRZGNMHGA728R3AAX7A8K9R0P1Q2S3T4U5V6W7X8Y9Z0A1B2C"
			/>
		);

		const amountInput = screen.getByTestId('tip-amount-input');

		// Enter 100 XLM
		fireEvent.change(amountInput, { target: { value: '100' } });

		expect(screen.getByTestId('tip-amount-display')).toHaveTextContent('100.00 XLM');
		expect(screen.getByTestId('tip-fee-display')).toHaveTextContent('-2.00 XLM');
		expect(screen.getByTestId('tip-net-display')).toHaveTextContent('98.00 XLM');

		// Enter 10 XLM
		fireEvent.change(amountInput, { target: { value: '10' } });

		expect(screen.getByTestId('tip-amount-display')).toHaveTextContent('10.00 XLM');
		expect(screen.getByTestId('tip-fee-display')).toHaveTextContent('-0.20 XLM');
		expect(screen.getByTestId('tip-net-display')).toHaveTextContent('9.80 XLM');
	});

	it('updates live character counter as user types and blocks submit when > 280 chars', async () => {
		renderWithClient(
			<TipCreatorPanel
				creatorId="creator-1"
				creatorName="Alice"
				isHolder={true}
				userAddress="GBZXN7PIRZGNMHGA728R3AAX7A8K9R0P1Q2S3T4U5V6W7X8Y9Z0A1B2C"
			/>
		);

		const amountInput = screen.getByTestId('tip-amount-input');
		const messageInput = screen.getByTestId('tip-message-input');
		const sendButton = screen.getByTestId('send-tip-button');

		fireEvent.change(amountInput, { target: { value: '10' } });
		expect(sendButton).not.toBeDisabled();

		// Type 20 characters
		fireEvent.change(messageInput, { target: { value: 'Thanks for everything' } });
		expect(screen.getByTestId('tip-char-counter')).toHaveTextContent('21/280');
		expect(sendButton).not.toBeDisabled();

		// Type message over 280 characters
		const longMessage = 'A'.repeat(281);
		fireEvent.change(messageInput, { target: { value: longMessage } });

		expect(screen.getByTestId('tip-char-counter')).toHaveTextContent('281/280');
		expect(screen.getByTestId('tip-char-limit-error')).toBeInTheDocument();
		expect(sendButton).toBeDisabled();
	});

	it('blocks non-holders from tipping and shows holder-exclusive notice', () => {
		renderWithClient(
			<TipCreatorPanel
				creatorId="creator-1"
				creatorName="Alice"
				isHolder={false}
			/>
		);

		expect(screen.getByTestId('tip-holder-restriction')).toBeInTheDocument();
		expect(screen.getByTestId('tip-non-holder-badge')).toHaveTextContent('Holders Only');

		const sendButton = screen.getByTestId('send-tip-button');
		expect(sendButton).toBeDisabled();
		expect(sendButton).toHaveTextContent('Holders Only');

		const amountInput = screen.getByTestId('tip-amount-input');
		expect(amountInput).toBeDisabled();
	});

	it('clicking preset amount button updates amount and summary', () => {
		renderWithClient(
			<TipCreatorPanel
				creatorId="creator-1"
				creatorName="Alice"
				isHolder={true}
			/>
		);

		const preset25 = screen.getByTestId('tip-preset-25');
		fireEvent.click(preset25);

		expect(screen.getByTestId('tip-amount-input')).toHaveValue(25);
		expect(screen.getByTestId('tip-amount-display')).toHaveTextContent('25.00 XLM');
		expect(screen.getByTestId('tip-fee-display')).toHaveTextContent('-0.50 XLM');
		expect(screen.getByTestId('tip-net-display')).toHaveTextContent('24.50 XLM');
	});

	it('submits correct contract call with amount and IPFS message hash and fires TipSent toast', async () => {
		renderWithClient(
			<TipCreatorPanel
				creatorId="creator-1"
				creatorName="Alice Dev"
				isHolder={true}
				userAddress="GBZXN7PIRZGNMHGA728R3AAX7A8K9R0P1Q2S3T4U5V6W7X8Y9Z0A1B2C"
			/>
		);

		const amountInput = screen.getByTestId('tip-amount-input');
		const messageInput = screen.getByTestId('tip-message-input');
		const sendButton = screen.getByTestId('send-tip-button');

		fireEvent.change(amountInput, { target: { value: '25' } });
		fireEvent.change(messageInput, { target: { value: 'Great job!' } });

		fireEvent.click(sendButton);

		await waitFor(() => {
			expect(tipService.uploadTipMessage).toHaveBeenCalledWith('Great job!');
		});

		await waitFor(() => {
			expect(creatorKeysContractService.send_tip).toHaveBeenCalledWith({
				creatorId: 'creator-1',
				amount: 25,
				messageHash: 'bafkreibodyhash123',
			});
		});

		await waitFor(() => {
			expect(tipToastModule.showTipSentToast).toHaveBeenCalledWith(
				expect.objectContaining({
					creatorName: 'Alice Dev',
					amount: 25,
					netAmount: 24.5,
					message: 'Great job!',
				})
			);
		});

		// Inputs should reset on successful submission
		await waitFor(() => {
			expect(screen.getByTestId('tip-amount-input')).toHaveValue(null);
			expect(screen.getByTestId('tip-message-input')).toHaveValue('');
		});
	});
});
