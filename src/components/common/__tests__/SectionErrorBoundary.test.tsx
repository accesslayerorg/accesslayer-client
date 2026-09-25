import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SectionErrorBoundary from '@/components/common/SectionErrorBoundary';

// Mock component that throws an error
const BuggyComponent = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
	if (shouldThrow) {
		throw new Error('Test error');
	}
	return <div>Normal Content</div>;
};

describe('SectionErrorBoundary', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders children when no error occurs', () => {
		render(
			<SectionErrorBoundary>
				<BuggyComponent />
			</SectionErrorBoundary>
		);
		expect(screen.getByText('Normal Content')).toBeInTheDocument();
	});

	it('renders fallback UI when an error occurs', () => {
		// Suppress console.error for the expected error
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		render(
			<SectionErrorBoundary sectionName="Test Section">
				<BuggyComponent shouldThrow={true} />
			</SectionErrorBoundary>
		);

		expect(screen.getByRole('alert')).toBeInTheDocument();
		expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
		expect(screen.getByText(/Test Section/i)).toBeInTheDocument();
		expect(consoleSpy).toHaveBeenCalled();
	});

	it('resets error state when Retry button is clicked', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const { rerender } = render(
			<SectionErrorBoundary>
				<BuggyComponent shouldThrow={true} />
			</SectionErrorBoundary>
		);

		expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();

		// Update children to not throw anymore
		rerender(
			<SectionErrorBoundary>
				<BuggyComponent shouldThrow={false} />
			</SectionErrorBoundary>
		);

		// Click retry
		fireEvent.click(screen.getByText(/retry/i));

		expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
		expect(screen.getByText('Normal Content')).toBeInTheDocument();
	});

	it('applies custom minHeight and className', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		render(
			<SectionErrorBoundary minHeight={500} className="custom-class">
				<BuggyComponent shouldThrow={true} />
			</SectionErrorBoundary>
		);

		const alert = screen.getByRole('alert');
		expect(alert).toHaveStyle('min-height: 500px');
		expect(alert).toHaveClass('custom-class');
	});

	it('renders a custom title when provided', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		render(
			<SectionErrorBoundary title="Chart unavailable — try refreshing">
				<BuggyComponent shouldThrow={true} />
			</SectionErrorBoundary>
		);

		expect(
			screen.getByText('Chart unavailable — try refreshing')
		).toBeInTheDocument();
		expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
	});

	it('omits the description paragraph when description is an empty string', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		render(
			<SectionErrorBoundary title="Chart unavailable — try refreshing" description="">
				<BuggyComponent shouldThrow={true} />
			</SectionErrorBoundary>
		);

		expect(
			screen.getByText('Chart unavailable — try refreshing')
		).toBeInTheDocument();
		expect(
			screen.queryByText(/we encountered an error/i)
		).not.toBeInTheDocument();
	});

	it('renders a custom description when provided', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		render(
			<SectionErrorBoundary description="Custom explanation text">
				<BuggyComponent shouldThrow={true} />
			</SectionErrorBoundary>
		);

		expect(screen.getByText('Custom explanation text')).toBeInTheDocument();
	});

	it('does not retry automatically after repeated failures (manual retry only)', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const { rerender } = render(
			<SectionErrorBoundary>
				<BuggyComponent shouldThrow={true} />
			</SectionErrorBoundary>
		);

		expect(screen.getByRole('alert')).toBeInTheDocument();

		// Re-rendering with the same throwing child (e.g. parent re-render)
		// must NOT clear the error state on its own — only clicking Retry does.
		rerender(
			<SectionErrorBoundary>
				<BuggyComponent shouldThrow={true} />
			</SectionErrorBoundary>
		);

		expect(screen.getByRole('alert')).toBeInTheDocument();
	});

	it('logs the caught error via componentDidCatch when an error occurs', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		render(
			<SectionErrorBoundary sectionName="bonding curve chart">
				<BuggyComponent shouldThrow={true} />
			</SectionErrorBoundary>
		);

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining('bonding curve chart'),
			expect.any(Error),
			expect.anything()
		);
	});
});
