/**
 * Fee discount tier chip (#1173).
 *
 * Shows the wallet's loyalty tier name + discount percentage, coloured by
 * tier. Only rendered when the wallet has an active discount — callers gate
 * on `hasActiveDiscount`.
 */

import React from 'react';
import {
	TIER_COLOURS,
	type FeeDiscount,
	type FeeDiscountTier,
} from '@/utils/feeDiscount.utils';

export interface FeeDiscountChipProps {
	discount: FeeDiscount;
	/** Override the default tier colour classes (tests / storybook). */
	className?: string;
}

function tierColour(tier: FeeDiscountTier): string {
	return TIER_COLOURS[tier] ?? TIER_COLOURS.None;
}

const FeeDiscountChip: React.FC<FeeDiscountChipProps> = ({
	discount,
	className = '',
}) => {
	const label = `${discount.tier} · −${discount.discountPercent}%`;

	return (
		<span
			className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold tracking-wide ${tierColour(
				discount.tier
			)} ${className}`}
			data-testid="fee-discount-chip"
			data-tier={discount.tier}
			data-discount-percent={discount.discountPercent}
			title={`${discount.tier} loyalty tier — ${discount.discountPercent}% off fees`}
		>
			{label}
		</span>
	);
};

export default FeeDiscountChip;
