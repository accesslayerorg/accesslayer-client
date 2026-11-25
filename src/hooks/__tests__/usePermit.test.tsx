import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Networks } from '@stellar/stellar-sdk';
import { resolvePermitApprovalMode, usePermit } from '@/hooks/usePermit';
import type { Signer } from '@/lib/signing/types';
import type { PermitService } from '@/types/permit';

function createWrapper() {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return function Wrapper({ children }: { children: ReactNode }) {
		return (
			<QueryClientProvider client={client}>{children}</QueryClientProvider>
		);
	};
}

function createSigner(
	signMessage = vi.fn().mockResolvedValue('signature')
): Signer {
	return {
		type: 'software',
		sign: vi.fn(),
		getPublicKey: vi.fn(),
		signMessage,
	};
}

afterEach(cleanup);

describe('usePermit (#1390)', () => {
	it('falls back when the wallet cannot sign messages', () => {
		const service: PermitService = {
			supportsPermit: () => true,
			getPermitNonce: vi.fn(),
			submitPermitAndTransfer: vi.fn(),
		};
		const signer: Signer = {
			type: 'hardware',
			sign: vi.fn(),
			getPublicKey: vi.fn(),
		};

		expect(resolvePermitApprovalMode(service, signer)).toBe('allowance');
		expect(resolvePermitApprovalMode(service, null)).toBe('allowance');
	});

	it('signs the displayed payload, submits once, and refreshes the nonce', async () => {
		const signMessage = vi.fn().mockResolvedValue('signed-message');
		const getPermitNonce = vi
			.fn<() => Promise<bigint>>()
			.mockResolvedValueOnce(7n)
			.mockResolvedValueOnce(8n);
		const submitPermitAndTransfer = vi.fn().mockResolvedValue({
			hash: 'tx-hash',
		});
		const service: PermitService = {
			supportsPermit: () => true,
			getPermitNonce,
			submitPermitAndTransfer,
		};

		const { result } = renderHook(
			() =>
				usePermit({
					owner: 'GOWNER',
					spender: 'CSPENDER',
					recipient: 'CVAULT',
					key: 'CKEY',
					amount: 2,
					deadline: 1_800_000_000,
					contractId: 'CCONTRACT',
					networkPassphrase: Networks.TESTNET,
					signer: createSigner(signMessage),
					service,
					now: () => 1_700_000_000_000,
				}),
			{ wrapper: createWrapper() }
		);

		await waitFor(() => expect(result.current.payload?.nonce).toBe('7'));
		const displayedMessage = result.current.payload?.message;

		await act(async () => {
			await expect(
				result.current.submitPermitAndTransfer()
			).resolves.toEqual({
				hash: 'tx-hash',
			});
		});

		expect(signMessage).toHaveBeenCalledOnce();
		expect(signMessage).toHaveBeenCalledWith(displayedMessage);
		expect(submitPermitAndTransfer).toHaveBeenCalledOnce();
		expect(submitPermitAndTransfer).toHaveBeenCalledWith(
			expect.objectContaining({
				signature: 'signed-message',
				recipient: 'CVAULT',
			})
		);
		await waitFor(() => expect(result.current.payload?.nonce).toBe('8'));
		expect(getPermitNonce).toHaveBeenCalledTimes(2);
	});

	it('does not prompt the wallet for an expired permit', async () => {
		const signMessage = vi.fn();
		const service: PermitService = {
			supportsPermit: () => true,
			getPermitNonce: vi.fn().mockResolvedValue(0n),
			submitPermitAndTransfer: vi.fn(),
		};

		const { result } = renderHook(
			() =>
				usePermit({
					owner: 'GOWNER',
					spender: 'CSPENDER',
					recipient: 'CVAULT',
					key: 'CKEY',
					amount: 1,
					deadline: 1_699_999_999,
					contractId: 'CCONTRACT',
					networkPassphrase: Networks.TESTNET,
					signer: createSigner(signMessage),
					service,
					now: () => 1_700_000_000_000,
				}),
			{ wrapper: createWrapper() }
		);

		await waitFor(() => expect(result.current.payload).not.toBeNull());
		await act(async () => {
			await expect(result.current.submitPermitAndTransfer()).rejects.toThrow(
				'expired'
			);
		});
		expect(signMessage).not.toHaveBeenCalled();
		await waitFor(() =>
			expect(result.current.errorMessage).toMatch(/expired/i)
		);
	});
});
