/**
 * Unit tests for the DynamicFeeBreakdown component (#994).
 *
 * Locks in the issue acceptance criteria: all four fee components render
 * with correct values, the effective rate is highlighted, the total fee is
 * shown in both key units and USD, every component has a tooltip, and
 * loading / error states behave.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import DynamicFeeBreakdown from '../DynamicFeeBreakdown';
import type { DynamicFeeBreakdown as DynamicFeeBreakdownData } from '@/utils/dynamicFeeRate.utils';
import { STROOPS_PER_XLM } from '@/constants/stellar';

function makeBreakdown(
	overrides: Partial<DynamicFeeBreakdownData> = {}
): DynamicFeeBreakdownData {
	return {
		baseFeeStroops: 5 * STROOPS_PER_XLM,
		volumeTierDiscountStroops: 0,
		protocolFeeStroops: 2.5 * STROOPS_PER_XLM,
		creatorRoyaltyStroops: 2.5 * STROOPS_PER_XLM,
		effectiveFeeBps: 1000,
		totalFeeStroops: 10 * STROOPS_PER_XLM,
		notionalStroops: 100 * STROOPS_PER_XLM,
		isSell: false,
		totalFeeUsd: null,
		netProceedsStroops: null,
		...overrides,
	};
}

function renderComponent(
	props: Partial<React.ComponentProps<typeof DynamicFeeBreakdown>> = {}
) {
	return render(
		<DynamicFeeBreakdown
			breakdown={makeBreakdown()}
			isLoading={false}
			error={null}
			onRetry={vi.fn()}
			{...props}
		/>
	);
}

describe('DynamicFeeBreakdown (#994)', () => {
	describe('fee component rendering', () => {
		it('renders all four fee components with their amounts', () => {
			renderComponent();

			expect(screen.getByTestId('dynamic-fee-breakdown')).toBeInTheDocument();
			expect(screen.getByTestId('fee-breakdown-base-fee')).toHaveTextContent(
				'Base Fee'
			);
			expect(screen.getByTestId('fee-breakdown-base-fee')).toHaveTextContent(
				'5 XLM'
			);
			expect(
				screen.getByTestId('fee-breakdown-protocol-fee')
			).toHaveTextContent('2.5 XLM');
			expect(
				screen.getByTestId('fee-breakdown-creator-royalty')
			).toHaveTextContent('2.5 XLM');
		});

		it('hides the volume tier discount row when there is no discount', () => {
			renderComponent();

			expect(
				screen.queryByTestId('fee-breakdown-volume-tier-discount')
			).not.toBeInTheDocument();
		});

		it('shows the volume tier discount as a credited amount when present', () => {
			renderComponent({
				breakdown: makeBreakdown({
					volumeTierDiscountStroops: 1 * STROOPS_PER_XLM,
					effectiveFeeBps: 900,
					totalFeeStroops: 9 * STROOPS_PER_XLM,
				}),
			});

			const discountRow = screen.getByTestId(
				'fee-breakdown-volume-tier-discount'
			);
			expect(discountRow).toHaveTextContent('Volume Tier Discount');
			expect(discountRow).toHaveTextContent('-1 XLM');
		});

		it('highlights the effective rate value', () => {
			renderComponent({
				breakdown: makeBreakdown({ effectiveFeeBps: 850 }),
			});

			expect(
				screen.getByTestId('fee-breakdown-effective-rate')
			).toHaveTextContent('Effective Rate');
			expect(
				screen.getByTestId('fee-breakdown-effective-rate-value')
			).toHaveTextContent('8.5%');
		});

		it('shows the total fee in key units', () => {
			renderComponent();

			expect(
				screen.getByTestId('fee-breakdown-total-key')
			).toHaveTextContent('10 XLM');
		});

		it('shows the USD equivalent when an XLM/USD rate is available', () => {
			renderComponent({
				breakdown: makeBreakdown({
					totalFeeStroops: 10 * STROOPS_PER_XLM,
					totalFeeUsd: 4.9123,
				}),
			});

			expect(screen.getByTestId('fee-breakdown-total-usd')).toHaveTextContent(
				'≈ $4.91 USD'
			);
		});

		it('omits the USD equivalent when no rate is known', () => {
			renderComponent({
				breakdown: makeBreakdown({ totalFeeUsd: null }),
			});

			expect(
				screen.queryByTestId('fee-breakdown-total-usd')
			).not.toBeInTheDocument();
		});

		it('shows net proceeds for sell trades', () => {
			renderComponent({
				breakdown: makeBreakdown({
					isSell: true,
					netProceedsStroops: 90 * STROOPS_PER_XLM,
				}),
			});

			expect(
				screen.getByTestId('fee-breakdown-net-proceeds')
			).toHaveTextContent('90 XLM');
		});

		it('omits net proceeds for buy trades', () => {
			renderComponent();

			expect(
				screen.queryByTestId('fee-breakdown-net-proceeds')
			).not.toBeInTheDocument();
		});
	});

	describe('tooltips', () => {
		it('attaches an info tooltip to every fee component and the effective rate', () => {
			renderComponent();

			expect(
				screen.getByTestId('fee-breakdown-base-fee-tooltip')
			).toBeInTheDocument();
			expect(
				screen.getByTestId('fee-breakdown-protocol-fee-tooltip')
			).toBeInTheDocument();
			expect(
				screen.getByTestId('fee-breakdown-creator-royalty-tooltip')
			).toBeInTheDocument();
			expect(
				screen.getByTestId('fee-breakdown-effective-rate-tooltip')
			).toBeInTheDocument();
		});

		it('attaches a tooltip to the volume tier discount when it is shown', () => {
			renderComponent({
				breakdown: makeBreakdown({ volumeTierDiscountStroops: STROOPS_PER_XLM }),
			});

			expect(
				screen.getByTestId('fee-breakdown-volume-tier-discount-tooltip')
			).toBeInTheDocument();
		});

		it('exposes tooltip copy that explains each component clearly', () => {
			renderComponent({
				breakdown: makeBreakdown({ volumeTierDiscountStroops: STROOPS_PER_XLM }),
			});

			expect(
				screen.getByTestId('fee-breakdown-base-fee-tooltip')
			).toHaveAttribute('aria-label', 'Base Fee info');
			expect(
				screen.getByTestId('fee-breakdown-volume-tier-discount-tooltip')
			).toHaveAttribute(
				'aria-label',
				'Volume Tier Discount info'
			);
			expect(
				screen.getByTestId('fee-breakdown-protocol-fee-tooltip')
			).toHaveAttribute('aria-label', 'Protocol Fee info');
			expect(
				screen.getByTestId('fee-breakdown-creator-royalty-tooltip')
			).toHaveAttribute('aria-label', 'Creator Royalty info');
		});

		it('renders the explanation copy inside the tooltip content', () => {
			renderComponent({
				breakdown: makeBreakdown({ volumeTierDiscountStroops: STROOPS_PER_XLM }),
			});

			// Each row renders its own tooltip element (role="tooltip"); the
			// first belongs to the base fee row.
			const tooltips = screen.getAllByRole('tooltip');
			expect(tooltips.length).toBeGreaterThanOrEqual(5);
			expect(tooltips[0]).toHaveTextContent(
				/Base fee percentage applied to every trade/i
			);
			expect(tooltips[1]).toHaveTextContent(
				/Discount earned by trading larger amounts/i
			);
			expect(tooltips[2]).toHaveTextContent(
				/Protocol fee that funds platform maintenance/i
			);
			expect(tooltips[3]).toHaveTextContent(
				/Royalty paid to the creator on every trade/i
			);
		});
	});

	describe('loading state', () => {
		it('renders the loading placeholder while the contract rate is fetched', () => {
			renderComponent({ breakdown: null, isLoading: true });

			expect(
				screen.getByTestId('dynamic-fee-breakdown-loading')
			).toBeInTheDocument();
			expect(screen.getByText('Fetching fee rate…')).toBeInTheDocument();
		});

		it('exposes the loading state politely to assistive tech', () => {
			renderComponent({ breakdown: null, isLoading: true });

			const loading = screen.getByTestId('dynamic-fee-breakdown-loading');
			expect(loading).toHaveAttribute('role', 'status');
			expect(loading).toHaveAttribute('aria-live', 'polite');
		});

		it('renders the loading placeholder when breakdown is null even if not loading', () => {
			renderComponent({ breakdown: null, isLoading: false });

			expect(
				screen.getByTestId('dynamic-fee-breakdown-loading')
			).toBeInTheDocument();
		});
	});

	describe('error state', () => {
		it('renders the error message with a retry affordance', () => {
			const onRetry = vi.fn();
			renderComponent({
				breakdown: null,
				isLoading: false,
				error: 'RPC timeout',
				onRetry,
			});

			expect(screen.getByTestId('dynamic-fee-breakdown-error')).toHaveTextContent(
				/Couldn't load the current fee rate from the contract/i
			);
			expect(screen.getByTestId('dynamic-fee-breakdown-retry')).toBeInTheDocument();
		});

		it('marks the error region as an alert', () => {
			renderComponent({
				breakdown: null,
				isLoading: false,
				error: 'RPC timeout',
			});

			expect(screen.getByTestId('dynamic-fee-breakdown-error')).toHaveAttribute(
				'role',
				'alert'
			);
		});

		it('invokes onRetry when the retry button is clicked', () => {
			const onRetry = vi.fn();
			renderComponent({
				breakdown: null,
				isLoading: false,
				error: 'RPC timeout',
				onRetry,
			});

			fireEvent.click(screen.getByTestId('dynamic-fee-breakdown-retry'));
			expect(onRetry).toHaveBeenCalledTimes(1);
		});
	});
});
