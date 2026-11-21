/**
 * Announcement feed tests (#1175).
 *
 * Acceptance criteria:
 *  - Feed renders correct entries with accurate metadata
 *  - Expand loads and displays IPFS content
 *  - Category chips colour-coded per type
 *  - Load More fetches the next page
 *  - Empty state when no announcements exist
 */
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import AnnouncementFeed from '@/components/common/AnnouncementFeed';
import AnnouncementItem from '@/components/common/AnnouncementItem';
import {
	categoryColour,
	normalizeAnnouncementCategory,
	type Announcement,
} from '@/utils/announcements.utils';

const mockFetchPage = vi.fn();
const mockFetchContent = vi.fn();

vi.mock('@/services/announcements.service', () => ({
	fetchAnnouncementsPage: (...args: unknown[]) => mockFetchPage(...args),
	fetchAnnouncementContent: (...args: unknown[]) => mockFetchContent(...args),
}));

function makeAnnouncement(overrides: Partial<Announcement> = {}): Announcement {
	return {
		id: 'ann-1',
		title: 'Season 2 kicks off',
		category: 'update',
		publishedAt: '2026-03-01T12:00:00Z',
		summary: 'A short teaser for the post.',
		...overrides,
	};
}

beforeEach(() => {
	mockFetchPage.mockReset();
	mockFetchContent.mockReset();
	mockFetchContent.mockResolvedValue('Full IPFS body of the announcement.');
});

describe('category chips (#1175)', () => {
	it.each([
		['general', 'general'],
		['update', 'update'],
		['event', 'event'],
		['warning', 'warning'],
		['launch', 'launch'],
	] as const)('colour-codes the %s category', (input, expected) => {
		const category = normalizeAnnouncementCategory(input);
		expect(category).toBe(expected);
		expect(categoryColour(category)).toBe(
			categoryColour(expected)
		);
	});

	it('falls back to general for unknown categories', () => {
		expect(normalizeAnnouncementCategory('nope')).toBe('general');
		expect(normalizeAnnouncementCategory(undefined)).toBe('general');
	});

	it('uses distinct colours per category', () => {
		const colours = new Set([
			categoryColour('general'),
			categoryColour('update'),
			categoryColour('event'),
			categoryColour('warning'),
			categoryColour('launch'),
		]);
		expect(colours.size).toBe(5);
	});
});

describe('AnnouncementItem (#1175)', () => {
	it('renders category chip, title, and date', () => {
		render(<AnnouncementItem announcement={makeAnnouncement()} />);

		const chip = screen.getByTestId('announcement-category-chip');
		expect(chip).toHaveAttribute('data-category', 'update');
		expect(chip).toHaveTextContent('update');
		expect(screen.getByTestId('announcement-title')).toHaveTextContent(
			'Season 2 kicks off'
		);
		expect(screen.getByTestId('announcement-date')).toBeInTheDocument();
	});

	it('expand loads and displays IPFS content', async () => {
		render(<AnnouncementItem announcement={makeAnnouncement()} />);

		fireEvent.click(screen.getByTestId('announcement-expand'));

		await waitFor(() =>
			expect(mockFetchContent).toHaveBeenCalledWith('ann-1')
		);
		await waitFor(() =>
			expect(screen.getByTestId('announcement-content')).toHaveTextContent(
				'Full IPFS body'
			)
		);
	});
});

describe('AnnouncementFeed (#1175)', () => {
	it('shows the empty state when no announcements exist', async () => {
		mockFetchPage.mockResolvedValue({ announcements: [], nextPage: null });

		render(<AnnouncementFeed creatorId="creator-1" />);

		await waitFor(() =>
			expect(screen.getByTestId('announcements-empty')).toBeInTheDocument()
		);
		expect(screen.queryByTestId('announcement-feed')).not.toBeInTheDocument();
	});

	it('renders correct entries with accurate metadata', async () => {
		mockFetchPage.mockResolvedValue({
			announcements: [
				makeAnnouncement({ id: 'a1', title: 'First', category: 'update' }),
				makeAnnouncement({ id: 'a2', title: 'Second', category: 'event' }),
			],
			nextPage: null,
		});

		render(<AnnouncementFeed creatorId="creator-1" />);

		await waitFor(() =>
			expect(screen.getByTestId('announcement-feed')).toBeInTheDocument()
		);
		expect(screen.getByText('First')).toBeInTheDocument();
		expect(screen.getByText('Second')).toBeInTheDocument();
		expect(screen.getAllByTestId('announcement-item')).toHaveLength(2);
		expect(screen.queryByTestId('announcements-load-more')).not.toBeInTheDocument();
	});

	it('Load More fetches the next page', async () => {
		mockFetchPage.mockImplementation(async (_id: string, page: number) => {
			if (page === 1) {
				return {
					announcements: [makeAnnouncement({ id: 'p1', title: 'Page one' })],
					nextPage: 2,
				};
			}
			return {
				announcements: [makeAnnouncement({ id: 'p2', title: 'Page two' })],
				nextPage: null,
			};
		});

		render(<AnnouncementFeed creatorId="creator-1" pageSize={1} />);

		await waitFor(() =>
			expect(screen.getByTestId('announcements-load-more')).toBeInTheDocument()
		);
		fireEvent.click(screen.getByTestId('announcements-load-more'));

		await waitFor(() =>
			expect(screen.getByText('Page two')).toBeInTheDocument()
		);
		expect(mockFetchPage).toHaveBeenCalledWith('creator-1', 2, 1);
	});
});

describe('AnnouncementItem co-creator attribution (#1224)', () => {
	const WALLET = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';

	function renderItem(announcement: Announcement) {
		const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
		return render(
			<QueryClientProvider client={client}>
				<AnnouncementItem announcement={announcement} />
			</QueryClientProvider>
		);
	}

	it('shows the posting co-creator wallet and role badge', () => {
		renderItem(
			makeAnnouncement({
				postedBy: { wallet: WALLET, role: 'Content' },
			})
		);
		const label = screen.getByTestId('action-attribution');
		expect(label).toHaveTextContent('Posted by');
		expect(label).toHaveTextContent('GBZX…MADI');
		expect(screen.getByTestId('action-attribution-role')).toHaveTextContent('Content');
	});

	it('shows the Creator label for primary-creator posts', () => {
		renderItem(
			makeAnnouncement({
				postedBy: { wallet: WALLET, role: 'creator' },
			})
		);
		expect(screen.getByTestId('action-attribution-role')).toHaveTextContent('Creator');
	});

	it('omits the label when the post has no attribution', () => {
		renderItem(makeAnnouncement());
		expect(screen.queryByTestId('action-attribution')).not.toBeInTheDocument();
	});
});
