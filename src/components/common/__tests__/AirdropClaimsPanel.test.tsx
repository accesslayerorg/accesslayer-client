import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AirdropClaimsPanel from '../AirdropClaimsPanel';
import { fetchAirdropsForWallet } from '@/services/airdrop.service';
import {
	getAirdropClaimHistoryStorageKey,
	type AirdropAllocation,
	type AirdropClaimRecord,
} from '@/utils/airdropClaim.utils';
import showToast from '@/utils/toast.util';

vi.mock('@/services/airdrop.service', () => ({
	fetchAirdropsForWallet: vi.fn(),
}));

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
	},
}));

const mockFetch = vi.mocked(fetchAirdropsForWallet);
const mockSuccess = vi.mocked(showToast.success);

const WALLET = 'GAIRDROPWALLET00000000000000000000000000000000000000000000001';

function makeAirdrop(overrides: Partial<AirdropAllocation> = {}): AirdropAllocation {
	return {
		id: 'airdrop-1',
		keyId: 'key-1',
		keyName: 'Alice',
		snapshotDate: '2026-09-01T00:00:00Z',
		totalDistributed: 10_000,
		userAllocation: 25,
		...overrides,
	};
}

function seedClaimHistory(records: AirdropClaimRecord[]) {
	window.localStorage.setItem(
		getAirdropClaimHistoryStorageKey(WALLET),
		JSON.stringify(records)
	);
}

function renderPanel() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return render(
		<QueryClientProvider client={queryClient}>
			<AirdropClaimsPanel walletAddress={WALLET} />
		</QueryClientProvider>
	);
}

