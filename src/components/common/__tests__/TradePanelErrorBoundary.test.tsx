import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TradePanelErrorBoundary from '@/components/common/TradePanelErrorBoundary';

const BuggyTradePanel = ({ shouldThrow = false }: { shouldThrow?: boolean }) => {
	if (shouldThrow) {
		throw new Error('Test trade panel error');
	}
	return <div>Buy Sell Buttons</div>;
};

describe('TradePanelErrorBoundary', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it('renders children when no error occurs', () => {
		render(
			<TradePanelErrorBoundary>
				<BuggyTradePanel />
			</TradePanelErrorBoundary>
		);
		expect(screen.getByText('Buy Sell Buttons')).toBeInTheDocument();
	});

	it('renders fallback UI when a render error occurs', () => {
		const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

		render(
			<TradePanelErrorBoundary>
				<BuggyTradePanel shouldThrow={true} />
			</TradePanelErrorBoundary>
		);

		expect(screen.getByRole('alert')).toBeInTheDocument();
		expect(screen.getByText(/trading is unavailable right now/i)).toBeInTheDocument();
		expect(screen.queryByText('Buy Sell Buttons')).not.toBeInTheDocument();
		expect(consoleSpy).toHaveBeenCalled();
	});

	it('resets error state and remounts the panel when Retry is clicked', () => {
		vi.spyOn(console, 'error').mockImplementation(() => {});

		const { rerender } = render(
			<TradePanelErrorBoundary>
				<BuggyTradePanel shouldThrow={true} />
			</TradePanelErrorBoundary>
		);

		expect(screen.getByText(/trading is unavailable right now/i)).toBeInTheDocument();

		rerender(
			<TradePanelErrorBoundary>
				<BuggyTradePanel shouldThrow={false} />
			</TradePanelErrorBoundary>
		);

		fireEvent.click(screen.getByRole('button', { name: /retry/i }));

		expect(
			screen.queryByText(/trading is unavailable right now/i)
		).not.toBeInTheDocument();
		expect(screen.getByText('Buy Sell Buttons')).toBeInTheDocument();
	});
});
