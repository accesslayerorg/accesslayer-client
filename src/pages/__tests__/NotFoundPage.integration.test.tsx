import { render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { routes } from '@/routes';

vi.mock('@/hooks/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

describe('NotFoundPage Integration', () => {
	it('renders NotFoundPage when navigating to an unknown route', () => {
		const router = createMemoryRouter(routes, {
			initialEntries: ['/unknown-path-xyz'],
		});

		render(<RouterProvider router={router} />);

		// Assert the NotFoundPage heading is rendered
		expect(
			screen.getByRole('heading', { name: /page not found/i })
		).toBeInTheDocument();

	// Assert the subheading is rendered
		expect(
			screen.getByText(
				/the page you are looking for doesn't exist or has been moved/i
			)
		).toBeInTheDocument();

		// Assert the Back to Marketplace button exists
		expect(
			screen.getByRole('link', { name: /back to marketplace/i })
		).toHaveAttribute('href', '/');

		// Assert the search input exists
		expect(
			screen.getByRole('textbox', { name: /search keys/i })
		).toBeInTheDocument();
	});
});
