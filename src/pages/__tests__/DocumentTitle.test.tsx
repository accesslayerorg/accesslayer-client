import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HomePage from '@/pages/HomePage';
import ProfilePage from '@/pages/ProfilePage';

vi.mock('@/components/home/Header', () => ({
	default: () => <header>Header</header>,
}));
vi.mock('@/components/home/Hero', () => ({
	default: () => <section>Hero</section>,
}));
vi.mock('@/components/home/CreatorSpotlight', () => ({
	default: () => <section>Creator Spotlight</section>,
}));
vi.mock('@/components/home/TrendingLeaderboard', () => ({
	default: () => <section>Trending Leaderboard</section>,
}));
vi.mock('@/components/home/TrendingCreators', () => ({
	default: () => <section>Trending Creators</section>,
}));
vi.mock('@/components/home/FAQ', () => ({
	default: () => <section>FAQ</section>,
}));
vi.mock('@/components/home/Footer', () => ({
	default: () => <footer>Footer</footer>,
}));
vi.mock('@/components/common/ReferralLinkPanel', () => ({
	default: () => <div>Referral Link Panel</div>,
}));
vi.mock('@/components/common/TradeHistoryTable', () => ({
	default: () => <div>Trade History Table</div>,
}));
vi.mock('@/hooks/useNavigationTiming', () => ({
	useNavigationTiming: vi.fn(),
}));
vi.mock('@/hooks/useProfileStore', () => ({
	useProfileStore: () => ({ firstName: 'Alex', lastName: 'Rivers' }),
}));

describe('page document titles', () => {
	afterEach(() => {
		document.title = 'Access Layer | Creator Keys Marketplace on Stellar';
	});

	it('sets the home page title', () => {
		const { unmount } = render(
			<MemoryRouter initialEntries={['/']}>
				<Routes>
					<Route path="/" element={<HomePage />} />
				</Routes>
			</MemoryRouter>
		);

		expect(screen.getByText('Hero')).toBeInTheDocument();
		expect(document.title).toBe('AccessLayer — Creator Key Marketplace');

		unmount();
		expect(document.title).toBe(
			'Access Layer | Creator Keys Marketplace on Stellar'
		);
	});

	it('sets the marketplace page title', () => {
		render(
			<MemoryRouter initialEntries={['/creators']}>
				<Routes>
					<Route path="/creators" element={<HomePage />} />
				</Routes>
			</MemoryRouter>
		);

		expect(document.title).toBe('Marketplace — AccessLayer');
	});

	it('sets the portfolio page title', () => {
		render(
			<MemoryRouter initialEntries={['/profile']}>
				<Routes>
					<Route path="/profile" element={<ProfilePage />} />
				</Routes>
			</MemoryRouter>
		);

		expect(
			screen.getByRole('heading', { name: 'My Portfolio' })
		).toBeInTheDocument();
		expect(document.title).toBe('My Portfolio — AccessLayer');
	});
});
