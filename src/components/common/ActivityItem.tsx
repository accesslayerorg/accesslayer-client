// src/components/common/ActivityItem.tsx
import { ExternalLink } from 'lucide-react';
import {
	ArrowUpRight,
	ArrowDownRight,
	Coins,
	TrendingDown,
	Gift,
	Vote,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatRelativeTime } from '@/utils/time.utils';
import { buildStellarExpertTxUrl, truncateTxHash } from '@/constants/stellar';
import { env } from '@/utils/env.utils';
import type { WalletActivityTrade, WalletActivityEventType } from '@/services/walletActivity.service';

// ─── Icon + colour config per event type ──────────────────────────────────────

interface EventConfig {
	icon: React.ReactNode;
	iconBg: string;
	accentBorder: string;
	label: string;
}

function getEventConfig(type: WalletActivityEventType): EventConfig {
	switch (type) {
		case 'buy':
			return {
				icon: <ArrowUpRight className="size-4 text-emerald-400" aria-hidden="true" />,
				iconBg: 'bg-emerald-500/10',
				accentBorder: 'border-l-emerald-500',
				label: 'Buy',
			};
		case 'sell':
			return {
				icon: <ArrowDownRight className="size-4 text-rose-400" aria-hidden="true" />,
				iconBg: 'bg-rose-500/10',
				accentBorder: 'border-l-rose-500',
				label: 'Sell',
			};
		case 'stake':
			return {
				icon: <Coins className="size-4 text-amber-400" aria-hidden="true" />,
				iconBg: 'bg-amber-500/10',
				accentBorder: 'border-l-amber-500',
				label: 'Stake',
			};
		case 'unstake':
			return {
				icon: <TrendingDown className="size-4 text-orange-400" aria-hidden="true" />,
				iconBg: 'bg-orange-500/10',
				accentBorder: 'border-l-orange-500',
				label: 'Unstake',
			};
		case 'claim':
			return {
				icon: <Gift className="size-4 text-violet-400" aria-hidden="true" />,
				iconBg: 'bg-violet-500/10',
				accentBorder: 'border-l-violet-500',
				label: 'Claim Reward',
			};
		case 'governance_vote':
			return {
				icon: <Vote className="size-4 text-sky-400" aria-hidden="true" />,
				iconBg: 'bg-sky-500/10',
				accentBorder: 'border-l-sky-500',
				label: 'Governance Vote',
			};
	}
}

// ─── Detail line ──────────────────────────────────────────────────────────────

function buildDetailParts(entry: WalletActivityTrade): string[] {
	const parts: string[] = [];

	switch (entry.type) {
		case 'buy':
		case 'sell':
			if (entry.amount != null) parts.push(`${entry.amount} key${entry.amount !== 1 ? 's' : ''}`);
			if (entry.price != null) parts.push(`${entry.price.toFixed(4)} XLM / key`);
			break;
		case 'stake':
		case 'unstake':
			if (entry.amount != null) parts.push(`${entry.amount} key${entry.amount !== 1 ? 's' : ''}`);
			break;
		case 'claim':
			if (entry.price != null) parts.push(`${entry.price.toFixed(4)} XLM`);
			break;
		case 'governance_vote':
			if (entry.proposalId) parts.push(`Proposal ${entry.proposalId}`);
			if (entry.voteChoice) {
				const choiceLabel =
					entry.voteChoice === 'for'
						? '✓ For'
						: entry.voteChoice === 'against'
						? '✗ Against'
						: '— Abstain';
				parts.push(choiceLabel);
			}
			break;
	}

	return parts;
}

// ─── Explorer link ────────────────────────────────────────────────────────────

function ExplorerLink({ txHash }: { txHash: string }) {
	const url = buildStellarExpertTxUrl(txHash, env.VITE_STELLAR_NETWORK);
	const display = truncateTxHash(txHash);

	return (
		<a
			href={url}
			target="_blank"
			rel="noopener noreferrer"
			aria-label={`View transaction ${display} on Stellar Expert`}
			data-testid="activity-item-explorer-link"
			className="inline-flex items-center gap-1 font-mono text-[10px] text-white/40 transition-colors hover:text-amber-400"
		>
			{display}
			<ExternalLink className="size-3" aria-hidden="true" />
		</a>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export interface ActivityItemProps {
	entry: WalletActivityTrade;
	className?: string;
}

/**
 * Single row in the wallet activity feed.
 *
 * Displays:
 *   - Event-type icon with matching colour
 *   - Key / creator name
 *   - Event label pill
 *   - Amount / price / proposal details per event type
 *   - Relative timestamp
 *   - Truncated tx hash linking to Stellar Expert
 */
const ActivityItem: React.FC<ActivityItemProps> = ({ entry, className }) => {
	const config = getEventConfig(entry.type);
	const details = buildDetailParts(entry);

	return (
		<div
			data-testid={`activity-item-${entry.id}`}
			className={cn(
				'flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 pl-5 transition-colors hover:border-white/20 hover:bg-white/[0.04] sm:flex-row sm:items-center sm:justify-between',
				'border-l-4',
				config.accentBorder,
				className
			)}
		>
			{/* Icon + name */}
			<div className="flex min-w-0 flex-1 items-center gap-3">
				<div
					className={cn(
						'flex size-9 shrink-0 items-center justify-center rounded-full',
						config.iconBg
					)}
					aria-hidden="true"
				>
					{config.icon}
				</div>
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
						<span className="text-sm font-semibold text-white">
							{entry.creatorHandle}
						</span>
						<span
							className={cn(
								'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
								config.iconBg,
								// text colour matches icon colour via class
								entry.type === 'buy' && 'text-emerald-400',
								entry.type === 'sell' && 'text-rose-400',
								entry.type === 'stake' && 'text-amber-400',
								entry.type === 'unstake' && 'text-orange-400',
								entry.type === 'claim' && 'text-violet-400',
								entry.type === 'governance_vote' && 'text-sky-400'
							)}
						>
							{config.label}
						</span>
					</div>
					{details.length > 0 && (
						<div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-white/50">
							{details.map((part, i) => (
								<span key={i} className="flex items-center gap-1.5">
									{i > 0 && <span className="text-white/20">•</span>}
									{part}
								</span>
							))}
						</div>
					)}
				</div>
			</div>

			{/* Timestamp + explorer link */}
			<div className="flex shrink-0 flex-col items-end gap-1 sm:text-right">
				<span
					className="text-xs text-white/50"
					title={new Date(entry.timestamp).toLocaleString()}
				>
					{formatRelativeTime(entry.timestamp)}
				</span>
				<ExplorerLink txHash={entry.txHash} />
			</div>
		</div>
	);
};

export default ActivityItem;
