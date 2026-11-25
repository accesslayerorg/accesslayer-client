import type { ReactNode } from 'react';
import { Networks } from '@stellar/stellar-sdk';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PermitAllowanceStep from '@/components/common/PermitAllowanceStep';
import type { Signer } from '@/lib/signing/types';
import type { PermitAllowanceConfig, PermitService } from '@/types/permit';

afterEach(cleanup);

function createService(supported: boolean): PermitService {
	return {
		supportsPermit: () => supported,
		getPermitNonce: vi.fn().mockResolvedValue(0n),
		submitPermitAndTransfer: vi.fn().mockResolvedValue({ hash: 'tx-hash' }),
	};
}

function createSigner(withMessageSigning: boolean): Signer {
	return {
		type: withMessageSigning ? 'software' : 'hardware',
		sign: vi.fn(),
		getPublicKey: vi.fn(),
		...(withMessageSigning
			? { signMessage: vi.fn().mockResolvedValue('signature') }
			: {}),
	};
}

function createConfig(
	service: PermitService,
	signer: Signer
): PermitAllowanceConfig {
	return {
		contractId: 'CCONTRACT',
		networkPassphrase: Networks.TESTNET,
		spender: 'CSPENDER',
		recipient: 'CVAULT',
		signer,
		service,
	};
}

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

describe('PermitAllowanceStep fallback (#1390)', () => {
	it('uses the standard two-step flow when the wallet cannot sign messages', () => {
		const service = createService(true);
		const onApprove = vi.fn();
		render(
			<PermitAllowanceStep
				owner="GOWNER"
				keyId="CKEY"
				amount={2}
				permitConfig={createConfig(service, createSigner(false))}
				isApproving={false}
				errorMessage={null}
				onApprove={onApprove}
			/>
		);

		expect(screen.getByText('Approval required')).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: 'Review signed permit' })
		).not.toBeInTheDocument();
		fireEvent.click(screen.getByRole('button', { name: 'Approve transfer' }));
		expect(onApprove).toHaveBeenCalledOnce();
		expect(service.getPermitNonce).not.toHaveBeenCalled();
	});

	it('uses the standard two-step flow when the contract service is unsupported', () => {
		const service = createService(false);
		render(
			<PermitAllowanceStep
				owner="GOWNER"
				keyId="CKEY"
				amount={2}
				permitConfig={createConfig(service, createSigner(true))}
				isApproving={false}
				errorMessage={null}
				onApprove={vi.fn()}
			/>
		);

		expect(
			screen.getByRole('button', { name: 'Approve transfer' })
		).toBeInTheDocument();
		expect(service.getPermitNonce).not.toHaveBeenCalled();
	});

	it('reviews, signs, and sends one atomic service request when supported', async () => {
		const service = createService(true);
		const signer = createSigner(true);
		const onComplete = vi.fn();
		render(
			<PermitAllowanceStep
				owner="GOWNER"
				keyId="CKEY"
				amount={2}
				permitConfig={createConfig(service, signer)}
				isApproving={false}
				errorMessage={null}
				onApprove={vi.fn()}
				onPermitTransferComplete={onComplete}
			/>,
			{ wrapper: createWrapper() }
		);

		const reviewButton = await screen.findByRole('button', {
			name: 'Review signed permit',
		});
		fireEvent.click(reviewButton);
		await screen.findByRole('heading', { name: 'Review signed permit' });
		expect(signer.signMessage).not.toHaveBeenCalled();

		fireEvent.click(
			screen.getByRole('button', { name: 'Sign permit and transfer' })
		);

		await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
		expect(signer.signMessage).toHaveBeenCalledOnce();
		expect(service.submitPermitAndTransfer).toHaveBeenCalledOnce();
	});
});
