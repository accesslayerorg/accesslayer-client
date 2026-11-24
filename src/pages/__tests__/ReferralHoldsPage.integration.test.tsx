import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import ReferralHoldsPage from '../ReferralHoldsPage';
import {
	useReferralHoldDetail,
	useReferralHolds,
	useReferralHoldsSummary,
	useReviewReferralHoldMutation,
} from '@/hooks/useReferralHolds';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { isAdminWallet } from '@/utils/adminAccess';
import type {
	ReferralHold,
	ReferralHoldFilters,
} from '@/services/adminReferralHolds.service';

vi.mock('@/hooks/useReferralHolds', () => ({
	useReferralHolds: vi.fn(),
	useReferralHoldsSummary: vi.fn(),
	useReferralHoldDetail: vi.fn(),
	useReviewReferralHoldMutation: vi.fn(),
}));
vi.mock('@/hooks/useStellarWallet', () => ({ useStellarWallet: vi.fn() }));
vi.mock('@/utils/adminAccess', () => ({ isAdminWallet: vi.fn() }));
vi.mock('@/utils/toast.util', () => ({
	default: { success: vi.fn(), error: vi.fn() },
}));

const mockUseHolds = vi.mocked(useReferralHolds);
const mockUseSummary = vi.mocked(useReferralHoldsSummary);
const mockUseDetail = vi.mocked(useReferralHoldDetail);
const mockUseReview = vi.mocked(useReviewReferralHoldMutation);
const mockUseStellarWallet = vi.mocked(useStellarWallet);
const mockIsAdminWallet = vi.mocked(isAdminWallet);

const mockFetchNextPage = vi.fn();
const mockMutateAsync = vi.fn();

const HOLDS: ReferralHold[] = [
	{
		id: 'hold-1',
		referrer: 'GREFERRERONE',
		referee: 'GREFEREEONE',
		reason: 'self-referral',
		clusterSize: 2,
		amountXlm: 4.5,
		status: 'held',
		createdAt: '2026-01-01T00:00:00.000Z',
	},
	{
		id: 'hold-2',
		referrer: 'GREFERRERTWO',
		referee: 'GREFEREETWO',
		reason: 'sybil-cluster',
		clusterSize: 7,
		amountXlm: 9.75,
		status: 'held',
		createdAt: '2026-01-02T00:00:00.000Z',
	},
	{
		id: 'hold-3',
		referrer: 'GREFERRERTHREE',
		referee: 'GREFEREETHREE',
		reason: 'sybil-cluster',
		clusterSize: 4,
		amountXlm: 1.25,
		status: 'released',
		createdAt: '2026-01-03T00:00:00.000Z',
	},
];

const DETAIL = {
	...HOLDS[1],
	linkedWallets: [
		{
			address: 'GCLUSTERWALLETAAAA',
			role: 'cluster',
			joinedAt: '2026-01-01T00:00:00.000Z',
		},
	],
	fundingTransactions: [
		{
			hash: 'tx-funding-001',
			from: 'GSHAREDFUNDER',
			to: 'GREFEREETWO',
			amountXlm: 12,
			timestamp: '2026-01-01T01:00:00.000Z',
		},
	],
	timeline: [
		{
			id: 'event-1',
			label: 'Flagged as sybil cluster',
			timestamp: '2026-01-02T00:00:00.000Z',
			description: 'Shared funding source across 7 wallets',
		},
	],
};

let holds: ReferralHold[];

function LocationProbe() {
	const location = useLocation();
	return <div data-testid="location-search">{location.search}</div>;
}

function buildUi(route: string) {
	return (
		<MemoryRouter initialEntries={[route]}>
			<Routes>
				<Route path="/" element={<div data-testid="home-page">Home</div>} />
				<Route path="/admin/referral-holds" element={<ReferralHoldsPage />} />
			</Routes>
			<LocationProbe />
		</MemoryRouter>
	);
}

function renderPage(route = '/admin/referral-holds') {
	const result = render(buildUi(route));
	return { ...result, rerenderPage: () => result.rerender(buildUi(route)) };
}

function searchParams() {
	return new URLSearchParams(screen.getByTestId('location-search').textContent ?? '');
}

