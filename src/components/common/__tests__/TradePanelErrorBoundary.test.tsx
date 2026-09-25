import { useState } from 'react';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import TradePanelErrorBoundary from '../TradePanelErrorBoundary';

// Helper component that throws on demand
function BuggyPanel({ shouldThrow }: { shouldThrow: boolean }) {
	if (shouldThrow) {
		throw new Error('Simulated trade panel render error');
	}
	return <div data-testid="trade-panel-content">Trade Panel Content</div>;
}

// Wrapper component to simulate state-driven retry remount
function TestParent({ initialThrow = true }: { initialThrow?: boolean }) {
	const [hasError, setHasError] = useState(initialThrow);

	return (
		<div>
			<header data-testid="page-header">Page Header</header>
			<TradePanelErrorBoundary onReset={() => setHasError(false)}>
				<BuggyPanel shouldThrow={hasError} />
			</TradePanelErrorBoundary>
			<footer data-testid="page-footer">Page Footer</footer>
		</div>
	);
}

describe('TradePanelErrorBoundary', () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it('renders children normally when no error occurs', () => {
		render(
			<TradePanelErrorBoundary>
				<div data-testid="trade-panel-content">Trade Panel Content</div>
			</TradePanelErrorBoundary>
		);

		expect(screen.getByTestId('trade-panel-content')).toBeInTheDocument();
		expect(screen.queryByTestId('trade-panel-error-fallback')).not.toBeInTheDocument();
	});

	it('catches render errors inside the trade panel and displays fallback UI', () => {
		// Suppress React boundary console.error output during test
		vi.spyOn(console, 'error').mockImplementation(() => {});

		render(
			<TradePanelErrorBoundary>
				<BuggyPanel shouldThrow={true} />
			</TradePanelErrorBoundary>
		);

		expect(screen.queryByTestId('trade-panel-content')).not.toBeInTheDocument();
		expect(screen.getByTestId('trade-panel-error-fallback')).toBeInTheDocument();
		expect(
			screen.getByText('Something went wrong inside the trade panel')
		).toBeInTheDocument();
		expect(screen.getByTestId('trade-panel-retry-button')).toBeInTheDocument();
	});

	it('keeps surrounding layout (header/footer) mounted when the panel errors', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		render(<TestParent initialThrow={true} />);

		// Header and footer stay mounted
		expect(screen.getByTestId('page-header')).toBeInTheDocument();
		expect(screen.getByTestId('page-footer')).toBeInTheDocument();

		// Panel fallback is displayed
		expect(screen.getByTestId('trade-panel-error-fallback')).toBeInTheDocument();
	});

	it('resets boundary and remounts panel when retry button is clicked', async () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});
		const user = userEvent.setup();

		render(<TestParent initialThrow={true} />);

		expect(screen.getByTestId('trade-panel-error-fallback')).toBeInTheDocument();

		const retryButton = screen.getByTestId('trade-panel-retry-button');
		await user.click(retryButton);

		expect(screen.queryByTestId('trade-panel-error-fallback')).not.toBeInTheDocument();
		expect(screen.getByTestId('trade-panel-content')).toBeInTheDocument();
	});
});
