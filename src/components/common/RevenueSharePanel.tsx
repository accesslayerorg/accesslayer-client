import { useMemo } from 'react';
import { format, isValid } from 'date-fns';
import { CheckCircle2, Coins, Wallet } from 'lucide-react';
import { AsyncButton } from '@/components/ui/async-button';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import {
	useClaimAllRevenueShareMutation,
	useClaimRevenueShareMutation,
	useRevenueShareDistributions,
} from '@/hooks/useRevenueShare';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import { formatRelativeTime } from '@/utils/time.utils';
import {
	selectUnclaimedDistributions,
	totalClaimableShare,
} from '@/utils/revenueShare.utils';

export interface RevenueSharePanelProps {
	/** Creator key whose distributions are listed. */
	keyId: string;
	/** Connected wallet that would receive the share. */
	wallet?: string;
	className?: string;
}

function formatClaimDate(timestamp: number | null | undefined): string {
	if (timestamp == null || !Number.isFinite(timestamp)) return '—';
	const date = new Date(timestamp);
	return isValid(date) ? format(date, 'MMM d, yyyy') : 'Date unavailable';
}

/**
 * Lets key holders claim their pro-rata share of creator revenue (#1223).
 *
 * Lists every revenue distribution the creator has made for the key with the
 * distributed total and the holder's own share. Unclaimed entries can be
 * claimed one at a time, or all at once; claimed entries show the amount that
 * was received and when it settled.
 */
export function RevenueSharePanel({
	keyId,
	wallet,
	className,
}: RevenueSharePanelProps) {
	const { distributions, isLoading, isError } = useRevenueShareDistributions(
		keyId,
		wallet
	);
	const claimMutation = useClaimRevenueShareMutation(keyId, wallet);
	const claimAllMutation = useClaimAllRevenueShareMutation(keyId, wallet);

	const unclaimed = useMemo(
		() => selectUnclaimedDistributions(distributions),
		[distributions]
	);
	const claimableTotal = useMemo(
		() => totalClaimableShare(distributions),
		[distributions]
	);

	const pendingDistributionId =
		claimMutation.isPending && typeof claimMutation.variables === 'string'
			? claimMutation.variables
			: null;

	const isClaimAllPending = claimAllMutation.isPending;

	return (
		<section
			className={cn(
				'rounded-4xl border border-white/10 bg-white/2 p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
			aria-labelledby="revenue-share-heading"
			data-testid="revenue-share-panel"
		>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div className="flex items-center gap-3">
					<span className="flex size-9 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-400">
						<Coins className="size-5" aria-hidden="true" />
					</span>
					<div>
						<h2
							id="revenue-share-heading"
							className="font-grotesque text-xl font-black tracking-tight text-white"
						>
							Revenue Share
						</h2>
						<p className="mt-0.5 text-sm text-white/55">
							Your pro-rata share of the revenue this creator distributes to key
							holders.
						</p>
					</div>
				</div>

				{wallet && unclaimed.length > 0 && (
					<AsyncButton
						type="button"
						isPending={isClaimAllPending}
						pendingText="Claiming…"
						disabled={claimableTotal <= 0}
						onClick={() => {
							claimAllMutation.mutate(unclaimed.map(entry => entry.id));
						}}
						className="rounded-xl bg-amber-400 px-4 py-2 font-bold text-slate-950 hover:bg-amber-300"
						data-testid="revenue-share-claim-all"
					>
						Claim all
					</AsyncButton>
				)}
			</div>

			{!wallet ? (
				<div
					className="mt-6 flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-white/10 p-8 text-center"
					data-testid="revenue-share-connect-wallet"
				>
					<Wallet className="size-6 text-white/40" aria-hidden="true" />
					<p className="font-semibold text-white/80">Connect your wallet</p>
					<p className="max-w-sm text-xs text-white/45">
						Your share of each distribution depends on the keys you hold, so
						connect a wallet to see what you can claim.
					</p>
				</div>
			) : (
				<>
					<div
						className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/[0.06] px-4 py-3"
						data-testid="revenue-share-summary"
					>
						<span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-amber-200/70">
							Available to claim
						</span>
						<span
							className="font-mono text-lg font-black text-amber-300"
							data-testid="revenue-share-claimable-total"
						>
							{formatXlmPrice(claimableTotal)}
						</span>
					</div>

					{isLoading ? (
						<div
							className="mt-4 space-y-2"
							data-testid="revenue-share-loading"
						>
							{Array.from({ length: 3 }, (_, index) => (
								<Skeleton key={index} className="h-16 w-full rounded-xl" />
							))}
						</div>
					) : isError ? (
						<div
							className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70"
							role="alert"
							data-testid="revenue-share-error"
						>
							Couldn&apos;t load revenue distributions.
						</div>
					) : distributions.length === 0 ? (
						<div
							className="mt-4 flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center"
							data-testid="revenue-share-empty"
						>
							<p className="font-semibold text-white/80">
								No distributions yet
							</p>
							<p className="mt-1 max-w-sm text-xs text-white/45">
								When the creator shares revenue with key holders, the amount and
								your share will appear here.
							</p>
						</div>
					) : (
						<ul
							className="mt-4 divide-y divide-white/[0.06]"
							data-testid="revenue-share-list"
						>
							{distributions.map(distribution => (
								<li
									key={distribution.id}
									className="flex flex-wrap items-center justify-between gap-3 py-4"
									data-testid={`revenue-share-row-${distribution.id}`}
								>
									<div className="min-w-0">
										<span
											className="block text-sm font-medium text-white/90"
											title={new Date(
												distribution.timestamp
											).toLocaleString()}
											data-testid={`revenue-share-date-${distribution.id}`}
										>
											{formatRelativeTime(distribution.timestamp)}
										</span>
										<span className="block font-mono text-xs text-white/45">
											{formatXlmPrice(distribution.amount)} distributed ·{' '}
											{distribution.holderCount} holder
											{distribution.holderCount === 1 ? '' : 's'}
										</span>
									</div>

									<div className="flex items-center gap-3">
										<span
											className="font-mono text-sm font-bold text-amber-300"
											data-testid={`revenue-share-share-${distribution.id}`}
										>
											{formatXlmPrice(distribution.userShare)}
										</span>

										{distribution.claimed ? (
											<span
												className="flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-2.5 py-1 text-xs font-semibold text-emerald-300"
												data-testid={`revenue-share-claimed-${distribution.id}`}
											>
												<CheckCircle2
													className="size-3.5"
													aria-hidden="true"
												/>
												Claimed{' '}
												<span
													className="font-mono"
													data-testid={`revenue-share-received-${distribution.id}`}
												>
													{formatXlmPrice(
														distribution.receivedAmount ??
															distribution.userShare
													)}
												</span>
												<span
													className="text-emerald-300/70"
													data-testid={`revenue-share-claimed-at-${distribution.id}`}
												>
													· {formatClaimDate(distribution.claimedAt)}
												</span>
											</span>
										) : (
											<Button
												type="button"
												disabled={
													claimMutation.isPending ||
													isClaimAllPending ||
													distribution.userShare <= 0
												}
												onClick={() =>
													claimMutation.mutate(distribution.id)
												}
												className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-950 transition-colors hover:bg-amber-300"
												data-testid={`revenue-share-claim-${distribution.id}`}
											>
												{pendingDistributionId === distribution.id
													? 'Claiming…'
													: 'Claim'}
											</Button>
										)}
									</div>
								</li>
							))}
						</ul>
					)}
				</>
			)}
		</section>
	);
}

export default RevenueSharePanel;
