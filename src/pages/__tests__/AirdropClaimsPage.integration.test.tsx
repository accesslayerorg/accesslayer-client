import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router';
import React from 'react';
import AirdropClaimsPage from '../AirdropClaimsPage';
import { useAccount } from 'wagmi';
import {
	useAirdropClaims,
	useClaimAirdropMutation,
	useClaimAllAirdropsMutation,
} from '@/hooks/useAirdropClaims';
import { useSigner } from '@/hooks/useSigner';

vi.mock('wagmi', () => ({
	useAccount: vi.fn(),
	useConnect: vi.fn(() => ({
		connect: vi.fn(),
		connectors: [],
		error: null,
		isPending: false,
	})),
	useDisconnect: vi.fn(() => ({
		disconnect: vi.fn(),
	})),
}));

vi.mock('@/hooks/useSigner', () => ({
	useSigner: vi.fn(() => ({
		activeSigner: null,
		loading: false,
	})),
}));

vi.mock('@/hooks/useAirdropClaims', () => ({
	useAirdropClaims: vi.fn(),
	useClaimAirdropMutation: vi.fn(),
	useClaimAllAirdropsMutation: vi.fn(),
}));

const mockUseAccount = vi.mocked(useAccount);
const mockUseAirdropClaims = vi.mocked(useAirdropClaims);
const mockUseClaimAirdropMutation = vi.mocked(useClaimAirdropMutation);
const mockUseClaimAllAirdropsMutation = vi.mocked(useClaimAllAirdropsMutation);
const mockUseSigner = vi.mocked(useSigner);

const WALLET = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5';

const unclaimedAlpha = {
	id: 'airdrop-1',
	keyId: 'creator-alpha',
	keyName: 'Alpha Creator',
	snapshotDate: '2026-01-15T12:00:00.000Z',
	totalDistributed: 1000,
	userAllocation: 25,
	claimed: false,
	receivedAmount: null,
	claimedAt: null,
};

const unclaimedAlphaSecond = {
	id: 'airdrop-2',
	keyId: 'creator-alpha',
	keyName: 'Alpha Creator',
	snapshotDate: '2026-02-15T12:00:00.000Z',
	totalDistributed: 500,
	userAllocation: 12.5,
	claimed: false,
	receivedAmount: null,
	claimedAt: null,
};

const unclaimedBeta = {
	id: 'airdrop-3',
	keyId: 'creator-beta',
	keyName: 'Beta Creator',
	snapshotDate: '2026-03-01T12:00:00.000Z',
	totalDistributed: 2000,
	userAllocation: 40,
	claimed: false,
	receivedAmount: null,
	claimedAt: null,
};

const claimedAlpha = {
	id: 'airdrop-4',
	keyId: 'creator-alpha',
	keyName: 'Alpha Creator',
	snapshotDate: '2025-12-01T12:00:00.000Z',
	totalDistributed: 800,
	userAllocation: 20,
	claimed: true,
	receivedAmount: 18.5,
	claimedAt: '2025-12-05T12:00:00.000Z',
	claimTxHash: 'tx-claimed',
};

function renderPage() {
	return render(
		<MemoryRouter initialEntries={['/airdrop-claims']}>
			<AirdropClaimsPage />
		</MemoryRouter>
	);
}

function mockConnectedWallet() {
	mockUseAccount.mockReturnValue({
		address: WALLET,
		isConnected: true,
	} as ReturnType<typeof useAccount>);
	mockUseSigner.mockReturnValue({
		activeSigner: null,
		loading: false,
	} as unknown as ReturnType<typeof useSigner>);
}

function mockClaimMutations() {
	const claimMutate = vi.fn();
	const claimAllMutate = vi.fn();

	mockUseClaimAirdropMutation.mockReturnValue({
		mutate: claimMutate,
		isPending: false,
	} as unknown as ReturnType<typeof useClaimAirdropMutation>);

	mockUseClaimAllAirdropsMutation.mockReturnValue({
		mutate: claimAllMutate,
		isPending: false,
	} as unknown as ReturnType<typeof useClaimAllAirdropsMutation>);

	return { claimMutate, claimAllMutate };
}