describe('ReferralHoldsPage (#1405, #1406, #1407, #1408)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		holds = HOLDS.map(hold => ({ ...hold }));
		mockFetchNextPage.mockResolvedValue(undefined);
		mockMutateAsync.mockResolvedValue(undefined);
		mockUseStellarWallet.mockReturnValue({
			address: 'CADMIN',
			isConnected: true,
		} as unknown as ReturnType<typeof useStellarWallet>);
		mockIsAdminWallet.mockReturnValue(true);
		mockUseHolds.mockImplementation((filters: ReferralHoldFilters = {}) => {
			const filtered = holds.filter(
				hold =>
					(!filters.status || hold.status === filters.status) &&
					(!filters.reason || hold.reason === filters.reason)
			);
			return {
				holds: filtered,
				isLoading: false,
				isError: false,
				isFetchingNextPage: false,
				hasNextPage: true,
				fetchNextPage: mockFetchNextPage,
			} as unknown as ReturnType<typeof useReferralHolds>;
		});
		mockUseSummary.mockReturnValue({
			data: { held: 2, released: 1, rejected: 0, amountHeldXlm: 14.25 },
			isLoading: false,
		} as unknown as ReturnType<typeof useReferralHoldsSummary>);
		mockUseDetail.mockReturnValue({
			data: DETAIL,
			isLoading: false,
		} as unknown as ReturnType<typeof useReferralHoldDetail>);
		mockUseReview.mockReturnValue({
			mutateAsync: mockMutateAsync,
			isPending: false,
		} as unknown as ReturnType<typeof useReviewReferralHoldMutation>);
	});

	afterEach(() => {
		cleanup();
	});

	it('redirects a non-admin user away from the queue', () => {
		mockIsAdminWallet.mockReturnValue(false);

		renderPage();

		expect(screen.getByTestId('home-page')).toBeInTheDocument();
		expect(screen.queryByTestId('referral-holds-page')).not.toBeInTheDocument();
	});

	it('shows held, released and rejected counts in the summary strip', () => {
		renderPage();

		expect(
			screen.getByTestId('referral-holds-summary-count-held')
		).toHaveTextContent('2');
		expect(
			screen.getByTestId('referral-holds-summary-count-released')
		).toHaveTextContent('1');
		expect(
			screen.getByTestId('referral-holds-summary-count-rejected')
		).toHaveTextContent('0');
	});

	it('narrows the queue and persists filters in the URL', async () => {
		const user = userEvent.setup();
		renderPage('/admin/referral-holds?status=held');

		expect(screen.getByTestId('referral-holds-status-filter')).toHaveValue('held');
		expect(screen.getAllByTestId('referral-hold-row')).toHaveLength(2);

		await user.selectOptions(
			screen.getByTestId('referral-holds-reason-filter'),
			'sybil-cluster'
		);

		expect(searchParams().get('status')).toBe('held');
		expect(searchParams().get('reason')).toBe('sybil-cluster');
		expect(mockUseHolds).toHaveBeenLastCalledWith(
			expect.objectContaining({ status: 'held', reason: 'sybil-cluster' }),
			true
		);
		await waitFor(() =>
			expect(screen.getAllByTestId('referral-hold-row')).toHaveLength(1)
		);
		expect(screen.getByTestId('referral-hold-reason')).toHaveTextContent(
			'Sybil cluster'
		);
	});

	it('fetches the next cursor page when Load more is clicked', async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getByTestId('referral-holds-load-more'));

		expect(mockFetchNextPage).toHaveBeenCalledTimes(1);
	});

	it('shows the linked wallets, first-funding transactions and timeline in the drawer', async () => {
		const user = userEvent.setup();
		renderPage();

		await user.click(screen.getAllByTestId('referral-hold-review')[1]);

		expect(screen.getByTestId('hold-detail-drawer')).toBeInTheDocument();
		expect(screen.getByTestId('hold-linked-wallets')).toHaveTextContent(
			'GCLU…AAAA'
		);
		expect(screen.getByTestId('hold-funding-transactions')).toHaveTextContent(
			'tx-funding-001'
		);
		expect(screen.getByTestId('hold-timeline')).toHaveTextContent(
			'Flagged as sybil cluster'
		);
	});

	it('requires a note for Release and updates the row status', async () => {
		const user = userEvent.setup();
		const { rerenderPage } = renderPage();

		await user.click(screen.getAllByTestId('referral-hold-review')[1]);
		expect(screen.getByTestId('hold-release-button')).toBeDisabled();

		await user.type(screen.getByTestId('hold-review-note'), 'Funding verified');
		expect(screen.getByTestId('hold-release-button')).toBeEnabled();
		await user.click(screen.getByTestId('hold-release-button'));

		await waitFor(() =>
			expect(mockMutateAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					holdId: 'hold-2',
					action: 'release',
					note: 'Funding verified',
				})
			)
		);

		holds = holds.map(hold =>
			hold.id === 'hold-2' ? { ...hold, status: 'released' } : hold
		);
		rerenderPage();
		expect(screen.getAllByTestId('referral-hold-status')[1]).toHaveTextContent(
			'Released'
		);
	});

	it('requires a note for Reject and updates the row status', async () => {
		const user = userEvent.setup();
		const { rerenderPage } = renderPage();

		await user.click(screen.getAllByTestId('referral-hold-review')[0]);
		expect(screen.getByTestId('hold-reject-button')).toBeDisabled();

		await user.type(
			screen.getByTestId('hold-review-note'),
			'Confirmed self-referral'
		);
		expect(screen.getByTestId('hold-reject-button')).toBeEnabled();
		await user.click(screen.getByTestId('hold-reject-button'));

		await waitFor(() =>
			expect(mockMutateAsync).toHaveBeenCalledWith(
				expect.objectContaining({
					holdId: 'hold-1',
					action: 'reject',
					note: 'Confirmed self-referral',
				})
			)
		);

		holds = holds.map(hold =>
			hold.id === 'hold-1' ? { ...hold, status: 'rejected' } : hold
		);
		rerenderPage();
		expect(screen.getAllByTestId('referral-hold-status')[0]).toHaveTextContent(
			'Rejected'
		);
	});
});
