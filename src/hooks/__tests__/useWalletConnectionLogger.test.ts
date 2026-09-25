/**
 * Unit tests for the structured wallet-connection debug log (#599).
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAccount } from 'wagmi';
import { useWalletConnectionLogger } from '@/hooks/useWalletConnectionLogger';

vi.mock('wagmi', () => ({
	useAccount: vi.fn(),
}));

const mockUseAccount = vi.mocked(useAccount);

const FULL_ADDRESS = '0x1234567890abcdef1234567890abcdef12345678';
const SECOND_ADDRESS = '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd';

function mockAccount(overrides: Partial<ReturnType<typeof useAccount>> = {}) {
	mockUseAccount.mockReturnValue({
		address: undefined,
		isConnected: false,
		connector: undefined,
		...overrides,
	} as ReturnType<typeof useAccount>);
}

describe('useWalletConnectionLogger (#599)', () => {
	let debugSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		vi.clearAllMocks();
		debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => {});
	});

	it('emits a structured debug log with all three fields on a successful connection', () => {
		mockAccount({
			address: FULL_ADDRESS,
			isConnected: true,
			connector: { id: 'injected', name: 'MetaMask' } as ReturnType<
				typeof useAccount
			>['connector'],
		});

		renderHook(() => useWalletConnectionLogger({ isTestEnv: false }));

		expect(debugSpy).toHaveBeenCalledTimes(1);
		expect(debugSpy).toHaveBeenCalledWith(
			'[wallet-connection]',
			expect.objectContaining({
				truncated_address: '0x12...5678',
				connection_method: 'MetaMask',
				connected_at: expect.stringMatching(
					/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/
				),
			})
		);
	});

	it('never includes the full wallet address under any field name', () => {
		mockAccount({
			address: FULL_ADDRESS,
			isConnected: true,
			connector: { id: 'injected', name: 'Injected' } as ReturnType<
				typeof useAccount
			>['connector'],
		});

		renderHook(() => useWalletConnectionLogger({ isTestEnv: false }));

		const [, log] = debugSpy.mock.calls[0];
		expect(JSON.stringify(log)).not.toContain(FULL_ADDRESS);
	});

	it('falls back to the connector id when no name is available', () => {
		mockAccount({
			address: FULL_ADDRESS,
			isConnected: true,
			connector: { id: 'albedo' } as ReturnType<typeof useAccount>['connector'],
		});

		renderHook(() => useWalletConnectionLogger({ isTestEnv: false }));

		expect(debugSpy).toHaveBeenCalledWith(
			'[wallet-connection]',
			expect.objectContaining({ connection_method: 'albedo' })
		);
	});

	it('falls back to "unknown" when there is no connector at all', () => {
		mockAccount({ address: FULL_ADDRESS, isConnected: true, connector: undefined });

		renderHook(() => useWalletConnectionLogger({ isTestEnv: false }));

		expect(debugSpy).toHaveBeenCalledWith(
			'[wallet-connection]',
			expect.objectContaining({ connection_method: 'unknown' })
		);
	});

	it('does not emit when the wallet is not connected', () => {
		mockAccount({ address: undefined, isConnected: false });

		renderHook(() => useWalletConnectionLogger({ isTestEnv: false }));

		expect(debugSpy).not.toHaveBeenCalled();
	});

	it('does not re-emit on re-renders for the same connected address', () => {
		mockAccount({
			address: FULL_ADDRESS,
			isConnected: true,
			connector: { id: 'injected', name: 'Injected' } as ReturnType<
				typeof useAccount
			>['connector'],
		});

		const { rerender } = renderHook(() =>
			useWalletConnectionLogger({ isTestEnv: false })
		);
		rerender();
		rerender();

		expect(debugSpy).toHaveBeenCalledTimes(1);
	});

	it('emits again after a disconnect/reconnect cycle', () => {
		mockAccount({
			address: FULL_ADDRESS,
			isConnected: true,
			connector: { id: 'injected', name: 'Injected' } as ReturnType<
				typeof useAccount
			>['connector'],
		});
		const { rerender } = renderHook(() =>
			useWalletConnectionLogger({ isTestEnv: false })
		);
		expect(debugSpy).toHaveBeenCalledTimes(1);

		mockAccount({ address: undefined, isConnected: false });
		rerender();
		expect(debugSpy).toHaveBeenCalledTimes(1);

		mockAccount({
			address: SECOND_ADDRESS,
			isConnected: true,
			connector: { id: 'injected', name: 'Injected' } as ReturnType<
				typeof useAccount
			>['connector'],
		});
		rerender();
		expect(debugSpy).toHaveBeenCalledTimes(2);
	});

	it('does not emit in the test environment by default', () => {
		mockAccount({
			address: FULL_ADDRESS,
			isConnected: true,
			connector: { id: 'injected', name: 'Injected' } as ReturnType<
				typeof useAccount
			>['connector'],
		});

		renderHook(() => useWalletConnectionLogger());

		expect(debugSpy).not.toHaveBeenCalled();
	});
});
