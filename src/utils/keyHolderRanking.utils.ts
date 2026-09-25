export interface KeyHolder {
	id: string;
	displayName: string;
	/**
	 * Total keys attributed to this holder, counting both liquid keys sitting
	 * in the wallet and keys currently locked in the staking contract.
	 */
	keyCount: number;
	/**
	 * How many of `keyCount` are currently staked. Optional for callers that
	 * predate the staking-aware holders endpoint; treated as `0` when absent.
	 */
	stakedQuantity?: number;
	walletAddress?: string;
}

export interface RankedKeyHolder extends KeyHolder {
	rank: number;
	sharePercent: number;
	/** Staked portion of `keyCount`, normalised to a non-negative integer-ish number. */
	stakedQuantity: number;
	/** Liquid (non-staked) portion of `keyCount` — `keyCount - stakedQuantity`, floored at 0. */
	liquidQuantity: number;
}

function normaliseStaked(holder: KeyHolder): number {
	const staked = holder.stakedQuantity ?? 0;
	if (!Number.isFinite(staked) || staked <= 0) return 0;
	// A holder can never have more staked than they hold in total.
	return Math.min(staked, holder.keyCount);
}

/**
 * Ranks holders descending by total quantity held (liquid + staked) and
 * computes each holder's share of the total supply held across the list.
 *
 * Staked keys still count toward a holder's ranking — a holder who has staked
 * their entire position is ranked exactly as if those keys were liquid. Each
 * ranked entry also carries the `stakedQuantity` / `liquidQuantity` split so
 * the holders table can surface true liquid supply per row.
 *
 * Ranks are competition-style ("1224"): holders tied on total quantity share
 * the same rank, and the next distinct count resumes at its 1-indexed position
 * rather than incrementing by 1 — e.g. two holders tied for 1st both get
 * rank 1, and the following holder gets rank 3, not rank 2.
 */
export function rankKeyHolders(holders: KeyHolder[]): RankedKeyHolder[] {
	const sorted = [...holders].sort((a, b) => b.keyCount - a.keyCount);
	const totalKeys = sorted.reduce((sum, holder) => sum + holder.keyCount, 0);

	let currentRank = 0;
	let previousKeyCount: number | null = null;

	return sorted.map((holder, index) => {
		if (holder.keyCount !== previousKeyCount) {
			currentRank = index + 1;
			previousKeyCount = holder.keyCount;
		}

		const stakedQuantity = normaliseStaked(holder);

		return {
			...holder,
			rank: currentRank,
			sharePercent: totalKeys > 0 ? (holder.keyCount / totalKeys) * 100 : 0,
			stakedQuantity,
			liquidQuantity: Math.max(0, holder.keyCount - stakedQuantity),
		};
	});
}
