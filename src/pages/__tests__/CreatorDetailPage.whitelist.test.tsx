import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CreatorDetailPage from '../CreatorDetailPage';
import { courseService, type Course } from '@/services/course.service';
import { useProfileStore, demoUser } from '@/hooks/useProfileStore';

const CREATOR_ID = 'creator-1';
const CREATOR_WALLET = 'GCREATORWALLETADDRESS000000000000000000000000000000000000';
const WHITELISTED_WALLET = 'GBZXN7PIRZGNMHGA72W2DISDGFICRHDEG644GQNDYAWXCVFD3FYMVWAC';
const NON_WHITELISTED_WALLET = 'GCEZWKCA5VLDNRLN3RPRJMRZOX3Z6G5CHCGSNFHEYVXM3XOJMDS674JZ';

vi.mock('@/services/course.service', () => ({
	courseService: {
		getCourse: vi.fn(),
		getHoldersPage: vi.fn().mockResolvedValue({ holders: [], nextCursor: null }),
		getKeyTwap: vi.fn().mockResolvedValue({ priceStroops: 10_000_000 }),
		getKeyStats: vi.fn().mockResolvedValue({
			supply: 100,
			holderCount: 10,
			volume24h: 0,
			totalVolume: 0,
			twap1h: null,
			twap24h: null,
		}),
		getKeyUniqueTraders: vi.fn().mockResolvedValue({
			uniqueTraders: 15,
			uniqueTraders24hAgo: 10,
		}),
		getKeyConfig: vi.fn().mockResolvedValue({
			buyPriceStroops: 10_000_000,
			sellPriceStroops: 9_500_000,
			spreadStroops: 500_000,
			spreadBps: 500,
		}),
		getKeyOraclePrice: vi.fn().mockResolvedValue({
			priceStroops: 10_000_000,
			updatedAt: new Date().toISOString(),
			source: 'OracleFeed',
		}),
		getPerformanceBond: vi.fn().mockResolvedValue(null),
	},
}));

vi.mock('@/hooks/usePurchaseConfetti', () => ({
	usePurchaseConfetti: () => {},
}));

vi.mock('@/hooks/useDocumentTitle', () => ({
	useDocumentTitle: () => {},
}));

vi.mock('@/hooks/useNavigationTiming', () => ({
	useNavigationTiming: () => {},
}));

vi.mock('@/hooks/useCreatorProfileStaleIndicator', () => ({
	useCreatorProfileStaleIndicator: () => ({
		shouldShowBadge: false,
		handleRefetch: vi.fn(),
	}),
}));

const mockGetCourse = vi.mocked(courseService.getCourse);

function createCourse(overrides: Partial<Course> = {}): Course {
	return {
		id: CREATOR_ID,
		title: 'Alpha Creator',
		description: 'Exclusive key in early access',
		price: 10,
		priceStroops: 10_000_000,
		instructorId: CREATOR_WALLET,
		category: 'Tech',
		level: 'BEGINNER',
		creatorShareSupply: 100,
		isWhitelistEnabled: true,
		whitelist: [
			{
				walletAddress: WHITELISTED_WALLET,
				addedAt: '2026-09-27T12:00:00.000Z',
			},
		],
		...overrides,
	} as Course;
}

function renderDetailPage() {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[`/creator/${CREATOR_ID}`]}>
				<Routes>
					<Route path="/creator/:id" element={<CreatorDetailPage />} />
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>
	);
}

describe('CreatorDetailPage Whitelist Gate & Status Badge (Acceptance Criteria 5)', () => {
	beforeEach(() => {
		useProfileStore.setState({
			profile: { ...demoUser, id: NON_WHITELISTED_WALLET },
		});
	});

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it('shows the whitelist status badge for locked-out / non-whitelisted visitors', async () => {
		mockGetCourse.mockResolvedValue(createCourse());

		renderDetailPage();

		await waitFor(() => {
			expect(
				screen.getByTestId('whitelist-status-badge')
			).toBeInTheDocument();
		});

		expect(
			screen.getByText(/early access is restricted to approved whitelisted wallets/i)
		).toBeInTheDocument();

		const buyButton = screen.getByTestId('key-detail-buy-button');
		expect(buyButton).toBeDisabled();
		expect(buyButton).toHaveTextContent(/buy locked/i);
	});

	it('shows the whitelist status badge when visitor is not logged in / no wallet connected', async () => {
		useProfileStore.setState({ profile: null });
		mockGetCourse.mockResolvedValue(createCourse());

		renderDetailPage();

		await waitFor(() => {
			expect(
				screen.getByTestId('whitelist-status-badge')
			).toBeInTheDocument();
		});

		const buyButton = screen.getByTestId('key-detail-buy-button');
		expect(buyButton).toBeDisabled();
	});

	it('hides the whitelist status badge for whitelisted visitors', async () => {
		useProfileStore.setState({
			profile: { ...demoUser, id: WHITELISTED_WALLET },
		});
		mockGetCourse.mockResolvedValue(createCourse());

		renderDetailPage();

		await waitFor(() => {
			expect(screen.getByTestId('creator-stat-cards')).toBeInTheDocument();
		});

		expect(
			screen.queryByTestId('whitelist-status-badge')
		).not.toBeInTheDocument();

		const buyButton = screen.getByTestId('key-detail-buy-button');
		expect(buyButton).not.toBeDisabled();
		expect(buyButton).toHaveTextContent(/buy key/i);
	});

	it('hides the whitelist status badge for the key creator', async () => {
		useProfileStore.setState({
			profile: { ...demoUser, id: CREATOR_WALLET },
		});
		mockGetCourse.mockResolvedValue(createCourse());

		renderDetailPage();

		await waitFor(() => {
			expect(screen.getByTestId('creator-stat-cards')).toBeInTheDocument();
		});

		expect(
			screen.queryByTestId('whitelist-status-badge')
		).not.toBeInTheDocument();
	});

	it('hides the whitelist status badge when whitelist gate is disabled', async () => {
		mockGetCourse.mockResolvedValue(
			createCourse({ isWhitelistEnabled: false, whitelistEnabled: false })
		);

		renderDetailPage();

		await waitFor(() => {
			expect(screen.getByTestId('creator-stat-cards')).toBeInTheDocument();
		});

		expect(
			screen.queryByTestId('whitelist-status-badge')
		).not.toBeInTheDocument();

		const buyButton = screen.getByTestId('key-detail-buy-button');
		expect(buyButton).not.toBeDisabled();
	});
});
