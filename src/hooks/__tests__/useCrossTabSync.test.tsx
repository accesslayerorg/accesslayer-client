import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi, type MockInstance } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCrossTabSync } from '@/hooks/useCrossTabSync';
import { getTabId, CROSS_TAB_STORAGE_KEY } from '@/utils/crossTabSync.utils';
import { usePendingTxStore } from '@/hooks/usePendingTxStore';
import showToast from '@/utils/toast.util';

const { wallet, wagmiMocks } = vi.hoisted(() => ({
	wallet: {
		address: '0xabc' as string | undefined,
		isConnected: true,
		chainId: 1 as number | undefined,
	},
	wagmiMocks: {
		disconnect: vi.fn(),
		connect: vi.fn(),
		switchChain: vi.fn(),
	},
}));

vi.mock('wagmi', () => ({
	useAccount: () => ({ address: wallet.address, isConnected: wallet.isConnected }),
	useChainId: () => wallet.chainId,
	useDisconnect: () => ({ disconnect: wagmiMocks.disconnect }),
	useConnect: () => ({ connect: wagmiMocks.connect }),
	useSwitchChain: () => ({ switchChain: wagmiMocks.switchChain }),
}));
vi.mock('wagmi/connectors', () => ({ injected: () => ({ id: 'mocked-injected' }) }));
vi.mock('@/utils/toast.util', () => ({
	default: { message: vi.fn(), success: vi.fn(), error: vi.fn() },
}));
vi.mock('@/utils/crossTabSync.utils', async importOriginal => {
	const actual = await importOriginal<
		typeof import('@/utils/crossTabSync.utils')
	>();
	return { ...actual, getTabId: vi.fn(() => 'msg-1') };
});

class MockBroadcastChannel {
	static instances: MockBroadcastChannel[] = [];
	onmessage: ((event: { data: unknown }) => void) | null = null;
	postMessage = vi.fn();
	close = vi.fn();

	constructor(public name: string) {
		MockBroadcastChannel.instances.push(this);
	}

	emit(data: unknown) {
		this.onmessage?.({ data });
	}
}

const message = (
	overrides: Partial<{
		id: string;
		tabId: string;
		type: 'connect' | 'disconnect' | 'account_change' | 'network_change';
		address: string | null;
		chainId: number | null;
		timestamp: number;
	}> = {}
) => ({
	id: 'incoming-1',
	tabId: 'other-tab',
	type: 'account_change' as const,
	address: '0xdef',
	chainId: 1,
	timestamp: Date.now(),
	...overrides,
});

describe('useCrossTabSync (#1412)', () => {
	let client: QueryClient;
	let invalidateSpy: MockInstance;

	beforeEach(() => {
		vi.clearAllMocks();
		MockBroadcastChannel.instances = [];
		vi.stubGlobal('BroadcastChannel', MockBroadcastChannel);
		window.localStorage.clear();
		usePendingTxStore.getState().clearAll();
		wallet.address = '0xabc';
		wallet.isConnected = true;
		wallet.chainId = 1;
		client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		invalidateSpy = vi.spyOn(client, 'invalidateQueries');
		vi.mocked(getTabId).mockReset();
		vi.mocked(getTabId).mockReturnValue('msg-1');
	});

	const wrapper = ({ children }: { children: React.ReactNode }) =>
		React.createElement(QueryClientProvider, { client }, children);

	it('broadcasts wallet changes after debouncing and writes the storage fallback', async () => {
		vi.mocked(getTabId).mockReturnValueOnce('tab-1');
		const { rerender } = renderHook(() => useCrossTabSync(), { wrapper });
		const channel = MockBroadcastChannel.instances[0];
		expect(channel.name).toBe('accesslayer:session-sync');

		wallet.address = '0xdef';
		rerender();

		await waitFor(() => expect(channel.postMessage).toHaveBeenCalledOnce());
		const published = channel.postMessage.mock.calls[0][0];
		expect(published).toMatchObject({
			tabId: 'tab-1',
			type: 'account_change',
			address: '0xdef',
			chainId: 1,
		});
		expect(
			window.localStorage.getItem(CROSS_TAB_STORAGE_KEY)
		).toContain('0xdef');
	});

	it('ignores messages from the same tab and processes wallet changes from others', () => {
		vi.mocked(getTabId).mockReturnValueOnce('tab-1');
		renderHook(() => useCrossTabSync(), { wrapper });
		const channel = MockBroadcastChannel.instances[0];

		act(() => channel.emit(message({ tabId: 'tab-1', id: 'same-tab' })));
		expect(invalidateSpy).not.toHaveBeenCalled();

		usePendingTxStore.getState().addPendingTransaction({
			hash: 'hash-1',
			type: 'buy',
		});
		act(() => channel.emit(message({ id: 'other-1' })));

		expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['wallet'] });
		expect(usePendingTxStore.getState().transactions).toEqual([]);
		expect(wagmiMocks.disconnect).toHaveBeenCalled();
		expect(wagmiMocks.connect).toHaveBeenCalled();
	});

	it('handles network changes via the localStorage fallback', () => {
		vi.mocked(getTabId).mockReturnValueOnce('tab-1');
		renderHook(() => useCrossTabSync(), { wrapper });

		act(() => {
			window.dispatchEvent(
				new StorageEvent('storage', {
					key: CROSS_TAB_STORAGE_KEY,
					newValue: JSON.stringify(
						message({
							id: 'storage-1',
							type: 'network_change',
							address: '0xabc',
							chainId: 137,
						})
					),
				})
			);
		});

		expect(wagmiMocks.switchChain).toHaveBeenCalledWith({ chainId: 137 });
	});

	it('toasts in background tabs when another tab changes account', () => {
		vi.mocked(getTabId).mockReturnValueOnce('tab-1');
		Object.defineProperty(document, 'visibilityState', {
			configurable: true,
			get: () => 'hidden',
		});
		renderHook(() => useCrossTabSync(), { wrapper });
		const channel = MockBroadcastChannel.instances[0];

		act(() => channel.emit(message({ id: 'bg-1' })));
		expect(showToast.message).toHaveBeenCalledWith(
			expect.stringContaining('Account changed in another tab')
		);
		Object.defineProperty(document, 'visibilityState', {
			configurable: true,
			get: () => 'visible',
		});
	});
});
