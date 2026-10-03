import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import CreatorPublicProfilePage from '@/pages/CreatorPublicProfilePage';
import { courseService, type Course } from '@/services/course.service';
import { leaderboardService } from '@/services/leaderboard.service';
import {
	CREATOR_FOLLOWS_STORAGE_KEY,
	useCreatorFollows,
} from '@/hooks/useCreatorFollows';

vi.mock('@/services/course.service', () => ({
	courseService: { getCourses: vi.fn() },
}));

vi.mock('@/services/leaderboard.service', () => ({
	leaderboardService: { getRatingsLeaderboard: vi.fn() },
}));

const CREATOR_ADDRESS = 'GARIVERS';

function makeKey(overrides: Partial<Course> = {}): Course {
	return {
		id: 'key-1',
		title: 'Alpha Key',
		description: 'First key',
		price: 0.5,
		priceStroops: 5_000_000,
		instructorId: CREATOR_ADDRESS,
		category: 'Art',
		level: 'BEGINNER',
		...overrides,
	};
}

const alphaKey = makeKey({
	id: 'key-1',
	title: 'Alpha Key',
	name: 'Alex Rivers',
	totalVolume: 2_000_000,
	holderCount: 10,
});

const betaKey = makeKey({
	id: 'key-2',
	title: 'Beta Key',
	name: 'Alex Rivers',
	price: 1,
	priceStroops: 10_000_000,
	totalVolume: 6_000_000,
	holderCount: 20,
	deprecated: true,
});

const otherCreatorKey = makeKey({
	id: 'key-3',
	title: 'Gamma Key',
	instructorId: 'GSOMEONEELSE',
});

const mockGetCourses = vi.mocked(courseService.getCourses);
const mockGetRatings = vi.mocked(leaderboardService.getRatingsLeaderboard);

function renderPage(address: string = CREATOR_ADDRESS) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter initialEntries={[`/creator/${address}/profile`]}>
				<Routes>
					<Route
						path="/creator/:address/profile"
						element={<CreatorPublicProfilePage />}
					/>
				</Routes>
			</MemoryRouter>
		</QueryClientProvider>
	);
}

describe('CreatorPublicProfilePage (#1054)', () => {
	beforeEach(() => {
		window.localStorage.clear();
		useCreatorFollows.setState({ followedCreators: {} });
		mockGetCourses.mockReset();
		mockGetRatings.mockReset();
		mockGetRatings.mockResolvedValue([]);
	});

	afterEach(() => {
		cleanup();
	});

	it('aggregates stats across all of the creator keys', async () => {
		mockGetCourses.mockResolvedValue([alphaKey, betaKey, otherCreatorKey]);
		mockGetRatings.mockResolvedValue([
			{
				id: 'key-1',
				title: 'Alpha Key',
				price: 0.5,
				averageRating: 4,
				reviewCount: 2,
			},
			{
				id: 'key-2',
				title: 'Beta Key',
				price: 1,
				averageRating: 5,
				reviewCount: 3,
			},
		]);

		renderPage();

		await waitFor(() =>
			expect(
				screen.getByTestId('creator-public-profile-name')
			).toHaveTextContent('Alex Rivers')
		);

		// Volume and holders are summed across the creator's two keys only.
		expect(
			screen.getByLabelText('Total Volume Traded: 0.8 XLM')
		).toBeInTheDocument();
		expect(screen.getByLabelText('Total Holders: 30')).toBeInTheDocument();
		// Mean of the two rated keys (4 and 5).
		expect(
			screen.getByLabelText('Avg Key Rating: 4.5 ★')
		).toBeInTheDocument();
		expect(screen.getByLabelText('Keys Deployed: 2')).toBeInTheDocument();
	});

	it('shows the correct status and price for each deployed key', async () => {
		mockGetCourses.mockResolvedValue([alphaKey, betaKey, otherCreatorKey]);

		renderPage();

		await waitFor(() =>
			expect(screen.getAllByTestId('deployed-key-card')).toHaveLength(2)
		);

		// Sorted by volume: Beta Key (deprecated, 1 XLM) then Alpha Key (0.5 XLM).
		expect(
			screen
				.getAllByTestId('deployed-key-status')
				.map(node => node.textContent)
		).toEqual(['Deprecated', 'Live']);
		expect(
			screen
				.getAllByTestId('deployed-key-price')
				.map(node => node.textContent)
		).toEqual(['1 XLM', '0.5 XLM']);

		expect(
			screen.getAllByTestId('deployed-key-invest-cta')[0]
		).toHaveAttribute('href', '/creator/key-2');
	});

	it('renders no social links when the creator has not set any', async () => {
		mockGetCourses.mockResolvedValue([makeKey({ socialHandle: undefined })]);

		renderPage();

		await waitFor(() =>
			expect(
				screen.getByTestId('creator-public-profile-header')
			).toBeInTheDocument()
		);

		expect(
			screen.queryByTestId('creator-social-links')
		).not.toBeInTheDocument();
	});

	it('renders only the social links the creator published', async () => {
		mockGetCourses.mockResolvedValue([
			makeKey({
				socialHandle: undefined,
				socialLinks: {
					twitter: 'arivers',
					website: 'arivers.dev',
					discord: 'invite-code',
				},
			}),
		]);

		renderPage();

		await waitFor(() =>
			expect(
				screen.getByTestId('creator-social-link-twitter')
			).toBeInTheDocument()
		);

		expect(screen.getByTestId('creator-social-link-twitter')).toHaveAttribute(
			'href',
			'https://x.com/arivers'
		);
		expect(screen.getByTestId('creator-social-link-website')).toHaveAttribute(
			'href',
			'https://arivers.dev'
		);
		expect(screen.getByTestId('creator-social-link-discord')).toHaveAttribute(
			'href',
			'https://discord.gg/invite-code'
		);
	});

	it('keeps the follow state across a page refresh', async () => {
		const user = userEvent.setup();
		mockGetCourses.mockResolvedValue([alphaKey]);

		const first = renderPage();

		await waitFor(() =>
			expect(screen.getByTestId('follow-button')).toHaveTextContent('Follow')
		);

		await user.click(screen.getByTestId('follow-button'));

		expect(screen.getByTestId('follow-button')).toHaveTextContent(
			'Following'
		);
		expect(
			window.localStorage.getItem(CREATOR_FOLLOWS_STORAGE_KEY)
		).toContain(CREATOR_ADDRESS.toLowerCase());

		// Re-mount with a fresh query client to emulate a full page refresh.
		first.unmount();
		renderPage();

		await waitFor(() =>
			expect(screen.getByTestId('follow-button')).toHaveTextContent(
				'Following'
			)
		);
	});

	it('renders a 404 state for an unknown creator address', async () => {
		mockGetCourses.mockResolvedValue([otherCreatorKey]);

		renderPage('GUNKNOWN');

		await waitFor(() =>
			expect(
				screen.getByTestId('creator-profile-not-found')
			).toBeInTheDocument()
		);

		expect(screen.getByText('Creator not found')).toBeInTheDocument();
		expect(
			screen.queryByTestId('creator-public-profile-header')
		).not.toBeInTheDocument();
	});
});
