import type { ReactNode } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import CreatorPageErrorBoundary from '@/components/common/CreatorPageErrorBoundary';

// Mock component that throws a render error on demand
const BuggyCreatorPage = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
	if (shouldThrow) {
		throw new Error('Creator page render error');
	}
	return <div>Creator profile content</div>;
};

const renderInRouter = (ui: ReactNode) =>
	render(<MemoryRouter>{ui}</MemoryRouter>);

describe('CreatorPageErrorBoundary', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders children when no error occurs', () => {
		renderInRouter(
			<CreatorPageErrorBoundary>
				<BuggyCreatorPage />
			</CreatorPageErrorBoundary>
		);

		expect(screen.getByText('Creator profile content')).toBeInTheDocument();
	});

	it('renders fallback UI instead of crashing when a creator page throws', () => {
		// Suppress React's expected error logging for the thrown error
		vi.spyOn(console, 'error').mockImplementation(() => {});

		renderInRouter(
			<CreatorPageErrorBoundary>
				<BuggyCreatorPage shouldThrow={true} />
			</CreatorPageErrorBoundary>
		);

		expect(screen.getByRole('alert')).toBeInTheDocument();
		expect(screen.getByText(/could not load/i)).toBeInTheDocument();
		expect(screen.queryByText('Creator profile content')).not.toBeInTheDocument();
	});

	it('fallback includes a link back to the creator list', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		renderInRouter(
			<CreatorPageErrorBoundary>
				<BuggyCreatorPage shouldThrow={true} />
			</CreatorPageErrorBoundary>
		);

		const link = screen.getByRole('link', { name: /back to creators/i });
		expect(link).toHaveAttribute('href', '/creators');
	});
});
