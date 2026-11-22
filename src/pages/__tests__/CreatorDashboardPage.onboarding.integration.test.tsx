import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreatorDashboardPage from '../CreatorDashboardPage';
import { courseService, type Course } from '@/services/course.service';
import { announcementService } from '@/services/announcement.service';
import { creatorWhitelistService } from '@/services/creatorWhitelist.service';
import {
	stakingPoolService,
	type StakingRewardPool,
} from '@/services/stakingPool.service';
import { saveCreatorDistributionHistory } from '@/utils/creatorRevenue.utils';
import { cacheManager } from '@/utils/cache.utils';

const CREATOR_ADDRESS =
	'GCREATORWALLETADDRESS000000000000000000000000000000000000';
const OTHER_ADDRESS =
	'GSOMEOTHERWALLET0000000000000000000000000000000000000000';
const KEY_ID = 'creator-onboarding-1';
const WHITELIST_ADDR =
	'GBZXN7PIRZGNMHGA72W2DISDGFICRHDEG644GQNDYAWXCVFD3FYMVWAC';

const connectedAddress = { current: CREATOR_ADDRESS as string | undefined };

vi.mock('wagmi', () => ({
	useAccount: () => ({ address: connectedAddress.current }),
}));

vi.mock('@/services/course.service', async importOriginal => {
	const original =
		await importOriginal<typeof import('@/services/course.service')>();
	return {
		...original,
		courseService: {
			...original.courseService,
			getCourse: vi.fn(),
			getKeyVesting: vi.fn(),
			getKeyVestingClaims: vi.fn(),
			getKeyPriceFloor: vi.fn(),
		},
	};
});

vi.mock('@/services/announcement.service', async importOriginal => {
	const original =
		await importOriginal<typeof import('@/services/announcement.service')>();
	return {
		...original,
		announcementService: {
			...original.announcementService,
			getCreatorAnnouncements: vi.fn(),
		},
	};
});

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		transactionSuccess: vi.fn(),
	},
}));

const mockGetCourse = vi.mocked(courseService.getCourse);
const mockGetKeyVesting = vi.mocked(courseService.getKeyVesting);
const mockGetKeyVestingClaims = vi.mocked(courseService.getKeyVestingClaims);
const mockGetKeyPriceFloor = vi.mocked(courseService.getKeyPriceFloor);
const mockGetAnnouncements = vi.mocked(
	announcementService.getCreatorAnnouncements
);

/** Mutable backend state the mocked services read from. */
const backend = { poolBalanceXlm: 0 };

function makePool(): StakingRewardPool {
	return {
		poolBalanceXlm: backend.poolBalanceXlm,
		totalStakedXlm: 100,
		rewardRate: 0.05,
		projectedRewardRate: 0.08,
		daysOfRewardsRemaining: 30,
	};
}

function createCourse(): Course {
	return {
		id: KEY_ID,
		title: 'Onboarding Creator',
		description: 'A new creator key',
		price: 10,
		instructorId: CREATOR_ADDRESS,
		category: 'Design',
		level: 'BEGINNER',
		creatorShareSupply: 100,
		isWhitelistEnabled: true,
		whitelist: [],
	} as Course;
}

type CompletedSetup = {
	priceFloor?: boolean;
	announcement?: boolean;
	distribution?: boolean;
	pool?: boolean;
};

/** Seeds the backend so the given steps (whitelist excluded) are complete. */
function seedBackend({
	priceFloor = false,
	announcement = false,
	distribution = false,
	pool = false,
}: CompletedSetup = {}) {
	mockGetKeyPriceFloor.mockResolvedValue(
		priceFloor
			? { keyId: KEY_ID, floorPriceStroops: 5_000_000, isActive: true }
			: null
	);
	mockGetAnnouncements.mockResolvedValue(
		announcement
			? [
					{
						id: 'a1',
						title: 'Welcome',
						category: 'update',
						contentHash: 'Qm123',
						createdAt: '2026-11-01T00:00:00.000Z',
					} as never,
				]
			: []
	);
	backend.poolBalanceXlm = pool ? 25 : 0;
	if (distribution) {
		saveCreatorDistributionHistory(KEY_ID, [
			{
				id: 'd1',
				creatorId: KEY_ID,
				amount: 10,
				timestamp: Date.now(),
				holderCount: 3,
				status: 'confirmed',
			},
		]);
	}
}

