/**
 * Integration tests for the referral dashboard additions (#1119):
 * tier depth breakdown, earnings ledger, share buttons, and the
 * clipboard + toast confirmation on the referral link.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import ReferralDashboardPage from '../ReferralDashboardPage';
import {
	aggregateReferralEarnings,
	buildReferralLink,
} from '@/utils/referral.utils';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import type { ReferredWallet } from '@/services/referral.service';

const WALLET = 'GREReferrer';

vi.mock('wagmi', () => ({
	useAccount: vi.fn(),
	useConnect: vi.fn(() => ({
		connect: vi.fn(),
		isPending: false,
		connectors: [],
		error: null,
	})),
	useDisconnect: vi.fn(() => ({ disconnect: vi.fn() })),
}));

vi.mock('@/hooks/useReferrals', () => ({
	useReferralSummary: vi.fn(),
	useReferredWallets: vi.fn(),
	useClaimReferralRewardsMutation: vi.fn(),
}));

vi.mock('@/utils/clipboard.utils', () => ({
	copyTextToClipboard: vi.fn(),
}));

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		message: vi.fn(),
	},
}));

import { useAccount } from 'wagmi';
import {
	useClaimReferralRewardsMutation,
	useReferredWallets,
	useReferralSummary,
} from '@/hooks/useReferrals';
import showToast from '@/utils/toast.util';

const mockUseAccount = vi.mocked(useAccount);
const mockUseReferralSummary = vi.mocked(useReferralSummary);
const mockUseReferredWallets = vi.mocked(useReferredWallets);
const mockUseClaim = vi.mocked(useClaimReferralRewardsMutation);
const mockCopy = vi.mocked(copyTextToClipboard);

const REFERRAL_LINK = buildReferralLink({
	wallet: WALLET,
	origin: 'http://localhost',
});

const wallets: ReferredWallet[] = [
	{
		address: 'GNEWESTWALLETADDRESSABCDEFGHIJKLMNOPQRSTUVWXYZ234567ab',
		joinedAt: '2026-01-01T00:00:00.000Z',
		status: 'rewarded',
		firstTradeAt: '2026-03-01T00:00:00.000Z',
		rewardXlm: 2,
		tier: 1,
	},
	{
		address: 'GMIDDLEWALLET',
		joinedAt: '2026-01-02T00:00:00.000Z',
		status: 'rewarded',
		firstTradeAt: '2026-02-01T00:00:00.000Z',
		rewardXlm: 1,
		tier: 2,
	},
	{
		address: 'GNO_TRADE_YET',
		joinedAt: '2026-04-01T00:00:00.000Z',
		status: 'joined',
		tier: 3,
	},
];

const mockMutate = vi.fn();

function renderPage() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<ReferralDashboardPage />
		</QueryClientProvider>
	);
}

describe('ReferralDashboardPage (#1119)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockCopy.mockResolvedValue();
		mockUseAccount.mockReturnValue({
			address: WALLET,
			isConnected: true,
		} as unknown as ReturnType<typeof useAccount>);

		const summary = {
			wallet: WALLET,
			referredCount: 3,
			convertedCount: 2,
			totalEarnedXlm: 3,
			pendingXlm: 3,
			claimedXlm: 0,
			rewardBps: 500,
		};
		mockUseReferralSummary.mockReturnValue({
			earnings: aggregateReferralEarnings(summary),
			referralLink: REFERRAL_LINK,
			isLoading: false,
		} as unknown as ReturnType<typeof useReferralSummary>);

		mockUseReferredWallets.mockReturnValue({
			data: { pages: [{ wallets, nextCursor: null }], pageParams: [null] },
			isLoading: false,
			isError: false,
			isFetchingNextPage: false,
			hasNextPage: false,
			fetchNextPage: vi.fn(),
		} as unknown as ReturnType<typeof useReferredWallets>);

		mockUseClaim.mockReturnValue({
			mutate: mockMutate,
			isPending: false,
		} as unknown as ReturnType<typeof useClaimReferralRewardsMutation>);
	});

	afterEach(() => {
		cleanup();
	});

	it('copies the referral link to the clipboard with a toast confirmation', async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByTestId('referral-link-copy'));

		expect(mockCopy).toHaveBeenCalledWith(REFERRAL_LINK);
		await waitFor(() =>
			expect(showToast.success).toHaveBeenCalledWith(
				'Referral link copied to clipboard'
			)
		);
	});

	it('shows the tier 1/2/3 depth breakdown', async () => {
		renderPage();

		const breakdown = await screen.findByTestId('referral-tier-breakdown');
		expect(within(breakdown).getByTestId('referral-tier-1')).toHaveTextContent(
			'1'
		);
		expect(within(breakdown).getByTestId('referral-tier-2')).toHaveTextContent(
			'1'
		);
		expect(within(breakdown).getByTestId('referral-tier-3')).toHaveTextContent(
			'1'
		);
	});

	it('lists earnings sorted by date descending with truncated wallets', async () => {
		renderPage();

		const table = await screen.findByTestId('referral-earnings-table');
		const rows = within(table).getAllByTestId('referral-earning-row');

		// Newest earning (2026-03-01) first; wallets without a trade earn nothing.
		expect(rows).toHaveLength(2);
		expect(
			within(rows[0]).getByTestId('referral-earning-tier')
		).toHaveTextContent('Tier 1');
		expect(
			within(rows[0]).getByTestId('referral-earning-amount')
		).toHaveTextContent('2 XLM');
		expect(
			within(rows[1]).getByTestId('referral-earning-tier')
		).toHaveTextContent('Tier 2');
		// Long source wallets render truncated with the full value in the title.
		expect(
			within(rows[0]).getByTestId('referral-earning-source')
		).toHaveTextContent('GNEW…67ab');
		expect(
			within(rows[0]).getByTestId('referral-earning-source')
		).toHaveAttribute(
			'title',
			'GNEWESTWALLETADDRESSABCDEFGHIJKLMNOPQRSTUVWXYZ234567ab'
		);
	});

	it('triggers the claim contract call when a pending balance exists', async () => {
		const user = userEvent.setup();
		renderPage();

		const claimButton = await screen.findByTestId('referral-claim-button');
		expect(claimButton).toBeEnabled();

		await user.click(claimButton);

		expect(mockMutate).toHaveBeenCalledWith(3);
	});

	it('opens the pre-filled Twitter and Telegram share URLs', async () => {
		const user = userEvent.setup();
		const openSpy = vi
			.spyOn(window, 'open')
			.mockReturnValue(null as unknown as Window);
		renderPage();

		await user.click(screen.getByTestId('referral-share-twitter'));
		expect(openSpy.mock.calls[0][0]).toBe(
			`https://twitter.com/intent/tweet?text=${encodeURIComponent(
				`Join AccessLayer with my link and start trading creator keys: ${REFERRAL_LINK}`
			)}`
		);

		await user.click(screen.getByTestId('referral-share-telegram'));
		expect(openSpy.mock.calls[1][0]).toBe(
			`https://t.me/share/url?url=${encodeURIComponent(
				REFERRAL_LINK
			)}&text=${encodeURIComponent(
				`Join AccessLayer with my link and start trading creator keys: ${REFERRAL_LINK}`
			)}`
		);

		openSpy.mockRestore();
	});

	it('prompts to connect a wallet when disconnected', async () => {
		mockUseAccount.mockReturnValue({
			address: undefined,
			isConnected: false,
		} as unknown as ReturnType<typeof useAccount>);
		mockUseReferralSummary.mockReturnValue({
			earnings: aggregateReferralEarnings(null),
			referralLink: '',
			isLoading: false,
		} as unknown as ReturnType<typeof useReferralSummary>);

		renderPage();

		expect(
			screen.getByTestId('referral-connect-prompt')
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('referral-share-buttons')
		).not.toBeInTheDocument();
	});
});
