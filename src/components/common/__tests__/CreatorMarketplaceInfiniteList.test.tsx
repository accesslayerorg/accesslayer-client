/**
 * Unit tests for CreatorMarketplaceInfiniteList — the IntersectionObserver-
 * driven infinite scroll marketplace listing (#685).
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import CreatorMarketplaceInfiniteList from '@/components/common/CreatorMarketplaceInfiniteList';
import { useInfiniteCreatorMarketplace } from '@/hooks/useInfiniteCreatorMarketplace';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import type { Course } from '@/services/course.service';

vi.mock('@/hooks/useInfiniteCreatorMarketplace');
vi.mock('@/hooks/useInfiniteScroll');

vi.mock('@/components/common/CreatorCard', async () => {
	const React = await import('react');
	return {
		default: ({ creator }: { creator: { id: string; title: string } }) =>
			React.createElement('article', { 'aria-label': `Creator ${creator.title}` }, creator.title),
	};
});

const mockUseInfiniteCreatorMarketplace = vi.mocked(useInfiniteCreatorMarketplace);
const mockUseInfiniteScroll = vi.mocked(useInfiniteScroll);

function makeCreator(id: string): Course {
	return {
		id,
		title: `Creator ${id}`,
		description: 'desc',
		price: 0.1,
		instructorId: id,
		category: 'Art',
		level: 'BEGINNER',
	};
}

const baseHookReturn = {
	creators: [] as Course[],
	hasMore: false,
	isLoadingFirstPage: false,
	isFetchingNextPage: false,
	isRefreshing: false,
	fetchNextPage: vi.fn(),
	error: null,
};

describe('CreatorMarketplaceInfiniteList', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockUseInfiniteScroll.mockReturnValue({ current: null });
	});

	it('shows the initial skeleton while the first page is loading', () => {
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			isLoadingFirstPage: true,
		});

		render(<CreatorMarketplaceInfiniteList />);

		expect(screen.getByTestId('creator-marketplace-initial-skeleton')).toBeInTheDocument();
		expect(screen.queryByTestId('creator-marketplace-infinite-list')).not.toBeInTheDocument();
	});

	it('renders every creator returned by the hook, with no duplicates', () => {
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [makeCreator('a'), makeCreator('b')],
		});

		render(<CreatorMarketplaceInfiniteList />);

		expect(screen.getByLabelText('Creator Creator a')).toBeInTheDocument();
		expect(screen.getByLabelText('Creator Creator b')).toBeInTheDocument();
		expect(screen.getAllByRole('article')).toHaveLength(2);
	});

	it('shows a skeleton row while the next page is fetching', () => {
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [makeCreator('a')],
			isFetchingNextPage: true,
			hasMore: true,
		});

		render(<CreatorMarketplaceInfiniteList />);

		expect(screen.getByTestId('creator-marketplace-next-page-skeleton')).toBeInTheDocument();
	});

	it('does not show the next-page skeleton once no more pages remain', () => {
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [makeCreator('a')],
			hasMore: false,
			isFetchingNextPage: false,
		});

		render(<CreatorMarketplaceInfiniteList />);

		expect(
			screen.queryByTestId('creator-marketplace-next-page-skeleton')
		).not.toBeInTheDocument();
		expect(screen.queryByTestId('creator-marketplace-sentinel')).not.toBeInTheDocument();
	});

	it('renders the sentinel and calls fetchNextPage via useInfiniteScroll when more pages remain', () => {
		const fetchNextPage = vi.fn();
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [makeCreator('a')],
			hasMore: true,
			fetchNextPage,
		});

		render(<CreatorMarketplaceInfiniteList />);

		expect(screen.getByTestId('creator-marketplace-sentinel')).toBeInTheDocument();

		// Simulate the sentinel scrolling into view by invoking the
		// onLoadMore callback useInfiniteScroll was configured with.
		const call = mockUseInfiniteScroll.mock.calls[0]![0];
		call.onLoadMore();

		expect(fetchNextPage).toHaveBeenCalledTimes(1);
	});

	it('disables the scroll observer while a page is already loading (enabled: false)', () => {
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [makeCreator('a')],
			hasMore: true,
			isFetchingNextPage: true,
		});

		render(<CreatorMarketplaceInfiniteList />);

		const call = mockUseInfiniteScroll.mock.calls[0]![0];
		expect(call.enabled).toBe(false);
		expect(call.hasMore).toBe(true);
	});

	describe('background refresh indicator (#691)', () => {
		it('shows a "Refreshing…" indicator while isRefreshing is true', () => {
			mockUseInfiniteCreatorMarketplace.mockReturnValue({
				...baseHookReturn,
				creators: [makeCreator('a')],
				isRefreshing: true,
			});

			render(<CreatorMarketplaceInfiniteList />);

			expect(
				screen.getByTestId('creator-marketplace-refreshing-indicator')
			).toBeInTheDocument();
			expect(screen.getByText('Refreshing…')).toBeInTheDocument();
		});

		it('does not show the refreshing indicator when isRefreshing is false', () => {
			mockUseInfiniteCreatorMarketplace.mockReturnValue({
				...baseHookReturn,
				creators: [makeCreator('a')],
				isRefreshing: false,
			});

			render(<CreatorMarketplaceInfiniteList />);

			expect(
				screen.queryByTestId('creator-marketplace-refreshing-indicator')
			).not.toBeInTheDocument();
		});

		it('still renders cached creators (no spinner) while refreshing in the background', () => {
			mockUseInfiniteCreatorMarketplace.mockReturnValue({
				...baseHookReturn,
				creators: [makeCreator('a'), makeCreator('b')],
				isRefreshing: true,
				isLoadingFirstPage: false,
			});

			render(<CreatorMarketplaceInfiniteList />);

			expect(screen.queryByTestId('creator-marketplace-initial-skeleton')).not.toBeInTheDocument();
			expect(screen.getAllByRole('article')).toHaveLength(2);
		});
	});
});
