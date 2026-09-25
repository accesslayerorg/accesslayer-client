import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Course } from '@/services/course.service';
import { useConnectedWallet, useWatchlist } from '@/hooks/useWatchlist';
import WatchlistButton from '@/components/common/WatchlistButton';

const ADDRESS = '0x1234...';

vi.mock('react-hot-toast', () => ({
	default: Object.assign(vi.fn(), {
		success: vi.fn(),
		error: vi.fn(),
	}),
}));

function makeCreator(overrides: Partial<Course> = {}): Course {
	return {
		id: 'creator-1',
		title: 'Alex Rivers',
		description: 'Digital artist',
		price: 0.05,
		priceStroops: 500_000,
		creatorShareSupply: 100,
		instructorId: 'arivers',
		category: 'Art',
		level: 'BEGINNER',
		...overrides,
	};
}

describe('WatchlistButton', () => {
	beforeEach(() => {
		window.localStorage.clear();
		useConnectedWallet.setState({ walletKey: ADDRESS });
		useWatchlist.setState({ bookmarksByWallet: {} });
		vi.clearAllMocks();
	});

	it('renders a bookmark button labelled with the creator name', () => {
		render(<WatchlistButton creator={makeCreator()} />);

		expect(
			screen.getByRole('button', { name: /bookmark alex rivers/i })
		).toBeInTheDocument();
	});

	it('toggles to bookmarked on click and updates aria-pressed', async () => {
		const user = userEvent.setup();
		render(<WatchlistButton creator={makeCreator()} />);

		const button = screen.getByRole('button', {
			name: /bookmark alex rivers/i,
		});
		expect(button.getAttribute('aria-pressed')).toBe('false');

		await user.click(button);

		expect(useWatchlist.getState().isBookmarked(ADDRESS, 'creator-1')).toBe(
			true
		);
		expect(
			screen.getByRole('button', { name: /saved to watchlist/i })
		).toBeInTheDocument();
		expect(button.getAttribute('aria-pressed')).toBe('true');
	});

	it('removes the bookmark when clicked again', async () => {
		const user = userEvent.setup();
		useWatchlist.getState().toggleBookmark(ADDRESS, makeCreator());
		render(<WatchlistButton creator={makeCreator()} />);

		const button = screen.getByRole('button', {
			name: /saved to watchlist. remove bookmark/i,
		});
		await user.click(button);

		expect(useWatchlist.getState().isBookmarked(ADDRESS, 'creator-1')).toBe(
			false
		);
		expect(
			screen.getByRole('button', { name: /bookmark alex rivers/i })
		).toBeInTheDocument();
	});
});
