import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useSellableNow } from '@/hooks/useSellableNow';
import { creatorKeysContractService } from '@/services/creatorKeysContract.service';

vi.mock('@/services/creatorKeysContract.service', () => ({
	creatorKeysContractService: {
		getSellableBalance: vi.fn(),
	},
}));

vi.mock('@/lib/queryKeys', () => ({
	queryKeys: {
		wallet: {
			sellableNow: (wallet: string, keyId: string) => ['wallet', wallet, 'sellableNow', keyId],
		},
	},
}));

const createWrapper = () => {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
				gcTime: 0,
			},
		},
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
};

describe('useSellableNow (#1354)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns sellable balance and locked balance when partially locked', async () => {
		vi.mocked(creatorKeysContractService.getSellableBalance).mockResolvedValue({
			totalBalance: 100,
			sellableNow: 60,
			isExempt: false,
			nextLedgerCloseEstimate: Date.now() + 5000,
		});

		const { result } = renderHook(
			() => useSellableNow('wallet1', 'key1'),
			{ wrapper: createWrapper() }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.totalBalance).toBe(100);
		expect(result.current.sellableNow).toBe(60);
		expect(result.current.lockedBalance).toBe(40);
		expect(result.current.isFullySellable).toBe(false);
		expect(result.current.isFullyLocked).toBe(false);
		expect(result.current.isExempt).toBe(false);
	});

	it('returns fully sellable when sellableNow equals totalBalance', async () => {
		vi.mocked(creatorKeysContractService.getSellableBalance).mockResolvedValue({
			totalBalance: 100,
			sellableNow: 100,
			isExempt: false,
			nextLedgerCloseEstimate: Date.now() + 5000,
		});

		const { result } = renderHook(
			() => useSellableNow('wallet1', 'key1'),
			{ wrapper: createWrapper() }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.totalBalance).toBe(100);
		expect(result.current.sellableNow).toBe(100);
		expect(result.current.lockedBalance).toBe(0);
		expect(result.current.isFullySellable).toBe(true);
		expect(result.current.isFullyLocked).toBe(false);
	});

	it('returns fully locked when sellableNow is zero and not exempt', async () => {
		vi.mocked(creatorKeysContractService.getSellableBalance).mockResolvedValue({
			totalBalance: 100,
			sellableNow: 0,
			isExempt: false,
			nextLedgerCloseEstimate: Date.now() + 5000,
		});

		const { result } = renderHook(
			() => useSellableNow('wallet1', 'key1'),
			{ wrapper: createWrapper() }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.totalBalance).toBe(100);
		expect(result.current.sellableNow).toBe(0);
		expect(result.current.lockedBalance).toBe(100);
		expect(result.current.isFullySellable).toBe(false);
		expect(result.current.isFullyLocked).toBe(true);
	});

	it('returns exempt wallet with no restrictions', async () => {
		vi.mocked(creatorKeysContractService.getSellableBalance).mockResolvedValue({
			totalBalance: 100,
			sellableNow: 100,
			isExempt: true,
			nextLedgerCloseEstimate: Date.now() + 5000,
		});

		const { result } = renderHook(
			() => useSellableNow('wallet1', 'key1'),
			{ wrapper: createWrapper() }
		);

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.isExempt).toBe(true);
		expect(result.current.isFullySellable).toBe(true);
		expect(result.current.isFullyLocked).toBe(false);
	});

	it('returns zero balances when wallet or keyId is not provided', () => {
		const { result } = renderHook(
			() => useSellableNow(undefined, 'key1'),
			{ wrapper: createWrapper() }
		);

		expect(result.current.totalBalance).toBe(0);
		expect(result.current.sellableNow).toBe(0);
		expect(result.current.isLoading).toBe(false);
	});
});