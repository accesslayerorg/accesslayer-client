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
	/** True when the holder is a smart contract (vault, marketplace, etc.). */
	isContract?: boolean;
	/** Known contract name, when the backend can resolve one. */
	contractName?: string;
}

export interface RankedKeyHolder extends KeyHolder {
	rank: number;
	sharePercent: number;
	/** Staked portion of `keyCount`, normalised to a non-negative integer-ish number. */
	stakedQuantity: number;
	/** Liquid (non-staked) portion of `keyCount` — `keyCount - stakedQuantity`, floored at 0. */
	liquidQuantity: number;
}

export interface RankKeyHoldersOptions {
	/** When true, holders flagged as contracts are dropped before ranking. */
	excludeContracts?: boolean;
}

/**
 * Parses the `excludeContracts` flag from a URL query value so the toggle can
 * persist in the URL. Only the literal string "1" or "true" enables it.
 */
export function parseExcludeContractsParam(value: string | null | undefined): boolean {
	return value === "1" || value === "true";
}

/**
 * Serialises the `excludeContracts` flag for the URL query. Returns `null` when
 * disabled so the param is removed rather than cluttering the URL.
 */
export function serialiseExcludeContractsParam(enabled: boolean): string | null {
	return enabled ? "1" : null;
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
 * When `excludeContracts` is set, contract holders are removed before ranking
 * so ranks and supply shares are recomputed over wallet-only holders.
 *
 * Ranks are competition-style ("1224"): holders tied on total quantity share
 * the same rank, and the next distinct count resumes at its 1-indexed position.
 */
export function rankKeyHolders(
	holders: KeyHolder[],
	options: RankKeyHoldersOptions = {}
): RankedKeyHolder[] {
	const source = options.excludeContracts
		? holders.filter(holder => !holder.isContract)
		: holders;
	const sorted = [...source].sort((a, b) => b.keyCount - a.keyCount);
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
