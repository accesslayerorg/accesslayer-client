import { useState } from 'react';
import {
	BarChart3,
	CalendarDays,
	TrendingUp,
	UserCheck,
} from 'lucide-react';
import { useKeyHolderLeaderboard } from '@/hooks/useKeyHolderLeaderboard';
import RankBadge from '@/components/common/RankBadge';
import CircularSpinner from '@/components/common/CircularSpinnerProps';
import { Button } from '@/components/ui/button';
import type {
	KeyHolderLeaderboardEntry,
	KeyHolderLeaderboardMetric,
} from '@/services/keyLeaderboard.service';
import { formatNumber } from '@/utils/numberFormat.utils';
import { truncateAddress } from '@/utils/whitelist.utils';
import { cn } from '@/lib/utils';

const INITIAL_LIMIT = 10;
const LOAD_MORE_STEP = 10;
const EXCLUDE_CONTRACTS_PARAM = 'excludeContracts';

const METRIC_TABS: Array<{
	id: KeyHolderLeaderboardMetric;
	label: string;
	icon: typeof BarChart3;
}> = [
	{ id: 'volume', label: 'Volume', icon: BarChart3 },
	{ id: 'pnl', label: 'PnL', icon: TrendingUp },
	{ id: 'holding_days', label: 'Holding Days', icon: CalendarDays },
];

function readExcludeContractsFromUrl(): boolean {
	if (typeof window === 'undefined') return false;
	const params = new URLSearchParams(window.location.search);
	return params.get(EXCLUDE_CONTRACTS_PARAM) === 'true';
}

function writeExcludeContractsToUrl(value: boolean) {
	if (typeof window === 'undefined') return;
	const url = new URL(window.location.href);
	if (value) {
		url.searchParams.set(EXCLUDE_CONTRACTS_PARAM, 'true');
	} else {
		url.searchParams.delete(EXCLUDE_CONTRACTS_PARAM);
	}
	window.history.replaceState(window.history.state, '', url.toString());
}

interface LeaderboardRowProps {
	entry: KeyHolderLeaderboardEntry;
	rank: number;
	isConnectedWallet: boolean;
	isPinned?: boolean;
}

function LeaderboardRow({
	entry,
	rank,
	isConnectedWallet,
	isPinned = false,
}: LeaderboardRowProps) {
	const isContract = Boolean(entry.isContract);

	return (
		<li
			className={cn(
				'flex items-center justify-between gap-4 border-b border-white/5 py-3 transition-colors',
				isConnectedWallet && 'bg-amber-400/10 border-amber-400/25',
				isPinned && 'border-t border-amber-400/30'
			)}
			data-testid={
				isPinned
					? 'pinned-wallet-row'
					: `leaderboard-row-${rank}`
			}
			data-connected-wallet={isConnectedWallet ? 'true' : undefined}
		>
			<div className="flex min-w-0 items-center gap-3">
				<RankBadge rank={rank} dataTestid={`leaderboard-rank-${rank}`} />
				<div className="min-w-0">
					<span
						className={cn(
							'font-mono text-sm font-medium',
							isConnectedWallet ? 'text-amber-300' : 'text-white'
						)}
						title={entry.wallet}
						data-testid="leaderboard-wallet"
					>
						{truncateAddress(entry.wallet, 6, 4)}
					</span>
					{isContract && (
						<span
							className="ml-2 inline-flex items-center rounded-full bg-sky-400/20 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-sky-300"
							data-testid="contract-badge"
							title="Smart contract holder"
						>
							Contract
						</span>
					)}
					{isConnectedWallet && (
						<span
							className="ml-2 inline-flex items-center gap-1 rounded-full bg-amber-400/20 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-amber-300"
							data-testid="connected-wallet-badge"
						>
							<UserCheck className="size-2.5" aria-hidden="true" />
							You
						</span>
					)}
				</div>
			</div>
			<span
				className={cn(
					'shrink-0 font-mono text-sm font-semibold tabular-nums',
					isConnectedWallet ? 'text-amber-300' : 'text-white/80'
				)}
				data-testid={`leaderboard-score-${rank}`}
			>
				{formatNumber(entry.score, { maximumFractionDigits: 2 })}
			</span>
		</li>
	);
}

interface KeyHolderLeaderboardProps {
	keyId: string;
	connectedWalletAddress?: string | null;
}

