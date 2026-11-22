import {
	Coins,
	Droplets,
	Fish,
	Key,
	Trophy,
	Users,
	Vote,
	type LucideIcon,
} from 'lucide-react';

export type WalletBadgeType =
	| 'first-key'
	| 'staker'
	| 'liquidity-provider'
	| 'governance-voter'
	| 'referrer'
	| 'whale'
	| 'top-trader';

export type WalletBadge = {
	type: WalletBadgeType;
	earnedAt: string;
};

export type BadgeDefinition = {
	id: WalletBadgeType;
	name: string;
	criteria: string;
	icon: LucideIcon;
};

export type EarnedBadge = BadgeDefinition & { earnedAt: string };

export const BADGE_CATALOG: readonly BadgeDefinition[] = [
	{
		id: 'first-key',
		name: 'First Key',
		criteria: 'Buy your first creator key',
		icon: Key,
	},
	{
		id: 'staker',
		name: 'Staker',
		criteria: 'Stake creator keys to earn rewards',
		icon: Coins,
	},
	{
		id: 'liquidity-provider',
		name: 'Liquidity Provider',
		criteria: 'Add liquidity to a creator key pool',
		icon: Droplets,
	},
	{
		id: 'governance-voter',
		name: 'Governance Voter',
		criteria: 'Cast a vote on a governance proposal',
		icon: Vote,
	},
	{
		id: 'referrer',
		name: 'Referrer',
		criteria: 'Refer a wallet that completes its first trade',
		icon: Users,
	},
	{
		id: 'whale',
		name: 'Whale',
		criteria: 'Trade 10,000 XLM in creator key volume',
		icon: Fish,
	},
	{
		id: 'top-trader',
		name: 'Top Trader',
		criteria: 'Complete 100 creator key trades',
		icon: Trophy,
	},
];

/**
 * Splits the catalog into earned and locked badges. Earned badges keep catalog
 * order, are de-duplicated, and unknown API badge types are ignored.
 */
export function splitBadges(badges: readonly WalletBadge[]): {
	earned: EarnedBadge[];
	locked: BadgeDefinition[];
} {
	const earnedAtByType = new Map<WalletBadgeType, string>();
	for (const badge of badges) {
		if (!earnedAtByType.has(badge.type)) {
			earnedAtByType.set(badge.type, badge.earnedAt);
		}
	}

	const earned: EarnedBadge[] = [];
	const locked: BadgeDefinition[] = [];
	for (const definition of BADGE_CATALOG) {
		const earnedAt = earnedAtByType.get(definition.id);
		if (earnedAt !== undefined) {
			earned.push({ ...definition, earnedAt });
		} else {
			locked.push(definition);
		}
	}

	return { earned, locked };
}

/** Wallet activity counters the badge criteria are measured against (#1225). */
export type WalletBadgeMetrics = {
	keysBought: number;
	stakedKeys: number;
	liquidityPositions: number;
	governanceVotes: number;
	qualifiedReferrals: number;
	tradeVolumeXlm: number;
	tradeCount: number;
};

export type BadgeMetric = keyof WalletBadgeMetrics;

export type BadgeProgressCriteria = {
	metric: BadgeMetric;
	target: number;
	/** Unit shown next to progress values, e.g. "XLM" or "trades". */
	unit: string;
};

export const BADGE_PROGRESS_CRITERIA: Record<
	WalletBadgeType,
	BadgeProgressCriteria
> = {
	'first-key': { metric: 'keysBought', target: 1, unit: 'keys' },
	staker: { metric: 'stakedKeys', target: 1, unit: 'keys staked' },
	'liquidity-provider': {
		metric: 'liquidityPositions',
		target: 1,
		unit: 'positions',
	},
	'governance-voter': { metric: 'governanceVotes', target: 1, unit: 'votes' },
	referrer: { metric: 'qualifiedReferrals', target: 1, unit: 'referrals' },
	whale: { metric: 'tradeVolumeXlm', target: 10_000, unit: 'XLM' },
	'top-trader': { metric: 'tradeCount', target: 100, unit: 'trades' },
};

export type BadgeProgress = BadgeDefinition & {
	current: number;
	target: number;
	unit: string;
	/** Completion from 0 to 100. */
	percent: number;
};

/**
 * Measures each unearned badge against the wallet's activity metrics (#1225).
 * Missing or invalid metrics count as zero and progress is clamped to 0–100.
 * Earned badges keep the same ordering and dedupe rules as `splitBadges`.
 */
export function computeBadgeProgress(
	badges: readonly WalletBadge[],
	metrics: Partial<WalletBadgeMetrics> | null | undefined
): { earned: EarnedBadge[]; inProgress: BadgeProgress[] } {
	const { earned, locked } = splitBadges(badges);

	const inProgress = locked.map(definition => {
		const { metric, target, unit } = BADGE_PROGRESS_CRITERIA[definition.id];
		const raw = metrics?.[metric];
		const current =
			typeof raw === 'number' && Number.isFinite(raw) && raw > 0 ? raw : 0;
		const percent = Math.min(100, (current / target) * 100);
		return { ...definition, current, target, unit, percent };
	});

	return { earned, inProgress };
}
