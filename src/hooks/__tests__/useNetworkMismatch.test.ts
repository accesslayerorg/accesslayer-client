import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useNetworkMismatch } from '@/hooks/useNetworkMismatch';

// ── wagmi mocks ──────────────────────────────────────────────────────────────
vi.mock('wagmi', () => ({
	useAccount: vi.fn(),
	useChainId: vi.fn(),
}));

// ── wagmiConfig mock (provides defaultChain) ─────────────────────────────────
vi.mock('@/lib/web3/wagmiConfig', () => ({
	defaultChain: { id: 84532, name: 'Base Sepolia' },
}));

import { useAccount, useChainId } from 'wagmi';

const mockUseAccount = vi.mocked(useAccount);
const mockUseChainId = vi.mocked(useChainId);

// ─────────────────────────────────────────────────────────────────────────────

describe('useNetworkMismatch', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns isMismatch=false when no wallet is connected', () => {
		mockUseAccount.mockReturnValue({ isConnected: false } as ReturnType<typeof useAccount>);
		mockUseChainId.mockReturnValue(1); // mainnet – irrelevant when disconnected

		const { result } = renderHook(() => useNetworkMismatch());

		expect(result.current.isMismatch).toBe(false);
		expect(result.current.connectedChainId).toBeUndefined();
	});

	it('returns isMismatch=false when wallet is on the expected chain', () => {
		mockUseAccount.mockReturnValue({ isConnected: true } as ReturnType<typeof useAccount>);
		mockUseChainId.mockReturnValue(84532); // matches defaultChain

		const { result } = renderHook(() => useNetworkMismatch());

		expect(result.current.isMismatch).toBe(false);
		expect(result.current.connectedChainId).toBe(84532);
	});

	it('returns isMismatch=true when wallet is on a different chain', () => {
		mockUseAccount.mockReturnValue({ isConnected: true } as ReturnType<typeof useAccount>);
		mockUseChainId.mockReturnValue(1); // mainnet ≠ Base Sepolia

		const { result } = renderHook(() => useNetworkMismatch());

		expect(result.current.isMismatch).toBe(true);
		expect(result.current.connectedChainId).toBe(1);
	});

	it('always exposes the expected chain id and name', () => {
		mockUseAccount.mockReturnValue({ isConnected: false } as ReturnType<typeof useAccount>);
		mockUseChainId.mockReturnValue(84532);

		const { result } = renderHook(() => useNetworkMismatch());

		expect(result.current.expectedChainId).toBe(84532);
		expect(result.current.expectedChainName).toBe('Base Sepolia');
	});
});
