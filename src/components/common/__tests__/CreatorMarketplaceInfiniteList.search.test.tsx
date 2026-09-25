/**
 * Unit tests for the marketplace search bar (#699): filters the currently
 * loaded creators client-side by display name, debounced by 300ms.
 */
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
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

function makeCreator(id: string, title: string): Course {
	return {
		id,
		title,
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
	fetchNextPage: vi.fn(),
	error: null,
};

describe('CreatorMarketplaceInfiniteList search', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.useFakeTimers();
		mockUseInfiniteScroll.mockReturnValue({ current: null });
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [
				makeCreator('a', 'Alice Wonderland'),
				makeCreator('b', 'Bob Builder'),
				makeCreator('c', 'ALICIA Keys'),
			],
		});
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('renders the search input above the key list', () => {
		render(<CreatorMarketplaceInfiniteList />);
		expect(screen.getByPlaceholderText('Search creators')).toBeInTheDocument();
	});

	it('filters the list to matching creators within 300ms of the user stopping typing', () => {
		render(<CreatorMarketplaceInfiniteList />);

		fireEvent.change(screen.getByPlaceholderText('Search creators'), {
			target: { value: 'bob' },
		});

		// Before the debounce window elapses, the full list is still shown.
		expect(screen.getByLabelText('Creator Alice Wonderland')).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(300);
		});

		expect(screen.queryByLabelText('Creator Alice Wonderland')).not.toBeInTheDocument();
		expect(screen.getByLabelText('Creator Bob Builder')).toBeInTheDocument();
	});

	it('matches case-insensitively', () => {
		render(<CreatorMarketplaceInfiniteList />);

		// "alic" is a substring of both "Alice" and "ALICIA" regardless of case.
		fireEvent.change(screen.getByPlaceholderText('Search creators'), {
			target: { value: 'alic' },
		});
		act(() => {
			vi.advanceTimersByTime(300);
		});

		expect(screen.getByLabelText('Creator Alice Wonderland')).toBeInTheDocument();
		expect(screen.getByLabelText('Creator ALICIA Keys')).toBeInTheDocument();
		expect(screen.queryByLabelText('Creator Bob Builder')).not.toBeInTheDocument();
	});

	it('shows a "No results" empty state when no creators match the query', () => {
		render(<CreatorMarketplaceInfiniteList />);

		fireEvent.change(screen.getByPlaceholderText('Search creators'), {
			target: { value: 'zzz-no-match' },
		});
		act(() => {
			vi.advanceTimersByTime(300);
		});

		expect(screen.getByTestId('creator-marketplace-search-empty-state')).toHaveTextContent(
			'No results for "zzz-no-match"'
		);
		expect(screen.queryByRole('article')).not.toBeInTheDocument();
	});

	it('restores the full list when the input is cleared', () => {
		render(<CreatorMarketplaceInfiniteList />);

		const input = screen.getByPlaceholderText('Search creators');
		fireEvent.change(input, { target: { value: 'bob' } });
		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(screen.queryByLabelText('Creator Alice Wonderland')).not.toBeInTheDocument();

		fireEvent.change(input, { target: { value: '' } });
		act(() => {
			vi.advanceTimersByTime(300);
		});

		expect(screen.getByLabelText('Creator Alice Wonderland')).toBeInTheDocument();
		expect(screen.getByLabelText('Creator Bob Builder')).toBeInTheDocument();
		expect(screen.getByLabelText('Creator ALICIA Keys')).toBeInTheDocument();
	});

	it('resets the filter when the loaded creator set changes (new cursor/page)', () => {
		const { rerender } = render(<CreatorMarketplaceInfiniteList />);

		fireEvent.change(screen.getByPlaceholderText('Search creators'), {
			target: { value: 'bob' },
		});
		act(() => {
			vi.advanceTimersByTime(300);
		});
		expect(screen.queryByLabelText('Creator Alice Wonderland')).not.toBeInTheDocument();

		// Simulate a new page landing, changing the identity of the creators array.
		mockUseInfiniteCreatorMarketplace.mockReturnValue({
			...baseHookReturn,
			creators: [
				makeCreator('a', 'Alice Wonderland'),
				makeCreator('b', 'Bob Builder'),
				makeCreator('c', 'ALICIA Keys'),
				makeCreator('d', 'Dave Newcomer'),
			],
		});
		rerender(<CreatorMarketplaceInfiniteList />);

		expect(screen.getByPlaceholderText('Search creators')).toHaveValue('');
		expect(screen.getByLabelText('Creator Alice Wonderland')).toBeInTheDocument();
		expect(screen.getByLabelText('Creator Dave Newcomer')).toBeInTheDocument();
	});
});
