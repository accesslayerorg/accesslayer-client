// src/services/feeDiscount.service.ts
import { BaseApiService, type APIResponse } from './api.service';
import {
	NO_FEE_DISCOUNT,
	type FeeDiscount,
	type FeeDiscountTier,
} from '@/utils/feeDiscount.utils';

/** Raw shape returned by GET /wallet/:address/fee-discount. */
interface FeeDiscountDto {
	tier?: string;
	discountPercent?: number;
	discount_percent?: number;
	active?: boolean;
}

const VALID_TIERS: readonly FeeDiscountTier[] = [
	'None',
	'Bronze',
	'Silver',
	'Gold',
	'Platinum',
];

function normalizeTier(value: unknown): FeeDiscountTier {
	if (typeof value !== 'string') return 'None';
	const match = VALID_TIERS.find(
		t => t.toLowerCase() === value.trim().toLowerCase()
	);
	return match ?? 'None';
}

function normalizeDiscount(dto: FeeDiscountDto | null | undefined): FeeDiscount {
	if (!dto) return NO_FEE_DISCOUNT;

	const rawPercent = dto.discountPercent ?? dto.discount_percent ?? 0;
	const discountPercent =
		typeof rawPercent === 'number' && Number.isFinite(rawPercent)
			? Math.min(100, Math.max(0, rawPercent))
			: 0;

	const tier = normalizeTier(dto.tier);
	const active = dto.active !== false && tier !== 'None' && discountPercent > 0;

	return { tier, discountPercent, active };
}

class FeeDiscountService extends BaseApiService {
	/**
	 * Fetch the connected wallet's active fee discount tier.
	 * Returns `NO_FEE_DISCOUNT` (tier None, 0%) when the wallet has none,
	 * so callers can render without a special null path.
	 */
	async getFeeDiscount(address: string): Promise<FeeDiscount> {
		try {
			const response = await this.api.get<APIResponse<FeeDiscountDto | null>>(
				`/wallet/${address}/fee-discount`
			);
			return normalizeDiscount(response.data?.data);
		} catch {
			// A missing/failed discount lookup must never block the trade flow —
			// degrade to "no discount" rather than surfacing an error modal.
			return NO_FEE_DISCOUNT;
		}
	}
}

export const feeDiscountService = new FeeDiscountService();

export async function fetchFeeDiscount(address: string): Promise<FeeDiscount> {
	return feeDiscountService.getFeeDiscount(address);
}

export { normalizeDiscount, normalizeTier };
