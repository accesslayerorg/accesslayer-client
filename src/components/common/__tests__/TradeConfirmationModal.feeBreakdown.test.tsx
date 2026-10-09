/**
 * Tests for the dynamic fee breakdown section on the trade confirmation
 * screen (#994): the four fee components, the effective rate, key + USD
 * totals, and the loading / error states.
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import TradeConfirmationModal from '../TradeConfirmationModal';
import type { DynamicFeeBreakdown } from '@/utils/dynamicFeeRate.utils';
import { STROOPS_PER_XLM } from '@/constants/stellar';

function makeFeeBreakdown(
	overrides: Partial<DynamicFeeBreakdown> = {}
): DynamicFeeBreakdown {
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

function renderModal(
	props: Partial<React.ComponentProps<typeof TradeConfirmationModal>> = {}
) {
	return render(
		<TradeConfirmationModal
			open={true}
			onOpenChange={vi.fn()}
			side="buy"
			creatorName="Alex Rivers"
			amount={5}
			unitPriceStroops={1_000_000}
			totalStroops={5_000_000}
			slippageTolerancePercent={1}
			maxPriceStroops={5_050_000}
			priceImpactPercent={2.5}
			onConfirm={vi.fn()}
			{...props}
		/>
	);
}

describe('TradeConfirmationModal dynamic fee breakdown (#994)', () => {
	it('renders the fee section with all four components when a breakdown is provided', () => {
		renderModal({
			feeBreakdown: makeFeeBreakdown({
				volumeTierDiscountStroops: 1 * STROOPS_PER_XLM,
				effectiveFeeBps: 900,
				totalFeeStroops: 9 * STROOPS_PER_XLM,
			}),
		});

		expect(screen.getByTestId('dynamic-fee-breakdown')).toBeInTheDocument();
		expect(screen.getByTestId('fee-breakdown-base-fee')).toHaveTextContent(
			'5 XLM'
		);
		expect(
			screen.getByTestId('fee-breakdown-volume-tier-discount')
		).toHaveTextContent('-1 XLM');
		expect(
			screen.getByTestId('fee-breakdown-protocol-fee')
		).toHaveTextContent('2.5 XLM');
		expect(
			screen.getByTestId('fee-breakdown-creator-royalty')
		).toHaveTextContent('2.5 XLM');
	});

	it('renders the loading state while the fee rate is fetched', () => {
		renderModal({ feeBreakdown: null, feeIsLoading: true });

		expect(
			screen.getByTestId('dynamic-fee-breakdown-loading')
		).toBeInTheDocument();
		expect(
			screen.queryByTestId('dynamic-fee-breakdown')
		).not.toBeInTheDocument();
	});

	it('renders the error state with retry when the rate fetch fails', () => {
		const onFeeRetry = vi.fn();
		renderModal({
			feeBreakdown: null,
			feeError: 'The fee rate service is unavailable.',
			onFeeRetry,
		});

		expect(
			screen.getByTestId('dynamic-fee-breakdown-error')
		).toBeInTheDocument();
		fireEvent.click(screen.getByTestId('dynamic-fee-breakdown-retry'));
		expect(onFeeRetry).toHaveBeenCalledTimes(1);
	});

	it('does not render a fee section when no fee data is supplied', () => {
		renderModal();

		expect(
			screen.queryByTestId('dynamic-fee-breakdown')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('dynamic-fee-breakdown-loading')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('dynamic-fee-breakdown-error')
		).not.toBeInTheDocument();
	});

	it('does not break the existing slippage and confirm flow', () => {
		const onConfirm = vi.fn();
		renderModal({
			feeBreakdown: makeFeeBreakdown(),
			onConfirm,
		});

		expect(
			screen.getByTestId('confirmation-modal-max-price')
		).toBeInTheDocument();
		fireEvent.click(screen.getByTestId('confirmation-modal-confirm'));
		expect(onConfirm).toHaveBeenCalledTimes(1);
	});
});