describe('AirdropClaimsPanel', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		window.localStorage.clear();
	});

	it('shows the empty state when the holder has no airdrops', async () => {
		mockFetch.mockResolvedValue([]);

		renderPanel();

		await waitFor(() => {
			expect(
				screen.getByText('No airdrops available')
			).toBeInTheDocument();
		});
		expect(screen.getByTestId('airdrop-history-empty')).toBeInTheDocument();
		expect(
			screen.queryByTestId('airdrop-claim-all')
		).toBeDisabled();
	});

	it('shows an error state when allocations fail to load', async () => {
		mockFetch.mockRejectedValue(new Error('backend down'));

		renderPanel();

		await waitFor(() => {
			expect(
				screen.getByText("Couldn't load airdrops")
			).toBeInTheDocument();
		});
	});

	it('lists allocations grouped by key with snapshot date, total distributed, and user allocation', async () => {
		mockFetch.mockResolvedValue([
			makeAirdrop({
				id: 'a1',
				keyId: 'key-1',
				keyName: 'Alice',
				snapshotDate: '2026-09-01T00:00:00Z',
				totalDistributed: 10_000,
				userAllocation: 25,
			}),
			makeAirdrop({
				id: 'a2',
				keyId: 'key-1',
				keyName: 'Alice',
				snapshotDate: '2026-10-01T00:00:00Z',
				totalDistributed: 20_000,
				userAllocation: 40,
			}),
			makeAirdrop({
				id: 'b1',
				keyId: 'key-2',
				keyName: 'Bob',
				snapshotDate: '2026-08-15T00:00:00Z',
				totalDistributed: 5_000,
				userAllocation: 12.5,
			}),
		]);

		renderPanel();

		await waitFor(() => {
			expect(screen.getAllByTestId('airdrop-row')).toHaveLength(3);
		});

		const groups = screen.getAllByTestId('airdrop-key-group');
		expect(groups).toHaveLength(2);
		expect(screen.getAllByTestId('airdrop-key-name')[0]).toHaveTextContent(
			'Alice'
		);
		expect(screen.getAllByTestId('airdrop-key-name')[1]).toHaveTextContent(
			'Bob'
		);

		// Newest snapshot sorts first within the Alice group
		const snapshots = screen.getAllByTestId('airdrop-snapshot-date');
		expect(snapshots[0]).toHaveTextContent('Oct 1, 2026');
		expect(snapshots[1]).toHaveTextContent('Sep 1, 2026');
		expect(snapshots[2]).toHaveTextContent('Aug 15, 2026');

		const totals = screen.getAllByTestId('airdrop-total-distributed');
		expect(totals[0]).toHaveTextContent('20000.00 XLM');
		expect(totals[2]).toHaveTextContent('5000.00 XLM');

		const allocations = screen.getAllByTestId('airdrop-user-allocation');
		expect(allocations[0]).toHaveTextContent('40.00 XLM');
		expect(allocations[2]).toHaveTextContent('12.50 XLM');

		expect(screen.getByTestId('airdrop-total-unclaimed')).toHaveTextContent(
			'77.50 XLM'
		);
	});

	it('claims a single airdrop and moves it into claim history', async () => {
		mockFetch.mockResolvedValue([
			makeAirdrop({ id: 'solo', userAllocation: 33 }),
		]);

		renderPanel();

		await waitFor(() => {
			expect(screen.getByTestId('airdrop-claim-one')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByTestId('airdrop-claim-one'));

		await waitFor(
			() => {
				expect(
					screen.getByText('No unclaimed airdrops')
				).toBeInTheDocument();
			},
			{ timeout: 5000 }
		);

		expect(mockSuccess).toHaveBeenCalledWith('Airdrop claimed');

		const historyRows = screen.getAllByTestId('airdrop-history-row');
		expect(historyRows).toHaveLength(1);
		expect(screen.getByTestId('airdrop-history-amount')).toHaveTextContent(
			'+33.0000 XLM'
		);
		expect(screen.getByTestId('airdrop-history-date')).toBeInTheDocument();
	});

	it('claims all unclaimed airdrops across keys and records each in history', async () => {
		mockFetch.mockResolvedValue([
			makeAirdrop({ id: 'multi-1', keyId: 'key-1', userAllocation: 10 }),
			makeAirdrop({ id: 'multi-2', keyId: 'key-2', userAllocation: 15 }),
		]);

		renderPanel();

		await waitFor(() => {
			expect(screen.getByTestId('airdrop-claim-all')).toBeEnabled();
		});

		fireEvent.click(screen.getByTestId('airdrop-claim-all'));

		await waitFor(
			() => {
				expect(
					screen.getByText('No unclaimed airdrops')
				).toBeInTheDocument();
			},
			{ timeout: 5000 }
		);

		expect(mockSuccess).toHaveBeenCalledWith('Claimed 2 airdrops');
		expect(screen.getAllByTestId('airdrop-history-row')).toHaveLength(2);
		expect(screen.getByTestId('airdrop-claim-all')).toBeDisabled();
	});

	it('marks previously claimed airdrops from history and shows their amounts and dates', async () => {
		seedClaimHistory([
			{
				id: 'past-1',
				keyId: 'key-1',
				keyName: 'Alice',
				amount: 18,
				timestamp: Date.now() - 60_000,
				transactionHash: 'a'.repeat(64),
			},
		]);
		mockFetch.mockResolvedValue([
			makeAirdrop({ id: 'past-1', userAllocation: 18 }),
			makeAirdrop({ id: 'fresh-1', userAllocation: 7 }),
		]);

		renderPanel();

		await waitFor(() => {
			expect(screen.getAllByTestId('airdrop-row')).toHaveLength(2);
		});

		expect(screen.getAllByTestId('airdrop-claimed-chip')).toHaveLength(1);
		expect(screen.getByTestId('airdrop-claimed-amount')).toHaveTextContent(
			'+18.00 XLM'
		);
		expect(screen.getByTestId('airdrop-total-unclaimed')).toHaveTextContent(
			'7.00 XLM'
		);
		expect(screen.getByTestId('airdrop-history-amount')).toHaveTextContent(
			'+18.0000 XLM'
		);
		expect(screen.getByTestId('airdrop-history-tx')).toHaveAttribute(
			'href',
			expect.stringContaining('a'.repeat(8))
		);
	});

	it('shows the no-unclaimed empty state when every allocation is claimed', async () => {
		seedClaimHistory([
			{
				id: 'only-1',
				keyId: 'key-1',
				keyName: 'Alice',
				amount: 25,
				timestamp: Date.now(),
				transactionHash: 'b'.repeat(64),
			},
		]);
		mockFetch.mockResolvedValue([makeAirdrop({ id: 'only-1' })]);

		renderPanel();

		await waitFor(() => {
			expect(
				screen.getByText('No unclaimed airdrops')
			).toBeInTheDocument();
		});

		expect(screen.getByTestId('airdrop-claim-all')).toBeDisabled();
		expect(screen.getByTestId('airdrop-history-row')).toBeInTheDocument();
	});
});
