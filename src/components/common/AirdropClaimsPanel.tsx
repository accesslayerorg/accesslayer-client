import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import EmptyState from '@/components/common/EmptyState';
import Skeleton from '@/components/ui/skeleton';
import {
	useAirdropAllocations,
	useAirdropClaimHistory,
	useClaimAirdropMutation,
	useClaimAllAirdropsMutation,
} from '@/hooks/useAirdropClaims';
import {
	computeTotalAllocation,
	getClaimedAirdropIds,
	getUnclaimedAirdrops,
	groupAirdropsByKey,
} from '@/utils/airdropClaim.utils';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import { formatRelativeTime } from '@/utils/time.utils';
import {
	buildStellarExpertTxUrl,
	truncateTxHash,
} from '@/constants/stellar';
import { env } from '@/utils/env.utils';

export interface AirdropClaimsPanelProps {
	walletAddress: string;
}

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

function formatSnapshotDate(dateInput: string): string {
	const date = new Date(dateInput);
	if (Number.isNaN(date.getTime())) return dateInput;
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'short',
		day: 'numeric',
		timeZone: 'UTC',
	});
}

/**
 * Airdrop claims interface for key holders.
 *
 * Lists every unclaimed airdrop grouped by held key (snapshot date, total
 * distributed, user allocation), supports claiming one at a time or all
 * in a sequenced Claim All flow, and shows a persisted claim history with
 * received amounts and claim dates.
 */
