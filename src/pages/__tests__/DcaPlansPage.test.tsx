import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import DcaPlansPage from '@/pages/DcaPlansPage';

vi.mock('wagmi', () => ({
	useAccount: () => ({
		address: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
		isConnected: true,
	}),
}));

function renderPage() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});

	return render(
		<QueryClientProvider client={queryClient}>
			<MemoryRouter>
				<DcaPlansPage />
			</MemoryRouter>
		</QueryClientProvider>
	);
}

describe('DcaPlansPage (#1470)', () => {
	beforeEach(() => {
		localStorage.clear();
	});

	it('renders existing DCA plans, average price, and per-run history with skipped reasons', async () => {
		renderPage();

		expect(await screen.findByTestId('dca-plans-list')).toBeInTheDocument();
		expect(screen.getByTestId('dca-avg-price-dca-plan-1')).toHaveTextContent('12.50 XLM');
		expect(screen.getByTestId('dca-history-table')).toBeInTheDocument();
		expect(screen.getByTestId('run-skip-reason-run-3')).toHaveTextContent('Insufficient balance');
	});

	it('pauses and resumes a plan immediately', async () => {
		renderPage();

		const pauseBtn = await screen.findByTestId('pause-plan-btn-dca-plan-1');
		fireEvent.click(pauseBtn);

		await waitFor(() => {
			expect(screen.getByTestId('dca-status-badge-dca-plan-1')).toHaveTextContent('paused');
		});

		const resumeBtn = await screen.findByTestId('resume-plan-btn-dca-plan-1');
		fireEvent.click(resumeBtn);

		await waitFor(() => {
			expect(screen.getByTestId('dca-status-badge-dca-plan-1')).toHaveTextContent('active');
		});
	});

	it('opens DcaPlanModal, displays approved budget and next run time, and creates a new plan', async () => {
		renderPage();

		const createBtn = await screen.findByTestId('create-dca-plan-btn');
		fireEvent.click(createBtn);

		expect(screen.getByTestId('dca-plan-modal')).toBeInTheDocument();
		expect(screen.getByTestId('dca-next-run-preview')).toBeInTheDocument();
		expect(screen.getByTestId('dca-approved-budget')).toBeInTheDocument();

		const capInput = screen.getByTestId('dca-cap-input');
		fireEvent.change(capInput, { target: { value: '200' } });
		expect(screen.getByTestId('dca-approved-budget')).toHaveTextContent('200 XLM');

		const submitBtn = screen.getByTestId('dca-submit-button');
		expect(submitBtn).toBeDisabled();

		fireEvent.click(screen.getByTestId('dca-spending-approval-checkbox'));
		expect(submitBtn).not.toBeDisabled();

		fireEvent.click(submitBtn);

		await waitFor(() => {
			expect(screen.queryByTestId('dca-plan-modal')).not.toBeInTheDocument();
		});
	});
});
