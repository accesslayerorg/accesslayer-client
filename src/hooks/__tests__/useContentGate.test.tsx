import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import {
	useContentGateConfig,
	useSetContentGateMutation,
} from '@/hooks/useContentGate';
import {
	fetchContentGateConfig,
	setContentGate,
} from '@/services/contentGate.service';
import { queryKeys } from '@/lib/queryKeys';

const { showToastSuccess, showToastError } = vi.hoisted(() => ({
	showToastSuccess: vi.fn(),
	showToastError: vi.fn(),
}));

vi.mock('@/utils/toast.util', () => ({
	default: { success: showToastSuccess, error: showToastError },
}));

vi.mock('@/services/contentGate.service', () => ({
	fetchContentGateConfig: vi.fn(),
	setContentGate: vi.fn(),
}));

const KEY_ID = 'key-1';

describe('useContentGate (#1221)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		vi.clearAllMocks();

		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});

		vi.mocked(fetchContentGateConfig).mockResolvedValue({
			gateType: 'holder',
			thresholdAmount: null,
		});
		vi.mocked(setContentGate).mockResolvedValue({ success: true });
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('loads the current configuration on mount', async () => {
		const { result } = renderHook(() => useContentGateConfig(KEY_ID), {
			wrapper,
		});

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(fetchContentGateConfig).toHaveBeenCalledWith(KEY_ID);
		expect(result.current.config.gateType).toBe('holder');
	});

	it('submits the set_gate call and confirms with a toast', async () => {
		const { result } = renderHook(
			() => useSetContentGateMutation(KEY_ID, '0xAAA'),
			{ wrapper }
		);

		await act(async () => {
			await result.current.mutateAsync({
				gateType: 'threshold',
				thresholdAmount: 250,
			});
		});

		expect(setContentGate).toHaveBeenCalledWith(
			KEY_ID,
			{ gateType: 'threshold', thresholdAmount: 250 },
			'0xAAA'
		);
		expect(showToastSuccess).toHaveBeenCalledWith('Content gate updated');

		// The cached configuration reflects the new gate.
		expect(
			queryClient.getQueryData(queryKeys.creators.gateConfig(KEY_ID))
		).toEqual({ gateType: 'threshold', thresholdAmount: 250 });
	});

	it('surfaces a failed save', async () => {
		vi.mocked(setContentGate).mockRejectedValue(new Error('User rejected'));

		const { result } = renderHook(
			() => useSetContentGateMutation(KEY_ID, '0xAAA'),
			{ wrapper }
		);

		await act(async () => {
			await result.current
				.mutateAsync({ gateType: 'none', thresholdAmount: null })
				.catch(() => undefined);
		});

		expect(showToastError).toHaveBeenCalled();
		expect(showToastSuccess).not.toHaveBeenCalled();
	});
});
