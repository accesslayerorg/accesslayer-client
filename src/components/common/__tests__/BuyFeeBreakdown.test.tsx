/**
 * Unit tests for BuyFeeBreakdown component.
 * Verifies correct rendering of fee breakdown, loading states, and error handling.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BuyFeeBreakdown from '@/components/common/BuyFeeBreakdown';
import type { FeeBreakdown } from '@/utils/pricePreview.utils';

describe('BuyFeeBreakdown', () => {
	const mockBreakdown: FeeBreakdown = {
		grossCostStroops: 10_000_000, // 1 XLM
		protocolFeeStroops: 250_000, // 0.025 XLM
		protocolFeeBps: 250, // 2.5%
		creatorFeeStroops: 250_000, // 0.025 XLM
		creatorFeeBps: 250, // 2.5%
		totalCostStroops: 10_500_000, // 1.05 XLM
	};

	describe('fee breakdown rendering', () => {
		it('renders gross cost, protocol fee, creator fee, and total for a given preview response', () => {
			const onRetry = vi.fn();

			render(
				<BuyFeeBreakdown
					breakdown={mockBreakdown}
					isLoading={false}
					error={null}
					onRetry={onRetry}
				/>
			);

			// Verify all fee lines are rendered
			expect(screen.getByTestId('buy-fee-breakdown')).toBeInTheDocument();
			expect(
				screen.getByTestId('buy-fee-breakdown-gross')
			).toBeInTheDocument();
			expect(
				screen.getByTestId('buy-fee-breakdown-protocol')
			).toBeInTheDocument();
			expect(
				screen.getByTestId('buy-fee-breakdown-creator')
			).toBeInTheDocument();
			expect(
				screen.getByTestId('buy-fee-breakdown-total')
			).toBeInTheDocument();
		});

		it('displays correct fee percentages and tooltip', () => {
			const onRetry = vi.fn();

			render(
				<BuyFeeBreakdown
					breakdown={mockBreakdown}
					isLoading={false}
					error={null}
					onRetry={onRetry}
				/>
			);

			// Check protocol fee percentage
			expect(
				screen.getByTestId('buy-fee-breakdown-protocol')
			).toHaveTextContent('Protocol Fee (2.50%)');

			// Check protocol fee tooltip
			expect(screen.getByTestId('protocol-fee-tooltip')).toBeInTheDocument();

			// Check creator royalty percentage
			expect(
				screen.getByTestId('buy-fee-breakdown-creator')
			).toHaveTextContent('Creator Royalty (2.50%)');
		});

		it('hides protocol fee row when protocol fee is zero', () => {
			const breakdownNoProtocolFee: FeeBreakdown = {
				...mockBreakdown,
				protocolFeeBps: 0,
				protocolFeeStroops: 0,
			};

			const onRetry = vi.fn();

			render(
				<BuyFeeBreakdown
					breakdown={breakdownNoProtocolFee}
					isLoading={false}
					error={null}
					onRetry={onRetry}
				/>
			);

			expect(
				screen.queryByTestId('buy-fee-breakdown-protocol')
			).not.toBeInTheDocument();
			expect(
				screen.getByTestId('buy-fee-breakdown-creator')
			).toBeInTheDocument();
		});

		it('hides creator fee row when creator fee is zero', () => {
			const breakdownNoCreatorFee: FeeBreakdown = {
				...mockBreakdown,
				creatorFeeBps: 0,
				creatorFeeStroops: 0,
			};

			const onRetry = vi.fn();

			render(
				<BuyFeeBreakdown
					breakdown={breakdownNoCreatorFee}
					isLoading={false}
					error={null}
					onRetry={onRetry}
				/>
			);

			expect(
				screen.queryByTestId('buy-fee-breakdown-creator')
			).not.toBeInTheDocument();
			expect(
				screen.getByTestId('buy-fee-breakdown-protocol')
			).toBeInTheDocument();
		});

		it('formats and displays fee amounts in XLM', () => {
			const onRetry = vi.fn();

			render(
				<BuyFeeBreakdown
					breakdown={mockBreakdown}
					isLoading={false}
					error={null}
					onRetry={onRetry}
				/>
			);

			// Gross cost (1 XLM)
			expect(
				screen.getByTestId('buy-fee-breakdown-gross')
			).toHaveTextContent('1 XLM');

			// Total cost (1.05 XLM)
			expect(
				screen.getByTestId('buy-fee-breakdown-total')
			).toHaveTextContent('1.05 XLM');
		});
	});

	describe('loading state', () => {
		it('displays loading spinner and status message when isLoading is true', () => {
			const onRetry = vi.fn();

			render(
				<BuyFeeBreakdown
					breakdown={null}
					isLoading={true}
					error={null}
					onRetry={onRetry}
				/>
			);

			expect(
				screen.getByTestId('buy-fee-breakdown-loading')
			).toBeInTheDocument();
			expect(screen.getByText('Calculating fees…')).toBeInTheDocument();
		});

		it('has appropriate ARIA attributes for loading state', () => {
			const onRetry = vi.fn();

			render(
				<BuyFeeBreakdown
					breakdown={null}
					isLoading={true}
					error={null}
					onRetry={onRetry}
				/>
			);

			const loadingDiv = screen.getByTestId('buy-fee-breakdown-loading');
			expect(loadingDiv).toHaveAttribute('role', 'status');
			expect(loadingDiv).toHaveAttribute('aria-live', 'polite');
		});
	});

	describe('error state', () => {
		it('displays error message with retry button when error is present', () => {
			const onRetry = vi.fn();
			const errorMessage = 'Failed to calculate price preview';

			render(
				<BuyFeeBreakdown
					breakdown={null}
					isLoading={false}
					error={errorMessage}
					onRetry={onRetry}
				/>
			);

			expect(
				screen.getByTestId('buy-fee-breakdown-error')
			).toBeInTheDocument();
			expect(screen.getByText(errorMessage)).toBeInTheDocument();
			expect(
				screen.getByTestId('buy-fee-breakdown-retry')
			).toBeInTheDocument();
		});

		it('calls onRetry callback when retry button is clicked', () => {
			const onRetry = vi.fn();

			render(
				<BuyFeeBreakdown
					breakdown={null}
					isLoading={false}
					error="Fetch failed"
					onRetry={onRetry}
				/>
			);

			const retryButton = screen.getByTestId('buy-fee-breakdown-retry');
			fireEvent.click(retryButton);

			expect(onRetry).toHaveBeenCalledTimes(1);
		});

		it('has alert role for error state', () => {
			const onRetry = vi.fn();

			render(
				<BuyFeeBreakdown
					breakdown={null}
					isLoading={false}
					error="Network error"
					onRetry={onRetry}
				/>
			);

			expect(screen.getByTestId('buy-fee-breakdown-error')).toHaveAttribute(
				'role',
				'alert'
			);
		});
	});

	describe('null breakdown handling', () => {
		it('renders nothing when breakdown is null, not loading, and no error', () => {
			const onRetry = vi.fn();

			const { container } = render(
				<BuyFeeBreakdown
					breakdown={null}
					isLoading={false}
					error={null}
					onRetry={onRetry}
				/>
			);

			expect(container.firstChild).toBeNull();
		});
	});

	describe('edge cases', () => {
		it('handles very large fee amounts correctly', () => {
			const largeBreakdown: FeeBreakdown = {
				grossCostStroops: 1_000_000_000, // 100 XLM
				protocolFeeStroops: 50_000_000, // 5 XLM
				protocolFeeBps: 500,
				creatorFeeStroops: 50_000_000, // 5 XLM
				creatorFeeBps: 500,
				totalCostStroops: 1_100_000_000, // 110 XLM
			};

			const onRetry = vi.fn();

			render(
				<BuyFeeBreakdown
					breakdown={largeBreakdown}
					isLoading={false}
					error={null}
					onRetry={onRetry}
				/>
			);

			expect(screen.getByTestId('buy-fee-breakdown')).toBeInTheDocument();
			expect(
				screen.getByTestId('buy-fee-breakdown-total')
			).toHaveTextContent('110 XLM');
		});

		it('handles fractional fee percentages', () => {
			const fractionalBreakdown: FeeBreakdown = {
				grossCostStroops: 1_000_000,
				protocolFeeStroops: 15_000,
				protocolFeeBps: 150, // 1.5%
				creatorFeeStroops: 10_000,
				creatorFeeBps: 100, // 1%
				totalCostStroops: 1_025_000,
			};

			const onRetry = vi.fn();

			render(
				<BuyFeeBreakdown
					breakdown={fractionalBreakdown}
					isLoading={false}
					error={null}
					onRetry={onRetry}
				/>
			);

			expect(
				screen.getByTestId('buy-fee-breakdown-protocol')
			).toHaveTextContent('Protocol Fee (1.50%)');
			expect(
				screen.getByTestId('buy-fee-breakdown-creator')
			).toHaveTextContent('Creator Royalty (1.00%)');
		});
	});
});
