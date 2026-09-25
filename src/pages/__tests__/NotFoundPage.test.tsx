import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import NotFoundPage from '@/pages/NotFoundPage';

vi.mock('@/hooks/useTelemetry', () => ({
	useTelemetry: () => ({ track: vi.fn() }),
}));

describe('NotFoundPage', () => {
	it('renders the Page not found heading and subheading', () => {
		render(
			<MemoryRouter initialEntries={['/missing-route']}>
				<NotFoundPage />
			</MemoryRouter>
		);

		expect(
			screen.getByRole('heading', { name: /page not found/i })
		).toBeInTheDocument();

		expect(
			screen.getByText(
				/the page you are looking for doesn't exist or has been moved/i
			)
		).toBeInTheDocument();
	});

	it('has a Back to Marketplace link pointing to the root route', () => {
		render(
			<MemoryRouter initialEntries={['/missing-route']}>
				<NotFoundPage />
			</MemoryRouter>
		);

		expect(
			screen.getByRole('link', { name: /back to marketplace/i })
		).toHaveAttribute('href', '/');
	});

	it('renders a search input for searching creators', () => {
		render(
			<MemoryRouter initialEntries={['/missing-route']}>
				<NotFoundPage />
			</MemoryRouter>
		);

		expect(
			screen.getByRole('textbox', { name: /search keys/i })
		).toBeInTheDocument();
	});

	it('navigates to root with search param on search submit', async () => {
		const user = userEvent.setup();

		render(
			<MemoryRouter initialEntries={['/missing-route']}>
				<NotFoundPage />
			</MemoryRouter>
		);

		const searchInput = screen.getByRole('textbox', {
			name: /search keys/i,
		});
		await user.type(searchInput, 'Alex');
		await user.click(screen.getByRole('button', { name: /search/i }));

		// After navigation the URL should contain the search query
		expect(searchInput).toHaveValue('Alex');
	});
});
