/**
 * Fee discount tier indicator tests (#1173).
 *
 * Covers the acceptance criteria:
 *  - fee breakdown renders correct base, discount, and final amounts
 *  - discount chip shows correct tier name and percentage
 *  - no chip shown for zero-discount wallets
 *  - tier colour applied per discount tier
 *  - final fee reflects the accurately discounted amount
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import BuyFeeBreakdown from '@/components/common/BuyFeeBreakdown';
import FeeDiscountChip from '@/components/common/FeeDiscountChip';
import {
	applyFeeDiscount,
	buildFeeDiscountBreakdown,
	hasActiveDiscount,
	NO_FEE_DISCOUNT,
	TIER_COLOURS,
	type FeeDiscount,
} from '@/utils/feeDiscount.utils';
import { normalizeDiscount } from '@/services/feeDiscount.service';
import type { FeeBreakdown } from '@/utils/pricePreview.utils';

const breakdown: FeeBreakdown = {
	grossCostStroops: 10_000_000,
	protocolFeeStroops: 250_000,
	protocolFeeBps: 250,
	creatorFeeStroops: 250_000,
	creatorFeeBps: 250,
	totalCostStroops: 10_500_000,
};

// Base fee = protocol + creator = 500_000. A 20% Gold discount → 400_000.
const goldDiscount: FeeDiscount = {
	tier: 'Gold',
	discountPercent: 20,
	active: true,
};

function renderBreakdown(discount: FeeDiscount | null = null) {
	return render(
		<BuyFeeBreakdown
			breakdown={breakdown}
			isLoading={false}
			error={null}
			onRetry={vi.fn()}
			feeDiscount={discount}
		/>
	);
}

describe('fee discount breakdown (#1173)', () => {
	it('renders correct base, discount, and final amounts', () => {
		renderBreakdown(goldDiscount);

		expect(screen.getByTestId('buy-fee-breakdown-base-fee')).toHaveTextContent('0.05');
		expect(screen.getByTestId('buy-fee-breakdown-discount')).toHaveTextContent('−20%');
		expect(screen.getByTestId('buy-fee-breakdown-discount')).toHaveTextContent('−0.01');
		// Final fee = 500_000 - 100_000 = 400_000
		expect(screen.getByTestId('buy-fee-breakdown-final-fee')).toHaveTextContent('0.04');
	});

	it('final fee reflects the accurately discounted amount in the total', () => {
		renderBreakdown(goldDiscount);

		// total = gross 1.0 + final fee 0.04 = 1.04
		expect(screen.getByTestId('buy-fee-breakdown-total')).toHaveTextContent('1.04');
	});

	it('shows the discount chip with the correct tier name and percentage', () => {
		renderBreakdown(goldDiscount);

		const chip = screen.getByTestId('fee-discount-chip');
		expect(chip).toHaveTextContent('Gold');
		expect(chip).toHaveTextContent('−20%');
		expect(chip.getAttribute('data-tier')).toBe('Gold');
		expect(chip.getAttribute('data-discount-percent')).toBe('20');
	});

	it('shows no discount chip for wallets with no active discount', () => {
		renderBreakdown(null);

		expect(screen.queryByTestId('fee-discount-chip')).not.toBeInTheDocument();
		expect(screen.queryByTestId('buy-fee-breakdown-discount')).not.toBeInTheDocument();
		// Base fee still renders, and final fee equals base fee.
		expect(screen.getByTestId('buy-fee-breakdown-base-fee')).toHaveTextContent('0.05');
		expect(screen.getByTestId('buy-fee-breakdown-final-fee')).toHaveTextContent('0.05');
	});

	it.each([
		['Bronze', 5],
		['Silver', 10],
		['Gold', 20],
		['Platinum', 35],
	] as const)('applies the %s tier colour', (tier, percent) => {
		renderBreakdown({ tier, discountPercent: percent, active: true });

		const chip = screen.getByTestId('fee-discount-chip');
		expect(chip.className).toContain(TIER_COLOURS[tier].split(' ')[0]);
	});
});

describe('applyFeeDiscount (#1173)', () => {
	it('subtracts the percentage and rounds half-up', () => {
		expect(applyFeeDiscount(500_000, 20)).toBe(400_000);
		expect(applyFeeDiscount(100, 0)).toBe(100);
		expect(applyFeeDiscount(100, 100)).toBe(0);
		// 10% of 5 stroops = 0.5 → rounds to 1
		expect(applyFeeDiscount(5, 10)).toBe(4);
	});

	it('rejects out-of-range percentages', () => {
		expect(() => applyFeeDiscount(100, -1)).toThrow();
		expect(() => applyFeeDiscount(100, 101)).toThrow();
	});
});

describe('buildFeeDiscountBreakdown (#1173)', () => {
	it('produces base / discountAmount / finalFee', () => {
		const rows = buildFeeDiscountBreakdown(500_000, goldDiscount);
		expect(rows.baseFee).toBe(500_000);
		expect(rows.discountAmount).toBe(100_000);
		expect(rows.finalFee).toBe(400_000);
		expect(rows.discount).toEqual(goldDiscount);
	});

	it('treats a zero-percent discount as no discount', () => {
		const rows = buildFeeDiscountBreakdown(500_000, {
			tier: 'Bronze',
			discountPercent: 0,
			active: true,
		});
		expect(rows.discount).toBeNull();
		expect(rows.finalFee).toBe(500_000);
	});
});

describe('hasActiveDiscount (#1173)', () => {
	it('is false for NO_FEE_DISCOUNT and null', () => {
		expect(hasActiveDiscount(NO_FEE_DISCOUNT)).toBe(false);
		expect(hasActiveDiscount(null)).toBe(false);
		expect(hasActiveDiscount(undefined)).toBe(false);
	});

	it('is true for an active tier with a positive percentage', () => {
		expect(hasActiveDiscount(goldDiscount)).toBe(true);
	});
});

describe('normalizeDiscount (#1173)', () => {
	it('maps API payloads onto FeeDiscount', () => {
		expect(normalizeDiscount({ tier: 'gold', discountPercent: 20, active: true })).toEqual({
			tier: 'Gold',
			discountPercent: 20,
			active: true,
		});
		// snake_case variant
		expect(normalizeDiscount({ tier: 'Silver', discount_percent: 10 })).toEqual({
			tier: 'Silver',
			discountPercent: 10,
			active: true,
		});
	});

	it('degrades to no discount for missing/unknown tiers', () => {
		expect(normalizeDiscount(null)).toEqual(NO_FEE_DISCOUNT);
		expect(normalizeDiscount({ tier: 'Diamond', discountPercent: 50 })).toEqual(NO_FEE_DISCOUNT);
		expect(normalizeDiscount({ tier: 'Gold', discountPercent: 0 })).toEqual(NO_FEE_DISCOUNT);
	});
});

describe('FeeDiscountChip (#1173)', () => {
	it('renders tier name and percentage', () => {
		render(<FeeDiscountChip discount={goldDiscount} />);
		expect(screen.getByTestId('fee-discount-chip')).toHaveTextContent('Gold · −20%');
	});

	it('marks the tier colour via className', () => {
		render(
			<FeeDiscountChip discount={{ tier: 'Platinum', discountPercent: 35, active: true }} />
		);
		const chip = screen.getByTestId('fee-discount-chip');
		expect(chip.className).toContain('violet');
	});
});
