import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useBatchSwapMutation } from '../useBatchSwap';
import { useBatchTradeStore } from '@/hooks/useBatchTradeStore';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';
import * as batchSwapToastModule from '@/utils/batchSwapToast';

vi.mock('@/hooks/useCreatorContractActions', () => ({
	submitCreatorContractCall: vi.fn(),
}));

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		message: vi.fn(),
	},
}));

vi.mock('@/utils/batchSwapToast', () => ({
	showBatchSwapExecutedToast: vi.fn(),
}));

const mockSubmit = vi.mocked(submitCreatorContractCall);
const mockShowToast = vi.mocked(batchSwapToastModule.showBatchSwapExecutedToast);

describe('useBatchSwapMutation (#1155)', () => {
	let queryClient: QueryClient;

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		window.sessionStorage.clear();
		useBatchTradeStore.setState({ items: [], isOpen: true });
		mockSubmit.mockReset();
		mockShowToast.mockReset();
		mockSubmit.mockResolvedValue({ success: true as const });
	});

	afterEach(() => {
		queryClient.clear();
	});

	it('submits a batch_swap contract call with every queued item', async () => {
		useBatchTradeStore.setState({
			items: [
				{
					keyId: 'key-1',
					keyName: 'Alpha Key',
					priceStroops: 10_000_000,
					amount: 2,
					direction: 'buy',
					slippageTolerance: 1,
					currentSupply: 50,
				},
				{
					keyId: 'key-2',
					keyName: 'Beta Key',
					priceStroops: 20_000_000,
					amount: 1,
					direction: 'sell',
					slippageTolerance: 2.5,
					currentSupply: 100,
				},
			],
		});

		const { result } = renderHook(() => useBatchSwapMutation(), { wrapper });

		result.current.mutate();

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		// Verify submitCreatorContractCall was invoked with 'batch_swap'
		expect(mockSubmit).toHaveBeenCalledOnce();
		const [functionName, payload] = mockSubmit.mock.calls[0] as [
			string,
			{ items: Array<{ keyId: string; direction: string; amount: number; slippageTolerance: number }> }
		];
		expect(functionName).toBe('batch_swap');
		expect(payload.items).toHaveLength(2);
		expect(payload.items[0]).toEqual(
			expect.objectContaining({
				keyId: 'key-1',
				direction: 'buy',
				amount: 2,
				slippageTolerance: 1,
			})
		);
		expect(payload.items[1]).toEqual(
			expect.objectContaining({
				keyId: 'key-2',
				direction: 'sell',
				amount: 1,
				slippageTolerance: 2.5,
			})
		);

		// Store cleared & drawer closed
		expect(useBatchTradeStore.getState().items).toEqual([]);
		expect(useBatchTradeStore.getState().isOpen).toBe(false);

		// BatchSwapExecuted toast displayed with per-item summary
		expect(mockShowToast).toHaveBeenCalledOnce();
		const toastReceipt = mockShowToast.mock.calls[0][0];
		expect(toastReceipt.success).toBe(true);
		expect(toastReceipt.items).toHaveLength(2);
		expect(toastReceipt.items[0]).toEqual(
			expect.objectContaining({
				keyId: 'key-1',
				keyName: 'Alpha Key',
				direction: 'buy',
				amount: 2,
			})
		);
		expect(toastReceipt.items[1]).toEqual(
			expect.objectContaining({
				keyId: 'key-2',
				keyName: 'Beta Key',
				direction: 'sell',
				amount: 1,
			})
		);
	});

	it('leaves cart untouched if the batch_swap contract call rejects', async () => {
		const failingItems = [
			{
				keyId: 'key-1',
				keyName: 'Alpha Key',
				priceStroops: 10_000_000,
				amount: 1,
				direction: 'buy' as const,
				slippageTolerance: 1,
			},
		];
		useBatchTradeStore.setState({ items: failingItems });
		mockSubmit.mockRejectedValue(new Error('User rejected signature'));

		const { result } = renderHook(() => useBatchSwapMutation(), { wrapper });

		result.current.mutate();

		await waitFor(() => expect(result.current.isError).toBe(true));
		expect(useBatchTradeStore.getState().items).toEqual(failingItems);
		expect(mockShowToast).not.toHaveBeenCalled();
	});
});
