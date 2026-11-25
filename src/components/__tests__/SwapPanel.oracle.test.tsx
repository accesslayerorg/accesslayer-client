import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import SwapPanel from '../SwapPanel';
import { oracleService } from '@/services/oracle.service';

function renderWithQuery(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('SwapPanel - Oracle Integration', () => {
	beforeEach(() => {
		oracleService.reset();
	});

	it('shows fallback banner when oracle source is fallback but does not block swap action', async () => {
		oracleService.setMockStatus('XLM', {
			status: 'fallback',
			source: 'fallback',
			sourceName: 'Secondary Feed',
			updatedAt: Date.now() - 5_000,
		});

		renderWithQuery(
			<SwapPanel
				balance={10}
				isConnected={true}
				amount={2}
				onAmountChange={vi.fn()}
				creatorId="creator-1"
				oracleAsset="XLM"
			/>
		);

		await waitFor(() => {
			expect(screen.getByTestId('oracle-fallback-banner')).toBeInTheDocument();
		});

		// Fallback warning displayed
		expect(screen.getByTestId('oracle-fallback-banner')).toHaveTextContent(/Oracle Fallback Active/i);

		// Action button remains enabled!
		const submitButton = screen.getByTestId('swap-submit');
		expect(submitButton).not.toBeDisabled();
	});

	it('shows stale banner and disables swap action with explanation when price is stale', async () => {
		oracleService.setMockStatus('XLM', {
			status: 'stale',
			source: 'primary',
			updatedAt: Date.now() - 600_000, // 10 minutes ago
		});

		renderWithQuery(
			<SwapPanel
				balance={10}
				isConnected={true}
				amount={2}
				onAmountChange={vi.fn()}
				creatorId="creator-1"
				oracleAsset="XLM"
			/>
		);

		await waitFor(() => {
			expect(screen.getByTestId('oracle-stale-banner')).toBeInTheDocument();
		});

		expect(screen.getByTestId('oracle-stale-banner')).toHaveTextContent(/Oracle Feed Stale/i);

		// Action is blocked and disabled
		const submitButton = screen.getByTestId('swap-submit');
		expect(submitButton).toBeDisabled();

		// Explanation reason is rendered
		expect(screen.getByTestId('swap-stale-disabled-reason')).toHaveTextContent(
			/Action disabled: Price is stale/i
		);
	});
});
