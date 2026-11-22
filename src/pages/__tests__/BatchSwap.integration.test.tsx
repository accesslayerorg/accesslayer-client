import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { MemoryRouter } from 'react-router';
import RootLayout from '@/components/common/RootLayout';
import { AddToBatchButton } from '@/components/common/AddToBatchButton';
import { useBatchTradeStore } from '@/hooks/useBatchTradeStore';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';
import * as batchSwapToastModule from '@/utils/batchSwapToast';

vi.mock('@/hooks/useCreatorContractActions', () => ({
	submitCreatorContractCall: vi.fn(),
}));

vi.mock('@/utils/batchSwapToast', async importOriginal => {
	const actual = await importOriginal<typeof import('@/utils/batchSwapToast')>();
	return {
		...actual,
		showBatchSwapExecutedToast: vi.fn(actual.showBatchSwapExecutedToast),
	};
});

const mockSubmit = vi.mocked(submitCreatorContractCall);
const mockShowToast = vi.mocked(batchSwapToastModule.showBatchSwapExecutedToast);

describe('Batch Swap End-to-End Integration Flow (#1155)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		window.sessionStorage.clear();
		useBatchTradeStore.setState({ items: [], isOpen: false });
		mockSubmit.mockReset();
		mockShowToast.mockReset();
		mockSubmit.mockResolvedValue({ success: true as const });
	});

	it('completes the entire batch swap workflow across cards, drawer, slippage, and execution', async () => {
		const user = userEvent.setup();

		// Render RootLayout with test AddToBatchButtons simulating keys on discovery/key detail
		render(
			<QueryClientProvider client={queryClient}>
				<MemoryRouter initialEntries={['/']}>
					<div>
						{/* Key 1: Buy order */}
						<AddToBatchButton
							keyId="key-alpha"
							keyName="Alpha Key"
							priceStroops={10_000_000} // 1 XLM
							currentSupply={50}
							defaultAmount={2}
							defaultDirection="buy"
						/>

						{/* Key 2: Sell order */}
						<AddToBatchButton
							keyId="key-beta"
							keyName="Beta Key"
							priceStroops={20_000_000} // 2 XLM
							currentSupply={100}
							defaultAmount={1}
							defaultDirection="sell"
						/>
					</div>
					<RootLayout />
				</MemoryRouter>
			</QueryClientProvider>
		);

		const addButtons = screen.getAllByTestId('add-to-batch-button');
		expect(addButtons).toHaveLength(2);

		// 1. Queue both keys into the batch trade
		await user.click(addButtons[0]);
		expect(useBatchTradeStore.getState().items).toHaveLength(1);

		await user.click(addButtons[1]);
		expect(useBatchTradeStore.getState().items).toHaveLength(2);

		// 2. Open Batch Trade drawer via trigger
		const drawerTrigger = screen.getByTestId('batch-trade-trigger');
		await user.click(drawerTrigger);

		// Verify drawer opens
		expect(
			screen.getByRole('dialog', { name: /batch trade/i })
		).toBeInTheDocument();

		// 3. Verify items in drawer with per-item slippage and amounts
		const items = screen.getAllByTestId('batch-trade-item');
		expect(items).toHaveLength(2);

		// Per-item slippage controls exist and can update
		const slippageInputs = screen.getAllByTestId('batch-item-slippage');
		expect(slippageInputs).toHaveLength(2);

		// 4. Update slippage on first item (preset or custom input)
		const presetButtons = screen.getAllByRole('button', { name: '2%' });
		await user.click(presetButtons[0]);
		expect(useBatchTradeStore.getState().items[0].slippageTolerance).toBe(2);

		// 5. Total cost and impact summary are calculated and displayed
		const totalCost = screen.getByTestId('batch-total-cost');
		expect(totalCost).toBeInTheDocument();
		expect(totalCost.textContent).not.toBe('—');

		const priceImpact = screen.getByTestId('batch-price-impact');
		expect(priceImpact).toBeInTheDocument();

		// 6. Submit Batch triggers batch_swap contract call
		const submitButton = screen.getByTestId('batch-submit-button');
		await user.click(submitButton);

		await waitFor(() => {
			expect(mockSubmit).toHaveBeenCalledOnce();
		});

		// Verify contract call parameters
		const [functionName, payload] = mockSubmit.mock.calls[0] as [
			string,
			{ items: Array<{ keyId: string; direction: string; amount: number; slippageTolerance: number }>; totalCostStroops: number }
		];
		expect(functionName).toBe('batch_swap');
		expect(payload.items).toHaveLength(2);
		expect(payload.items[0]).toEqual(
			expect.objectContaining({
				keyId: 'key-alpha',
				direction: 'buy',
				amount: 2,
				slippageTolerance: 2,
			})
		);
		expect(payload.items[1]).toEqual(
			expect.objectContaining({
				keyId: 'key-beta',
				direction: 'sell',
				amount: 1,
			})
		);

		// 7. Verify BatchSwapExecuted toast was triggered with per-item summary
		await waitFor(() => {
			expect(mockShowToast).toHaveBeenCalledOnce();
		});

		const receipt = mockShowToast.mock.calls[0][0];
		expect(receipt.success).toBe(true);
		expect(receipt.items).toEqual([
			expect.objectContaining({
				keyId: 'key-alpha',
				keyName: 'Alpha Key',
				direction: 'buy',
				amount: 2,
			}),
			expect.objectContaining({
				keyId: 'key-beta',
				keyName: 'Beta Key',
				direction: 'sell',
				amount: 1,
			}),
		]);

		// Batch store is cleared after execution
		expect(useBatchTradeStore.getState().items).toEqual([]);
	});
});
