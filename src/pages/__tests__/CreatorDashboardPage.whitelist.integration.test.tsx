import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreatorDashboardPage from '../CreatorDashboardPage';
import { courseService, type Course } from '@/services/course.service';
import { creatorWhitelistService } from '@/services/creatorWhitelist.service';
import { cacheManager } from '@/utils/cache.utils';
import showToast from '@/utils/toast.util';

const CREATOR_ADDRESS = 'GCREATORWALLETADDRESS000000000000000000000000000000000000';
const KEY_ID = 'creator-1';

const ADDR_1 = 'GBZXN7PIRZGNMHGA72W2DISDGFICRHDEG644GQNDYAWXCVFD3FYMVWAC';
const ADDR_2 = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ';
const ADDR_3 = 'GCKFBEIYV2U22IO2GUOWGQPTZXCOTIZPGWFFSUK2BUMDHQIBNXFHZU4P';

const connectedAddress = { current: CREATOR_ADDRESS as string | undefined };

vi.mock('wagmi', () => ({
	useAccount: () => ({ address: connectedAddress.current }),
}));

vi.mock('@/services/course.service', async importOriginal => {
	const original = await importOriginal<typeof import('@/services/course.service')>();
	return {
		...original,
		courseService: {
			...original.courseService,
			getCourse: vi.fn(),
			getKeyVesting: vi.fn(),
			getKeyVestingClaims: vi.fn(),
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

function createCourse(overrides: Partial<Course> = {}): Course {
	return {
		id: KEY_ID,
		title: 'Creator One',
		description: 'A creator key',
		price: 10,
		instructorId: CREATOR_ADDRESS,
		category: 'Design',
		level: 'BEGINNER',
		creatorShareSupply: 100,
		isWhitelistEnabled: true,
		whitelist: [
			{ walletAddress: ADDR_1, addedAt: '2026-09-27T10:00:00.000Z' },
			{ walletAddress: ADDR_2, addedAt: '2026-09-27T11:00:00.000Z' },
		],
		...overrides,
	} as Course;
}

function renderDashboard(tab = 'settings') {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[`/creator/${KEY_ID}/dashboard?tab=${tab}`]}>
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

describe('CreatorDashboardPage Whitelist Management Integration', () => {
	beforeEach(() => {
		connectedAddress.current = CREATOR_ADDRESS;
		cacheManager.invalidateAll();
		creatorWhitelistService.clearLocalStore();
		mockGetCourse.mockResolvedValue(createCourse());
		mockGetKeyVesting.mockResolvedValue({
			totalAllocationXlm: 0,
			claimedAmountXlm: 0,
			vestedAmountXlm: 0,
			claimableXlm: 0,
		});
		mockGetKeyVestingClaims.mockResolvedValue([]);
		vi.mocked(showToast.success).mockClear();
		vi.mocked(showToast.error).mockClear();
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it('renders whitelist management panel on the creator dashboard settings tab', async () => {
		renderDashboard('settings');

		await waitFor(() =>
			expect(screen.getByTestId('whitelist-section')).toBeInTheDocument()
		);

		expect(screen.getByTestId('whitelist-table')).toBeInTheDocument();
		expect(screen.getByTestId(`whitelist-row-${ADDR_1}`)).toBeInTheDocument();
		expect(screen.getByTestId(`whitelist-row-${ADDR_2}`)).toBeInTheDocument();
		expect(screen.getByTestId('whitelist-gate-status')).toHaveTextContent(/active/i);
	});

	it('adds a new wallet address to the whitelist', async () => {
		renderDashboard('settings');

		await waitFor(() =>
			expect(screen.getByTestId('whitelist-address-input')).toBeInTheDocument()
		);

		const input = screen.getByTestId('whitelist-address-input');
		const addButton = screen.getByTestId('whitelist-add-button');

		fireEvent.change(input, { target: { value: ADDR_3 } });
		fireEvent.click(addButton);

		await waitFor(() => {
			expect(screen.getByTestId(`whitelist-row-${ADDR_3}`)).toBeInTheDocument();
		});

		expect(showToast.success).toHaveBeenCalledWith(
			expect.stringMatching(/whitelist updated/i)
		);
	});

	it('removes a wallet address with confirmation dialog', async () => {
		renderDashboard('settings');

		await waitFor(() =>
			expect(screen.getByTestId(`whitelist-remove-${ADDR_1}`)).toBeInTheDocument()
		);

		fireEvent.click(screen.getByTestId(`whitelist-remove-${ADDR_1}`));

		// Confirmation dialog should be visible
		expect(screen.getByTestId('remove-wallet-modal')).toBeInTheDocument();

		fireEvent.click(screen.getByTestId('confirm-remove-wallet-btn'));

		await waitFor(() => {
			expect(screen.queryByTestId(`whitelist-row-${ADDR_1}`)).not.toBeInTheDocument();
			expect(showToast.success).toHaveBeenCalledWith('Wallet removed from whitelist');
		});
	});

	it('disables early access whitelist with irreversibility confirmation modal', async () => {
		renderDashboard('settings');

		const toggleBtn = await waitFor(() =>
			screen.getByTestId('whitelist-gate-toggle')
		);

		fireEvent.click(toggleBtn);

		// Irreversibility modal should be visible
		expect(screen.getByTestId('disable-whitelist-modal')).toBeInTheDocument();
		expect(screen.getByTestId('disable-whitelist-warning')).toHaveTextContent(
			/irreversible/i
		);

		fireEvent.click(screen.getByTestId('confirm-disable-whitelist-btn'));

		await waitFor(() => {
			expect(screen.getByTestId('whitelist-gate-status')).toHaveTextContent(/disabled/i);
		});

		expect(screen.getByTestId('whitelist-gate-toggle')).toBeDisabled();
		expect(screen.getByTestId('whitelist-disabled-banner')).toBeInTheDocument();
		expect(showToast.success).toHaveBeenCalledWith('Early access whitelist disabled');
	});
});