const AirdropClaimsPanel: React.FC<AirdropClaimsPanelProps> = ({
	walletAddress,
}) => {
	const { data: allocations, isLoading, isError } =
		useAirdropAllocations(walletAddress);
	const { history, appendHistory } = useAirdropClaimHistory(walletAddress);
	const claimOneMutation = useClaimAirdropMutation(walletAddress, {
		onAppended: appendHistory,
	});
	const claimAllMutation = useClaimAllAirdropsMutation(walletAddress, {
		onAppended: appendHistory,
	});

	const allAirdrops = allocations ?? [];
	const claimedIds = getClaimedAirdropIds(history);
	const unclaimed = getUnclaimedAirdrops(allAirdrops, history);
	const groups = groupAirdropsByKey(allAirdrops);
	const totalUnclaimed = computeTotalAllocation(unclaimed);

	const isClaiming = claimOneMutation.isPending || claimAllMutation.isPending;
	const canClaimAll = unclaimed.length > 0 && !isClaiming;

	const handleClaimOne = (airdropId: string) => {
		if (claimOneMutation.isPending) return;
		const airdrop = unclaimed.find(entry => entry.id === airdropId);
		if (!airdrop || airdrop.userAllocation <= 0) return;
		claimAllMutation.reset?.();
		claimOneMutation.mutate(airdrop);
	};

	const handleClaimAll = () => {
		if (!canClaimAll) return;
		claimOneMutation.reset?.();
		claimAllMutation.mutate({ airdrops: unclaimed });
	};

	if (isLoading) {
		return (
			<section
				className={CARD_CLASS}
				data-testid="airdrop-claims-skeleton"
				aria-busy="true"
			>
				<Skeleton className="h-6 w-48" />
				<div className="mt-6 space-y-2">
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
					<Skeleton className="h-16 w-full" />
				</div>
			</section>
		);
	}

	if (isError) {
		return (
			<section className={CARD_CLASS} data-testid="airdrop-claims-panel">
				<EmptyState
					title="Couldn't load airdrops"
					description="There was a problem fetching your airdrop allocations. Please try again shortly."
				/>
			</section>
		);
	}

	return (
		<section className={CARD_CLASS} data-testid="airdrop-claims-panel">
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div>
					<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
						Airdrops
					</h2>
					<p className="mt-1 text-sm text-white/60">
						Unclaimed allocation:{' '}
						<span
							className="font-mono font-bold text-white"
							data-testid="airdrop-total-unclaimed"
						>
							{formatXlmPrice(totalUnclaimed)}
						</span>
					</p>
				</div>
				<Button
					onClick={handleClaimAll}
					disabled={!canClaimAll}
					data-testid="airdrop-claim-all"
				>
					{claimAllMutation.isPending ? 'Claiming…' : 'Claim all'}
				</Button>
			</div>

			{allAirdrops.length === 0 ? (
				<EmptyState
					title="No airdrops available"
					description="Airdrops for the keys you hold will appear here once a snapshot is taken."
				/>
			) : unclaimed.length === 0 ? (
				<EmptyState
					title="No unclaimed airdrops"
					description="You've claimed every airdrop allocated to your keys. Past claims are listed in your history below."
				/>
			) : (
				<div className="space-y-6" data-testid="airdrop-group-list">
					{groups.map(group => {
						const groupUnclaimed = group.airdrops.filter(
							airdrop => !claimedIds.has(airdrop.id)
						);
						const groupClaimed = group.airdrops.filter(airdrop =>
							claimedIds.has(airdrop.id)
						);
						return (
							<div
								key={group.keyId}
								className="rounded-2xl border border-white/10 bg-white/[0.03] p-4"
								data-testid="airdrop-key-group"
							>
								<div className="mb-3 flex items-center justify-between gap-2">
									<h3
										className="truncate text-sm font-bold text-white"
										data-testid="airdrop-key-name"
									>
										{group.keyName || group.keyId}
									</h3>
									{!group.keyName && (
										<span className="font-mono text-xs text-white/50">
											{group.keyId}
										</span>
									)}
								</div>
								<div className="space-y-2">
									{group.airdrops.map(airdrop => {
										const isClaimed = claimedIds.has(airdrop.id);
										const claimRecord = history.find(
											record => record.id === airdrop.id
										);
										return (
											<div
												key={airdrop.id}
												className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
												data-testid="airdrop-row"
											>
												<div className="min-w-0 flex-1 space-y-1">
													<p
														className="text-xs text-white/60"
														data-testid="airdrop-snapshot-date"
													>
														Snapshot:{' '}
														{formatSnapshotDate(airdrop.snapshotDate)}
													</p>
													<p
														className="font-mono text-xs text-white/70"
														data-testid="airdrop-total-distributed"
													>
														{formatXlmPrice(airdrop.totalDistributed)}{' '}
														total distributed
													</p>
													<p
														className="font-mono text-sm font-semibold text-white"
														data-testid="airdrop-user-allocation"
													>
														{formatXlmPrice(airdrop.userAllocation)}{' '}
														allocated
													</p>
												</div>
												{isClaimed ? (
													<div
														className="flex flex-col items-start gap-1 sm:items-end"
														data-testid="airdrop-claimed-chip"
													>
														<span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-400">
															Claimed
														</span>
														{claimRecord && (
															<span
																className="font-mono text-xs text-white/60"
																data-testid="airdrop-claimed-amount"
															>
																+
																{formatXlmPrice(claimRecord.amount)}
															</span>
														)}
													</div>
												) : (
													<Button
														size="sm"
														variant="outline"
														className="rounded-xl"
														disabled={isClaiming}
														onClick={() => handleClaimOne(airdrop.id)}
														data-testid="airdrop-claim-one"
													>
														{claimOneMutation.isPending &&
														claimOneMutation.variables?.id === airdrop.id
															? 'Claiming…'
															: 'Claim'}
													</Button>
												)}
											</div>
										);
									})}
									{groupUnclaimed.length === 0 &&
										groupClaimed.length > 0 && (
											<p
												className="text-xs text-white/45"
												data-testid="airdrop-group-fully-claimed"
											>
												All airdrops for this key have been claimed.
											</p>
										)}
								</div>
							</div>
						);
					})}
				</div>
			)}

			<div className="mt-8">
				<h3 className="font-grotesque text-lg font-bold text-white">
					Claim history
				</h3>
				{history.length === 0 ? (
					<p
						className="mt-2 text-sm text-white/55"
						data-testid="airdrop-history-empty"
					>
						No claims yet. Claimed airdrops will appear here with the
						amount received and claim date.
					</p>
				) : (
					<div
						className="mt-4 space-y-2"
						data-testid="airdrop-claim-history"
					>
						{history.map(record => (
							<div
								key={record.id}
								className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-4 sm:flex-row sm:items-center sm:justify-between"
								data-testid="airdrop-history-row"
							>
								<div className="min-w-0">
									<p className="truncate text-xs font-bold text-white/80">
										{record.keyName || record.keyId}
									</p>
									<div className="mt-1 flex items-center gap-4 text-xs text-white/60">
										<span
											className="font-mono text-white/80"
											title={new Date(record.timestamp).toLocaleString()}
											data-testid="airdrop-history-date"
										>
											{formatRelativeTime(record.timestamp)}
										</span>
										<span
											className="font-mono font-semibold text-emerald-400"
											data-testid="airdrop-history-amount"
										>
											+{record.amount.toFixed(4)} XLM
										</span>
									</div>
								</div>
								<a
									href={buildStellarExpertTxUrl(
										record.transactionHash,
										env.VITE_STELLAR_NETWORK
									)}
									target="_blank"
									rel="noopener noreferrer"
									className="inline-flex items-center gap-1 font-mono text-xs text-white/60 hover:text-white"
									data-testid="airdrop-history-tx"
								>
									{truncateTxHash(record.transactionHash)}
									<ExternalLink className="size-3.5" aria-hidden="true" />
								</a>
							</div>
						))}
					</div>
				)}
			</div>
		</section>
	);
};

export default AirdropClaimsPanel;