export default function KeyHolderLeaderboard({
	keyId,
	connectedWalletAddress,
}: KeyHolderLeaderboardProps) {
	const [metric, setMetric] = useState<KeyHolderLeaderboardMetric>('volume');
	const [visibleCount, setVisibleCount] = useState(INITIAL_LIMIT);
	const [excludeContracts, setExcludeContracts] = useState<boolean>(
		readExcludeContractsFromUrl
	);

	const { data, isLoading, isError, refetch } = useKeyHolderLeaderboard(
		keyId,
		metric
	);

	const allEntries = data ?? [];
	const entries = excludeContracts
		? allEntries.filter(entry => !entry.isContract)
		: allEntries;
	// Ranks are recomputed over the filtered list so they stay contiguous.
	const rankedEntries = entries.map((entry, index) => ({
		entry,
		rank: index + 1,
	}));
	const visibleEntries = rankedEntries.slice(0, visibleCount);
	const connectedWallet = connectedWalletAddress?.toLowerCase();
	const connectedIndex = connectedWallet
		? rankedEntries.findIndex(
				({ entry }) => entry.wallet.toLowerCase() === connectedWallet
			)
		: -1;
	const pinnedEntry =
		connectedIndex >= visibleCount ? rankedEntries[connectedIndex] : undefined;

	const handleMetricChange = (nextMetric: KeyHolderLeaderboardMetric) => {
		setMetric(nextMetric);
		setVisibleCount(INITIAL_LIMIT);
	};

	const handleExcludeContractsChange = (next: boolean) => {
		setExcludeContracts(next);
		setVisibleCount(INITIAL_LIMIT);
		writeExcludeContractsToUrl(next);
	};

	return (
		<div
			className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8"
			data-testid="key-holder-leaderboard"
		>
			<div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
				<div>
					<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
						Leaderboard
					</h2>
					<p className="mt-1 text-xs text-white/50">
						Top key holders ranked by {METRIC_TABS.find(tab => tab.id === metric)?.label.toLowerCase()}
					</p>
				</div>
				<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
					<label
						className="inline-flex cursor-pointer items-center gap-2 text-xs font-bold text-white/70"
						title="Contracts such as vaults and marketplaces hold keys on behalf of users."
					>
						<input
							type="checkbox"
							checked={excludeContracts}
							onChange={event =>
								handleExcludeContractsChange(event.target.checked)
							}
							data-testid="exclude-contracts-toggle"
							className="size-3.5 accent-amber-400"
						/>
						Exclude contracts
					</label>
					<div
						role="tablist"
						aria-label="Leaderboard metrics"
						className="inline-flex rounded-xl border border-white/10 bg-slate-900/60 p-1"
					>
						{METRIC_TABS.map(tab => {
							const Icon = tab.icon;
							const isSelected = tab.id === metric;
							return (
								<button
									key={tab.id}
									type="button"
									role="tab"
									aria-selected={isSelected}
									data-testid={`tab-${tab.id}`}
									onClick={() => handleMetricChange(tab.id)}
									className={cn(
										'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400',
										isSelected
											? 'bg-amber-400 text-slate-950'
											: 'text-white/60 hover:bg-white/5 hover:text-white'
									)}
								>
									<Icon className="size-3.5" aria-hidden="true" />
									{tab.label}
								</button>
							);
						})}
					</div>
				</div>
			</div>

			<div
				className="flex items-center justify-between border-b border-white/10 pb-2 text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white/40"
				aria-hidden="true"
			>
				<span>Holder</span>
				<span>Score</span>
			</div>

			{isError ? (
				<div className="py-12 text-center" data-testid="leaderboard-error">
					<p className="text-sm text-white/60">
						Unable to load the leaderboard.
					</p>
					<Button
						type="button"
						variant="outline"
						size="sm"
						className="mt-4 border-white/15 bg-white/5 text-white"
						onClick={() => void refetch()}
					>
						Try again
					</Button>
				</div>
			) : isLoading ? (
				<div
					className="flex justify-center py-12"
					data-testid="leaderboard-loading"
				>
					<CircularSpinner size={28} color="white" />
				</div>
			) : entries.length === 0 ? (
				<p className="py-12 text-center text-sm text-white/50" data-testid="leaderboard-empty">
					No leaderboard entries yet.
				</p>
			) : (
				<>
					<ol data-testid="leaderboard-list">
						{visibleEntries.map(({ entry, rank }) => (
							<LeaderboardRow
								key={entry.id}
								entry={entry}
								rank={rank}
								isConnectedWallet={
									Boolean(connectedWallet) &&
									entry.wallet.toLowerCase() === connectedWallet
								}
							/>
						))}
						{pinnedEntry && (
							<LeaderboardRow
								key={`pinned-${pinnedEntry.entry.id}`}
								entry={pinnedEntry.entry}
								rank={pinnedEntry.rank}
								isConnectedWallet
								isPinned
							/>
						)}
					</ol>

					{visibleCount < rankedEntries.length && (
						<Button
							type="button"
							variant="ghost"
							className="mt-4 w-full text-amber-300 hover:text-amber-200"
							data-testid="load-more-button"
							onClick={() =>
								setVisibleCount(current =>
									Math.min(current + LOAD_MORE_STEP, rankedEntries.length)
								)
							}
						>
							Load More
						</Button>
					)}
				</>
			)}
		</div>
	);
}
