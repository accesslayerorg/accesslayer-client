import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BalanceHistoryChart from '../BalanceHistoryChart';

function renderWithClient(ui: React.ReactElement) {
	const client = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});
	return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('BalanceHistoryChart (#1446)', () => {
	const testAddress =
		'GDEMOWALLET0000000000000000000000000000000000000000000000001';

	it('renders chart container and controls', async () => {
		renderWithClient(<BalanceHistoryChart address={testAddress} />);

		expect(screen.getByTestId('balance-history-section')).toBeInTheDocument();
		expect(
			screen.getByTestId('balance-history-chart-container')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('balance-history-key-select')
		).toBeInTheDocument();
		expect(
			screen.getByTestId('export-balance-history-csv-btn')
		).toBeInTheDocument();
	});

	it('renders as-of date picker, approximation note, and holdings table', async () => {
		renderWithClient(<BalanceHistoryChart address={testAddress} />);

		await waitFor(() => {
			expect(screen.getByTestId('as-of-date-tool')).toBeInTheDocument();
		});

		expect(screen.getByTestId('as-of-date-picker')).toBeInTheDocument();
		expect(
			screen.getByTestId('as-of-approximation-note')
		).toHaveTextContent(/Holdings as of ledger #/i);
		expect(screen.getByTestId('as-of-holdings-table')).toBeInTheDocument();
	});

	it('triggers CSV download when Export CSV button is clicked', async () => {
		const user = userEvent.setup();
		if (!global.URL.createObjectURL) {
			global.URL.createObjectURL = vi.fn(() => 'blob:mock');
		} else {
			vi.spyOn(global.URL, 'createObjectURL').mockReturnValue('blob:mock');
		}

		let clicked = false;
		const originalCreateElement = document.createElement.bind(document);
		vi.spyOn(document, 'createElement').mockImplementation((tagName: string) => {
			const elem = originalCreateElement(tagName);
			if (tagName === 'a') {
				elem.click = () => {
					clicked = true;
				};
			}
			return elem;
		});

		renderWithClient(<BalanceHistoryChart address={testAddress} />);

		// Wait for data to load
		await waitFor(() => {
			expect(
				screen.queryByText(/Loading checkpoint history/i)
			).not.toBeInTheDocument();
		});

		await user.click(screen.getByTestId('export-balance-history-csv-btn'));
		expect(clicked).toBe(true);
	});
});