describe('AirdropClaimsPage', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseSigner.mockReturnValue({
			activeSigner: null,
			loading: false,
		} as unknown as ReturnType<typeof useSigner>);
	});

	it('renders wallet connect prompt when user is not connected', () => {
		mockUseAccount.mockReturnValue({
			address: undefined,
			isConnected: false,
		} as ReturnType<typeof useAccount>);

		mockUseAirdropClaims.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: false,
		} as unknown as ReturnType<typeof useAirdropClaims>);

		mockClaimMutations();

		renderPage();

		expect(screen.getByTestId('airdrop-connect-prompt')).toBeInTheDocument();
		expect(
			screen.getByText(/Connect your wallet to view the airdrops/i)
		).toBeInTheDocument();
	});

	it('lists airdrops grouped by key with snapshot date, total distributed, and user allocation', () => {
		mockConnectedWallet();
		mockClaimMutations();

		mockUseAirdropClaims.mockReturnValue({
			data: {
				airdrops: [
					unclaimedAlpha,
					unclaimedAlphaSecond,
					unclaimedBeta,
					claimedAlpha,
				],
			},
			isLoading: false,
			isError: false,
		} as unknown as ReturnType<typeof useAirdropClaims>);

		renderPage();

		expect(
			screen.getByTestId('airdrop-key-group-creator-alpha')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('airdrop-key-group-creator-beta')
		).toBeInTheDocument();

		expect(screen.getByTestId('airdrop-row-airdrop-1')).toBeInTheDocument();
		expect(screen.getByTestId('airdrop-row-airdrop-3')).toBeInTheDocument();

		// Claimed airdrops never appear in the claimable list.
		expect(
			screen.queryByTestId('airdrop-row-airdrop-4')
		).not.toBeInTheDocument();

		// Snapshot date, total distributed, and allocation render per row.
		expect(
			screen.getByTestId('airdrop-snapshot-date-airdrop-1')
		).toHaveTextContent(/Jan 15, 2026/);
		expect(
			screen.getByTestId('airdrop-total-distributed-airdrop-1')
		).toHaveTextContent(/1,000 XLM/);
		expect(
			screen.getByTestId('airdrop-allocation-airdrop-1')
		).toHaveTextContent(/25 XLM/);
	});

	it('submits the claim_airdrop call for a single airdrop when Claim is clicked', async () => {
		mockConnectedWallet();
		const { claimMutate } = mockClaimMutations();

		mockUseAirdropClaims.mockReturnValue({
			data: { airdrops: [unclaimedAlpha, unclaimedBeta] },
			isLoading: false,
			isError: false,
		} as unknown as ReturnType<typeof useAirdropClaims>);

		renderPage();

		await userEvent.click(screen.getByTestId('airdrop-claim-airdrop-1'));

		expect(claimMutate).toHaveBeenCalledTimes(1);
		expect(claimMutate).toHaveBeenCalledWith({
			airdropId: 'airdrop-1',
		});
		expect(claimMutate).not.toHaveBeenCalledWith(
			expect.objectContaining({ airdropId: 'airdrop-3' })
		);
	});

	it('claims all unclaimed airdrops across all keys in one flow', async () => {
		mockConnectedWallet();
		const { claimAllMutate } = mockClaimMutations();

		mockUseAirdropClaims.mockReturnValue({
			data: {
				airdrops: [
					unclaimedAlpha,
					unclaimedAlphaSecond,
					unclaimedBeta,
					claimedAlpha,
				],
			},
			isLoading: false,
			isError: false,
		} as unknown as ReturnType<typeof useAirdropClaims>);

		renderPage();

		const claimAllButton = screen.getByTestId('airdrop-claim-all');
		expect(claimAllButton).toHaveTextContent(/Claim All \(3\)/);

		await userEvent.click(claimAllButton);

		expect(claimAllMutate).toHaveBeenCalledTimes(1);
		expect(claimAllMutate).toHaveBeenCalledWith([
			{ airdropId: 'airdrop-1' },
			{ airdropId: 'airdrop-2' },
			{ airdropId: 'airdrop-3' },
		]);
	});

	it('shows claimed airdrops in the history section with received amount and claim date', () => {
		mockConnectedWallet();
		mockClaimMutations();

		mockUseAirdropClaims.mockReturnValue({
			data: { airdrops: [claimedAlpha] },
			isLoading: false,
			isError: false,
		} as unknown as ReturnType<typeof useAirdropClaims>);

		renderPage();

		expect(screen.getByTestId('airdrop-history-section')).toBeInTheDocument();
		expect(
			screen.getByTestId('airdrop-history-row-airdrop-4')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('airdrop-received-airdrop-4')
		).toHaveTextContent(/18.5 XLM/);
		expect(
			screen.getByTestId('airdrop-claimed-at-airdrop-4')
		).toHaveTextContent(/Dec 5, 2025/);
	});

	it('renders the empty state when no airdrops exist', () => {
		mockConnectedWallet();
		mockClaimMutations();

		mockUseAirdropClaims.mockReturnValue({
			data: { airdrops: [] },
			isLoading: false,
			isError: false,
		} as unknown as ReturnType<typeof useAirdropClaims>);

		renderPage();

		expect(screen.getByTestId('airdrops-empty')).toBeInTheDocument();
		expect(screen.getByText(/No airdrops yet/i)).toBeInTheDocument();
	});

	it('renders the unclaimed empty state when every airdrop is already claimed', () => {
		mockConnectedWallet();
		mockClaimMutations();

		mockUseAirdropClaims.mockReturnValue({
			data: { airdrops: [claimedAlpha] },
			isLoading: false,
			isError: false,
		} as unknown as ReturnType<typeof useAirdropClaims>);

		renderPage();

		expect(
			screen.getByTestId('airdrops-unclaimed-empty')
		).toBeInTheDocument();
		expect(screen.queryByTestId('airdrop-claim-all')).not.toBeInTheDocument();
	});

	it('renders an error state when the airdrop query fails', () => {
		mockConnectedWallet();
		mockClaimMutations();

		mockUseAirdropClaims.mockReturnValue({
			data: undefined,
			isLoading: false,
			isError: true,
		} as unknown as ReturnType<typeof useAirdropClaims>);

		renderPage();

		expect(screen.getByTestId('airdrop-claims-error')).toBeInTheDocument();
	});
});
