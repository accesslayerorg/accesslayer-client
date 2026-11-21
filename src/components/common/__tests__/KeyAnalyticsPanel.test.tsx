import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KeyAnalyticsPanel from '../KeyAnalyticsPanel';
import { useKeyAnalyticsStore } from '@/hooks/useKeyAnalyticsStore';
import { analyticsService } from '@/services/analytics.service';

describe('KeyAnalyticsPanel (#966)', () => {
	const mockData = {
		uniqueTraderCount: 1420,
		totalTradeCount: 5892,
		cumulativeVolumeXlm: 125400,
		cumulativeVolumeUsd: 15048,
		xlmPriceUsd: 0.12,
		lastUpdated: new Date().toISOString(),
	};

	beforeEach(() => {
		useKeyAnalyticsStore.getState().reset();
		vi.spyOn(analyticsService, 'getKeyAnalytics').mockResolvedValue(mockData);
	});

	it('renders unique trader count and total trades correctly from API', async () => {
		render(<KeyAnalyticsPanel creatorId="alex-rivers" />);

		await waitFor(() => {
			expect(screen.getByTestId('stat-unique-traders')).toHaveTextContent('1,420');
		});

		expect(screen.getByTestId('stat-total-trades')).toHaveTextContent('5,892');
	});

	it('toggles cumulative volume display between XLM and USD', async () => {
		render(<KeyAnalyticsPanel creatorId="alex-rivers" />);

		await waitFor(() => {
			expect(screen.getByTestId('stat-cumulative-volume')).toBeInTheDocument();
		});

		// Default currency is XLM
		const volumeStat = screen.getByTestId('stat-cumulative-volume');
		expect(volumeStat).toHaveTextContent(/125\.4k\s+XLM/i);

		// Toggle to USD
		const usdBtn = screen.getByTestId('currency-toggle-usd');
		fireEvent.click(usdBtn);

		await waitFor(() => {
			expect(screen.getByTestId('stat-cumulative-volume')).toHaveTextContent('$15,048 USD');
		});

		// Toggle back to XLM
		const xlmBtn = screen.getByTestId('currency-toggle-xlm');
		fireEvent.click(xlmBtn);

		await waitFor(() => {
			expect(screen.getByTestId('stat-cumulative-volume')).toHaveTextContent(/125\.4k\s+XLM/i);
		});
	});

	it('renders tooltips for each stat on hover', async () => {
		render(<KeyAnalyticsPanel creatorId="alex-rivers" />);

		await waitFor(() => {
			expect(screen.getByTestId('key-analytics-panel')).toBeInTheDocument();
		});

		// Check buttons that trigger tooltips
		expect(screen.getByLabelText('Explain unique traders stat')).toBeInTheDocument();
		expect(screen.getByLabelText('Explain total trades stat')).toBeInTheDocument();
		expect(screen.getByLabelText('Explain cumulative volume stat')).toBeInTheDocument();
	});
});