function renderDashboard(tab = 'overview') {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter
				initialEntries={[`/creator/${KEY_ID}/dashboard?tab=${tab}`]}
			>
				<Routes>
					<Route
						path="/creator/:id/dashboard"
						element={<CreatorDashboardPage />}
					/>
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>
	);
}

const statusOf = (id: string) =>
	screen.getByTestId(`onboarding-step-${id}`).getAttribute('data-status');

describe('CreatorDashboardPage onboarding checklist (#1248)', () => {
	const scrollIntoView = vi.fn();

	beforeEach(() => {
		connectedAddress.current = CREATOR_ADDRESS;
		cacheManager.invalidateAll();
		creatorWhitelistService.clearLocalStore();
		window.localStorage.clear();
		backend.poolBalanceXlm = 0;

		mockGetCourse.mockResolvedValue(createCourse());
		mockGetKeyVesting.mockResolvedValue({
			totalAllocationXlm: 0,
			claimedAmountXlm: 0,
			vestedAmountXlm: 0,
			claimableXlm: 0,
		});
		mockGetKeyVestingClaims.mockResolvedValue([]);

		vi.spyOn(stakingPoolService, 'getRewardPool').mockImplementation(
			async () => makePool()
		);
		vi.spyOn(stakingPoolService, 'fundRewardPool').mockImplementation(
			async () => {
				backend.poolBalanceXlm = 50;
				return { transactionHash: '0xabc', pool: makePool() };
			}
		);

		Element.prototype.scrollIntoView = scrollIntoView;
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	it('renders all five steps with the correct completed/pending status', async () => {
		seedBackend({ priceFloor: true, announcement: true });
		renderDashboard();

		expect(
			await screen.findByTestId('onboarding-checklist')
		).toBeInTheDocument();

		expect(statusOf('price-floor')).toBe('completed');
		expect(statusOf('whitelist')).toBe('pending');
		expect(statusOf('announcement')).toBe('completed');
		expect(statusOf('staking-pool')).toBe('pending');
		expect(statusOf('distribution')).toBe('pending');
	});

	it('reflects the completed share of steps in the progress bar', async () => {
		seedBackend({ priceFloor: true, announcement: true });
		renderDashboard();

		const bar = await screen.findByTestId('onboarding-progress-bar');
		expect(bar).toHaveAttribute('aria-valuenow', '40');
		expect(screen.getByTestId('onboarding-progress-label')).toHaveTextContent(
			'40%'
		);
	});

	it('does not show the checklist to a wallet that is not the key creator', async () => {
		connectedAddress.current = OTHER_ADDRESS;
		seedBackend();
		renderDashboard();

		expect(
			await screen.findByTestId('dashboard-overview-panel')
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('onboarding-checklist')
		).not.toBeInTheDocument();
		// The creator-only status queries stay disabled for other viewers.
		expect(mockGetKeyPriceFloor).not.toHaveBeenCalled();
	});

	it('navigates each CTA to the panel for that step', async () => {
		seedBackend();
		renderDashboard('overview');
		await screen.findByTestId('onboarding-checklist');

		// Whitelist -> Settings tab, whitelist section
		fireEvent.click(screen.getByTestId('onboarding-step-whitelist-cta'));
		expect(
			await screen.findByTestId('whitelist-section')
		).toBeInTheDocument();
		await waitFor(() =>
			expect(scrollIntoView).toHaveBeenLastCalledWith(
				expect.objectContaining({ block: 'start' })
			)
		);
		expect(
			scrollIntoView.mock.contexts[scrollIntoView.mock.contexts.length - 1]
		).toBe(document.getElementById('whitelist-section'));

		// Staking pool -> Settings tab, staking pool section with the fund form
		fireEvent.click(screen.getByTestId('onboarding-step-staking-pool-cta'));
		expect(
			await screen.findByTestId('fund-reward-pool-form')
		).toBeInTheDocument();
		await waitFor(() =>
			expect(
				scrollIntoView.mock.contexts[
					scrollIntoView.mock.contexts.length - 1
				]
			).toBe(document.getElementById('staking-pool-section'))
		);

		// Price floor -> Settings tab, bonding-curve section
		fireEvent.click(screen.getByTestId('onboarding-step-price-floor-cta'));
		await waitFor(() =>
			expect(
				scrollIntoView.mock.contexts[
					scrollIntoView.mock.contexts.length - 1
				]
			).toBe(document.getElementById('graduated-curve-section'))
		);

		// Announcement -> Overview tab, announcements section
		fireEvent.click(screen.getByTestId('onboarding-step-announcement-cta'));
		expect(
			await screen.findByTestId('dashboard-announcements-section')
		).toBeInTheDocument();
		await waitFor(() =>
			expect(
				scrollIntoView.mock.contexts[
					scrollIntoView.mock.contexts.length - 1
				]
			).toBe(document.getElementById('dashboard-announcements-section'))
		);

		// Distribution -> Revenue tab, distribute section
		fireEvent.click(screen.getByTestId('onboarding-step-distribution-cta'));
		expect(
			await screen.findByTestId('dashboard-revenue-panel')
		).toBeInTheDocument();
		await waitFor(() =>
			expect(
				scrollIntoView.mock.contexts[
					scrollIntoView.mock.contexts.length - 1
				]
			).toBe(document.getElementById('distribute-revenue-section'))
		);
		expect(
			document.getElementById('distribute-revenue-section')
		).toContainElement(screen.getByTestId('distribute-revenue-panel'));
	});

	it('updates steps in real time, and hides the checklist once all are done', async () => {
		// Three steps done; whitelist and staking pool remain.
		seedBackend({ priceFloor: true, announcement: true, distribution: true });
		renderDashboard('settings');

		expect(
			await screen.findByTestId('onboarding-checklist')
		).toBeInTheDocument();
		expect(screen.getByTestId('onboarding-progress-bar')).toHaveAttribute(
			'aria-valuenow',
			'60'
		);
		expect(statusOf('whitelist')).toBe('pending');

		// Complete the whitelist step from its panel — no remount, no reload.
		fireEvent.change(await screen.findByTestId('whitelist-address-input'), {
			target: { value: WHITELIST_ADDR },
		});
		fireEvent.click(screen.getByTestId('whitelist-add-button'));

		await waitFor(() => expect(statusOf('whitelist')).toBe('completed'));
		expect(screen.getByTestId('onboarding-progress-bar')).toHaveAttribute(
			'aria-valuenow',
			'80'
		);
		expect(statusOf('staking-pool')).toBe('pending');

		// Complete the last step; the checklist disappears.
		fireEvent.change(await screen.findByTestId('fund-pool-amount'), {
			target: { value: '50' },
		});
		fireEvent.click(screen.getByTestId('fund-pool-submit'));

		await waitFor(() =>
			expect(
				screen.queryByTestId('onboarding-checklist')
			).not.toBeInTheDocument()
		);
		// ...while the rest of the dashboard is untouched.
		expect(
			screen.getByTestId('dashboard-settings-panel')
		).toBeInTheDocument();
	});

	it('is hidden on load when every step is already complete', async () => {
		seedBackend({
			priceFloor: true,
			announcement: true,
			distribution: true,
			pool: true,
		});
		await creatorWhitelistService.addAddresses(KEY_ID, [WHITELIST_ADDR]);
		renderDashboard();

		expect(
			await screen.findByTestId('dashboard-overview-panel')
		).toBeInTheDocument();
		// Let every status query settle, then confirm the card never appears.
		await waitFor(() => expect(mockGetKeyPriceFloor).toHaveBeenCalled());
		await waitFor(() => expect(mockGetAnnouncements).toHaveBeenCalled());
		expect(
			screen.queryByTestId('onboarding-checklist')
		).not.toBeInTheDocument();
	});
});
