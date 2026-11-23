import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, expect, it, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import OracleHealthBadge from '../OracleHealthBadge';
import { oracleService } from '@/services/oracle.service';

function renderWithQuery(ui: React.ReactElement) {
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
}

describe('OracleHealthBadge', () => {
	beforeEach(() => {
		oracleService.reset();
	});

	it('reflects healthy status reported by contract', async () => {
		oracleService.setMockStatus('XLM', {
			status: 'healthy',
			source: 'primary',
			sourceName: 'Primary Chainlink Feed',
			priceXlm: 1.5,
			updatedAt: Date.now() - 10_000,
			deviationPercent: 0.1,
		});

		renderWithQuery(<OracleHealthBadge asset="XLM" />);

		await waitFor(() => {
			expect(screen.getByTestId('oracle-health-badge')).toBeInTheDocument();
		});

		const badge = screen.getByTestId('oracle-health-badge');
		expect(badge).toHaveAttribute('data-status', 'healthy');
		expect(screen.getByTestId('oracle-status-label')).toHaveTextContent('Oracle: Healthy');
	});

	it('reflects fallback status reported by contract', async () => {
		oracleService.setMockStatus('XLM', {
			status: 'fallback',
			source: 'fallback',
			sourceName: 'Secondary Band Feed',
			priceXlm: 1.48,
			updatedAt: Date.now() - 20_000,
			deviationPercent: 1.2,
		});

		renderWithQuery(<OracleHealthBadge asset="XLM" />);

		await waitFor(() => {
			expect(screen.getByTestId('oracle-health-badge')).toBeInTheDocument();
		});

		const badge = screen.getByTestId('oracle-health-badge');
		expect(badge).toHaveAttribute('data-status', 'fallback');
		expect(screen.getByTestId('oracle-status-label')).toHaveTextContent('Oracle: Fallback');
	});

	it('reflects stale status reported by contract', async () => {
		oracleService.setMockStatus('XLM', {
			status: 'stale',
			source: 'primary',
			sourceName: 'Primary Chainlink Feed',
			priceXlm: 1.5,
			updatedAt: Date.now() - 600_000, // 10 minutes ago
			deviationPercent: 0.1,
		});

		renderWithQuery(<OracleHealthBadge asset="XLM" />);

		await waitFor(() => {
			expect(screen.getByTestId('oracle-health-badge')).toBeInTheDocument();
		});

		const badge = screen.getByTestId('oracle-health-badge');
		expect(badge).toHaveAttribute('data-status', 'stale');
		expect(screen.getByTestId('oracle-status-label')).toHaveTextContent('Oracle: Stale');
	});

	it('opens popover with details on click', async () => {
		oracleService.setMockStatus('XLM', {
			status: 'healthy',
			source: 'primary',
			sourceName: 'Primary Feed',
			priceXlm: 1.52,
			updatedAt: Date.now() - 15_000,
			deviationPercent: 0.25,
		});

		renderWithQuery(<OracleHealthBadge asset="XLM" />);

		await waitFor(() => {
			expect(screen.getByTestId('oracle-health-badge')).toBeInTheDocument();
		});

		fireEvent.click(screen.getByTestId('oracle-health-badge'));

		expect(screen.getByTestId('oracle-health-popover')).toBeInTheDocument();
		expect(screen.getByTestId('popover-source-name')).toHaveTextContent('Primary Feed (primary)');
		expect(screen.getByTestId('popover-price')).toHaveTextContent('1.5200 XLM');
		expect(screen.getByTestId('popover-deviation')).toHaveTextContent('0.25%');
		expect(screen.getByTestId('popover-relative-age')).toHaveTextContent(/ago|just now/);
	});

	it('hides badge when hidden prop is true or asset is missing', () => {
		const { container: c1 } = renderWithQuery(<OracleHealthBadge asset="XLM" hidden={true} />);
		expect(c1).toBeEmptyDOMElement();

		const { container: c2 } = renderWithQuery(<OracleHealthBadge asset="" />);
		expect(c2).toBeEmptyDOMElement();
	});
});
