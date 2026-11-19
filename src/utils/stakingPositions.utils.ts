import { resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import type { StakingPosition } from '@/services/stakingPositions.service';

const normalizeStakedQuantity = (quantity: number) => {
	if (!Number.isFinite(quantity) || quantity <= 0) return 0;
	return quantity;
};

/**
 * A staking position is unlocked once its `unlockLedger` (a Unix epoch
 * timestamp in seconds) has passed.
 */
export function isStakePositionUnlocked(
	position: Pick<StakingPosition, 'unlockLedger'>,
	nowMs: number = Date.now()
): boolean {
	if (!position.unlockLedger) return false;
	return position.unlockLedger * 1000 <= nowMs;
}

/** Seconds remaining until the staking position unlocks (0 when unlocked). */
export function computeRemainingStakeLockSeconds(
	position: Pick<StakingPosition, 'unlockLedger'>,
	nowMs: number = Date.now()
): number {
	if (!position.unlockLedger) return 0;
	return Math.max(0, Math.ceil((position.unlockLedger * 1000 - nowMs) / 1000));
}

/**
 * Current value of a single staked position in stroops (bonding-curve key
 * price × staked quantity). Returns `null` when the price can't be resolved.
 */
export function computeStakedPositionValueStroops(
	position: StakingPosition
): number | null {
	const priceStroops = resolveCreatorKeyPriceStroops(position);
	const quantity = normalizeStakedQuantity(position.stakedQuantity);

	if (priceStroops == null || quantity === 0) return null;

	return priceStroops * quantity;
}

/**
 * Aggregates the current value across all staking positions in stroops.
 *
 * Mirrors `calculatePortfolioValue` from the holdings side: the total is
 * withheld when any position with keys staked is missing a price so the UI
 * never presents an incorrect staked total as complete.
 */
export function computeStakingPortfolioValueStroops(
	positions: StakingPosition[]
): number | null {
	const active = positions.filter(
		position => normalizeStakedQuantity(position.stakedQuantity) > 0
	);

	if (active.length === 0) return 0;

	if (
		active.some(position => resolveCreatorKeyPriceStroops(position) == null)
	) {
		return null;
	}

	return active.reduce((total, position) => {
		const priceStroops = resolveCreatorKeyPriceStroops(position);
		return (
			total +
			(priceStroops ?? 0) * normalizeStakedQuantity(position.stakedQuantity)
		);
	}, 0);
}

/** Formats a staked quantity for display, e.g. "250.5 keys". */
export function formatStakedQuantity(quantity: number): string {
	return `${Number(quantity.toFixed(4)).toLocaleString()} keys`;
}

/** Formats a claimable reward in XLM for display. */
export function formatClaimableReward(reward: number): string {
	const xlm = (reward ?? 0) / STROOPS_PER_XLM;
	return `${xlm.toFixed(4)} XLM`;
}
