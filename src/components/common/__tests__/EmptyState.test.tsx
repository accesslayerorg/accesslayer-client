import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import EmptyState from '../EmptyState';

const LocationDisplay = () => {
	const location = useLocation();
	return <div data-testid="location-display">{location.pathname}</div>;
};

describe('EmptyState', () => {
	it('renders message and CTA when both are provided and asserts both are visible', () => {
		render(
			<MemoryRouter>
				<EmptyState
					message="No records found in this context"
					cta={{ label: 'Go to Marketplace', href: '/marketplace' }}
				/>
			</MemoryRouter>
		);

		expect(
			screen.getByText('No records found in this context')
		).toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: 'Go to Marketplace' })
		).toBeInTheDocument();
		expect(
			screen.getByRole('link', { name: 'Go to Marketplace' })
		).toHaveAttribute('href', '/marketplace');
	});

	it('renders with only a message (no CTA) and asserts the CTA element is absent', () => {
		render(<EmptyState message="No activity recorded yet" />);

		expect(screen.getByText('No activity recorded yet')).toBeInTheDocument();
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
		expect(screen.queryByRole('button')).not.toBeInTheDocument();
	});

	it('clicks the CTA and asserts navigation to the provided href is triggered', () => {
		render(
			<MemoryRouter initialEntries={['/']}>
				<Routes>
					<Route
						path="/"
						element={
							<EmptyState
								message="Start your journey"
								cta={{ label: 'Explore Creators', href: '/creators' }}
							/>
						}
					/>
					<Route
						path="/creators"
						element={<div data-testid="creators-page">Creators Page</div>}
					/>
				</Routes>
				<LocationDisplay />
			</MemoryRouter>
		);

		expect(screen.getByTestId('location-display')).toHaveTextContent('/');

		const ctaLink = screen.getByRole('link', { name: 'Explore Creators' });
		fireEvent.click(ctaLink);

		expect(screen.getByTestId('creators-page')).toBeInTheDocument();
		expect(screen.getByTestId('location-display')).toHaveTextContent('/creators');
	});

	it('renders with an empty message string and asserts the component renders without error', () => {
		const { container } = render(<EmptyState message="" />);

		expect(container).toBeInTheDocument();
		expect(screen.getByRole('status')).toBeInTheDocument();
	});

	it('supports cta specified as string with ctaHref prop', () => {
		render(
			<MemoryRouter>
				<EmptyState
					message="No tokens found"
					cta="Browse Tokens"
					ctaHref="/tokens"
				/>
			</MemoryRouter>
		);

		const link = screen.getByRole('link', { name: 'Browse Tokens' });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute('href', '/tokens');
	});

	it('triggers onClick handler when cta is an action button without href', () => {
		const handleAction = vi.fn();
		render(
			<EmptyState
				message="Filter applied with zero matches"
				cta={{ label: 'Clear Filters', onClick: handleAction }}
			/>
		);

		const button = screen.getByRole('button', { name: 'Clear Filters' });
		expect(button).toBeInTheDocument();

		fireEvent.click(button);
		expect(handleAction).toHaveBeenCalledTimes(1);
	});

	it('maintains backward compatibility with title, description, image, and onReset props', () => {
		const handleReset = vi.fn();
		render(
			<EmptyState
				image="/images/no-results.png"
				title="No creators found"
				description="We couldn't find any creators matching your search."
				onReset={handleReset}
			/>
		);

		expect(
			screen.getByRole('status', { name: 'No creators found' })
		).toBeInTheDocument();
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
			'No creators found'
		);
		expect(
			screen.getByText('We couldn\'t find any creators matching your search.')
		).toBeInTheDocument();

		const resetButton = screen.getByRole('button', { name: 'Reset search results' });
		expect(resetButton).toBeInTheDocument();

		fireEvent.click(resetButton);
		expect(handleReset).toHaveBeenCalledTimes(1);
	});
});
