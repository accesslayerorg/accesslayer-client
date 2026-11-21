import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useBundleBuyMutation } from '../useBundleBuy';
import { useBundleCartStore } from '@/hooks/useBundleCartStore';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';

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

const mockSubmit = vi.mocked(submitCreatorContractCall);

describe('useBundleBuyMutation (#1118)', () => {
	let queryClient: QueryClient;

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		window.sessionStorage.clear();
		useBundleCartStore.setState({ items: [] });
		mockSubmit.mockReset();
		mockSubmit.mockResolvedValue({ success: true as const });
	});

	afterEach(() => {
		queryClient.clear();
	});

	it('submits a bundle_buy contract call with every cart item', async () => {
		useBundleCartStore.setState({
			items: [
				{
					keyId: 'key-1',
					keyName: 'Alpha',
					priceStroops: 1_000_000,
					quantity: 2,
				},
				{
					keyId: 'key-2',
					keyName: 'Beta',
					priceStroops: 3_000_000,
					quantity: 1,
				},
			],
		});

		const { result } = renderHook(() => useBundleBuyMutation(), { wrapper });

		result.current.mutate();
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(mockSubmit).toHaveBeenCalledWith('bundle_buy', {
			items: [
				{ keyId: 'key-1', amount: 2 },
				{ keyId: 'key-2', amount: 1 },
			],
			totalCostStroops: 5_000_000,
		});
	});

	it('clears the cart after a successful submission', async () => {
		useBundleCartStore.setState({
			items: [
				{
					keyId: 'key-1',
					keyName: 'Alpha',
					priceStroops: 1_000_000,
					quantity: 1,
				},
			],
		});

		const { result } = renderHook(() => useBundleBuyMutation(), { wrapper });

		result.current.mutate();
		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(useBundleCartStore.getState().items).toEqual([]);
	});

	it('keeps the cart and surfaces an error when the submission fails', async () => {
		const failingItems = [
			{
				keyId: 'key-1',
				keyName: 'Alpha',
				priceStroops: 1_000_000,
				quantity: 1,
			},
		];
		useBundleCartStore.setState({ items: failingItems });
		mockSubmit.mockRejectedValueOnce(new Error('User rejected'));

		const { result } = renderHook(() => useBundleBuyMutation(), { wrapper });

		result.current.mutate();
		await waitFor(() => expect(result.current.isError).toBe(true));

		expect(useBundleCartStore.getState().items).toEqual(failingItems);
	});
});
