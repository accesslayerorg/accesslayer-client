import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { MemoryRouter, RouterProvider, createMemoryRouter, useParams } from 'react-router';
import TrendingCreators from '../TrendingCreators';
import userEvent from '@testing-library/user-event';

// Mock IntersectionObserver since it's not available in jsdom
class MockIntersectionObserver {
	observe = vi.fn();
	unobserve = vi.fn();
	disconnect = vi.fn();
}

global.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

describe('TrendingCreatorCard navigation integration (#601)', () => {
	it('renders Buy Keys buttons with correct creator profile links in discovery list', () => {
		render(
			<MemoryRouter>
				<TrendingCreators />
			</MemoryRouter>
		);

		// Find all Buy Keys buttons/links
		const buyKeysButtons = screen.getAllByRole('link', { name: /buy keys/i });
		expect(buyKeysButtons).toHaveLength(6);
		
		// Assert the first link points to the correct creator profile URL
		expect(buyKeysButtons[0]).toHaveAttribute('href', '/creator/1');
	});

	it('navigates to creator profile page when clicking Buy Keys button from discovery list', async () => {
		const router = createMemoryRouter(
			[
				{
					path: '/',
					element: <TrendingCreators />,
				},
				{
					path: '/creator/:id',
					element: <div data-testid="creator-profile">Creator Profile</div>,
				},
			],
			{
				initialEntries: ['/'],
			}
		);

		render(<RouterProvider router={router} />);

		// Find the Buy Keys button for the first creator (Lena Markov, ID: '1')
		const buyKeysButtons = screen.getAllByRole('link', { name: /buy keys/i });
		
		// Click the first Buy Keys button to trigger navigation
		await userEvent.click(buyKeysButtons[0]);

		// Assert navigation occurred to the correct route
		expect(router.state.location.pathname).toBe('/creator/1');
	});

	it('navigates with correct creator ID when clicking different creators from discovery list', async () => {
		const router = createMemoryRouter(
			[
				{
					path: '/',
					element: <TrendingCreators />,
				},
				{
					path: '/creator/:id',
					element: <div data-testid="creator-profile">Creator Profile</div>,
				},
			],
			{
				initialEntries: ['/'],
			}
		);

		render(<RouterProvider router={router} />);

		const buyKeysButtons = screen.getAllByRole('link', { name: /buy keys/i });
		
		// Click the second creator's Buy Keys button (Dario Fuentes, ID: '2')
		await userEvent.click(buyKeysButtons[1]);

		expect(router.state.location.pathname).toBe('/creator/2');
	});

	it('profile page begins loading data for correct creator ID from URL after navigation', async () => {
		let loadedCreatorId: string | null = null;

		const MockCreatorProfilePage = () => {
			const params = useParams();
			loadedCreatorId = params.id || null;
			
			return (
				<div data-testid="creator-profile">
					<div data-testid="loading-creator-id">Loading: {params.id}</div>
				</div>
			);
		};

		const router = createMemoryRouter(
			[
				{
					path: '/',
					element: <TrendingCreators />,
				},
				{
					path: '/creator/:id',
					element: <MockCreatorProfilePage />,
				},
			],
			{
				initialEntries: ['/'],
			}
		);

		render(<RouterProvider router={router} />);

		const buyKeysButtons = screen.getAllByRole('link', { name: /buy keys/i });
		await userEvent.click(buyKeysButtons[0]);

		// Assert that the profile page is loading data for the correct creator ID
		expect(screen.getByTestId('loading-creator-id').textContent).toBe('Loading: 1');
		expect(loadedCreatorId).toBe('1');
	});

	it('does not navigate when clicking outside the clickable area in discovery list', async () => {
		const router = createMemoryRouter(
			[
				{
					path: '/',
					element: <TrendingCreators />,
				},
				{
					path: '/creator/:id',
					element: <div data-testid="creator-profile">Creator Profile</div>,
				},
			],
			{
				initialEntries: ['/'],
			}
		);

		render(<RouterProvider router={router} />);

		// Click on the section header (not a Buy Keys button)
		const sectionHeader = screen.getByText(/creators worth holding/i);
		await userEvent.click(sectionHeader);

		// Assert no navigation occurred - still on the home page
		expect(router.state.location.pathname).toBe('/');
	});
});
