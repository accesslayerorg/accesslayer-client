import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreatorDashboardPage from '../CreatorDashboardPage';
import { courseService, type Course } from '@/services/course.service';
import { curveMigrationService } from '@/services/curveMigration.service';
import { cacheManager } from '@/utils/cache.utils';
import showToast from '@/utils/toast.util';
import type { CurveMigration } from '@/types/curveMigration';

const CREATOR_ADDRESS = 'GCREATORWALLETADDRESS0000000000000000';
const OTHER_ADDRESS = '0x1111111111111111111111111111111111111111';
const KEY_ID = 'creator-1';

const connectedAddress = { current: OTHER_ADDRESS as string | undefined };

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

vi.mock('@/services/curveMigration.service', async importOriginal => {
	const original =
		await importOriginal<typeof import('@/services/curveMigration.service')>();
	return {
		...original,
		curveMigrationService: {
			...original.curveMigrationService,
			getMigrations: vi.fn(),
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
const mockGetMigrations = vi.mocked(curveMigrationService.getMigrations);

function createCourse(overrides: Partial<Course> = {}): Course {
	return {
		id: KEY_ID,
		title: 'Creator One',
		description: 'A creator',
		price: 10,
		instructorId: CREATOR_ADDRESS,
		category: 'Design',
		level: 'BEGINNER',
		quorumBps: 2000,
		creatorShareSupply: 100,
		...overrides,
	} as Course;
}

function createMigration(overrides: Partial<CurveMigration> = {}): CurveMigration {
	return {
		id: 'migration-1',
		keyId: KEY_ID,
		title: 'Tighten the curve',
		status: 'pending',
		currentParams: {
			basePriceStroops: 10_000_000,
			growthFactor: 1.01,
			milestones: [],
		},
		proposedParams: {
			basePriceStroops: 20_000_000,
			growthFactor: 1.02,
			milestones: [{ supply: 500, exponent: 3 }],
		},
		timelockEndsAt: new Date(Date.now() - 60_000).toISOString(),
		forVotes: 60,
		againstVotes: 20,
		quorumBps: 2000,
		eligibleVotingWeight: 100,
		totalCirculatingSupply: 100,
		totalVotingWeight: 80,
		...overrides,
	};
}

function renderDashboard() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter
				initialEntries={[`/creator/${KEY_ID}/dashboard?tab=governance`]}
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

describe('CreatorDashboardPage curve migration section', () => {
	beforeEach(() => {
		connectedAddress.current = CREATOR_ADDRESS;
		cacheManager.invalidateAll();
		mockGetCourse.mockResolvedValue(createCourse());
		mockGetKeyVesting.mockResolvedValue({
			totalAllocationXlm: 0,
			claimedAmountXlm: 0,
			vestedAmountXlm: 0,
			claimableXlm: 0,
		});
		mockGetKeyVestingClaims.mockResolvedValue([]);
		mockGetMigrations.mockResolvedValue([]);
		vi.mocked(showToast.success).mockClear();
		vi.mocked(showToast.error).mockClear();
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it('renders the migration section for the creator wallet with pending and executed migrations', async () => {
		mockGetMigrations.mockResolvedValue([
			createMigration(),
			createMigration({
				id: 'migration-done',
				status: 'executed',
				executedAt: '2027-03-12T00:00:00.000Z',
			}),
		]);

		renderDashboard();

		await waitFor(() =>
			expect(
				screen.getByTestId('curve-migration-pending-migration-1')
			).toBeInTheDocument()
		);

		expect(
			screen.getByTestId('curve-migration-section')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('curve-migration-pending-section')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('curve-migration-history-section')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('curve-migration-history-migration-done')
		).toBeInTheDocument();
		expect(mockGetMigrations).toHaveBeenCalledWith(KEY_ID);
	});

	it('executes an approved migration and confirms it with a toast', async () => {
		mockGetMigrations.mockResolvedValue([createMigration()]);

		renderDashboard();

		const executeButton = await waitFor(() =>
			screen.getByTestId('curve-migration-execute-migration-1')
		);
		expect(executeButton).not.toBeDisabled();

		fireEvent.click(executeButton);

		await waitFor(
			() => expect(showToast.success).toHaveBeenCalledWith('Curve migration executed'),
			{ timeout: 5000 }
		);
		expect(showToast.error).not.toHaveBeenCalled();
	});

	it('keeps Execute disabled while the timelock is still counting down', async () => {
		mockGetMigrations.mockResolvedValue([
			createMigration({
				timelockEndsAt: new Date(Date.now() + 3_600_000).toISOString(),
			}),
		]);

		renderDashboard();

		await waitFor(() =>
			expect(
				screen.getByTestId('curve-migration-execute-migration-1')
			).toBeDisabled()
		);
		expect(
			screen.getByTestId('curve-migration-disabled-reason-migration-1')
		).toHaveTextContent(/timelock/i);
	});

	it('hides the section and skips the query for a non-creator wallet', async () => {
		connectedAddress.current = OTHER_ADDRESS;
		mockGetMigrations.mockResolvedValue([createMigration()]);

		renderDashboard();

		await waitFor(() =>
			expect(
				screen.getByTestId('dashboard-governance-panel')
			).toBeInTheDocument()
		);
		expect(
			screen.queryByTestId('curve-migration-section')
		).not.toBeInTheDocument();
		expect(mockGetMigrations).not.toHaveBeenCalled();
	});

	it('surfaces a migration query failure without breaking the governance tab', async () => {
		mockGetMigrations.mockRejectedValue(new Error('network down'));

		renderDashboard();

		await waitFor(() =>
			expect(
				screen.getByTestId('curve-migration-panel-error')
			).toBeInTheDocument()
		);
		expect(
			screen.getByTestId('quorum-settings-panel')
		).toBeInTheDocument();
	});
});
