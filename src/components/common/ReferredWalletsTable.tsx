import React from 'react';
import { ExternalLink } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import { formatAbsoluteDateTime } from '@/utils/time.utils';
import { buildStellarExpertAccountUrl } from '@/constants/stellar';
import { env } from '@/utils/env.utils';
import type { ReferredWallet } from '@/services/referral.service';
import { describeReferredWalletStatus } from '@/utils/referral.utils';

export interface ReferredWalletsTableProps {
	/** Referred wallets, flattened across every loaded page. */
	wallets: ReferredWallet[];
	/** Whether the first page is still loading. */
	isLoading?: boolean;
	/** Whether the list query failed. */
	isError?: boolean;
	/** Whether another page is being fetched. */
	isFetchingNextPage?: boolean;
	/** Whether another page exists. */
	hasNextPage?: boolean;
	/** Requests the next page. */
	onLoadMore?: () => void;
	className?: string;
}

const STATUS_BADGE_CLASS: Record<string, string> = {
	joined: 'border-white/10 bg-white/[0.06] text-white/60',
	traded: 'border-sky-400/30 bg-sky-400/15 text-sky-200',
	rewarded: 'border-emerald-400/30 bg-emerald-400/15 text-emerald-200',
};

function buildAccountExplorerUrl(address: string): string {
	return buildStellarExpertAccountUrl(address, env.VITE_STELLAR_NETWORK);
}

/**
 * Referred-wallet list for the referral dashboard (#963).
 *
 * One row per referred wallet with its join date, whether it has completed a
 * first trade, the reward that first trade earned, and its current referral
 * status. Pages are loaded on demand from the cursor-paginated API.
 */
export const ReferredWalletsTable: React.FC<ReferredWalletsTableProps> = ({
	wallets,
	isLoading = false,
	isError = false,
	isFetchingNextPage = false,
	hasNextPage = false,
	onLoadMore,
	className,
}) => {
	if (isLoading) {
		return (
			<section className={className} data-testid="referred-wallets-skeleton">
				<Skeleton className="h-6 w-48" />
				<div className="mt-6 space-y-2">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			</section>
		);
	}

	if (isError) {
		return (
			<section className={className} data-testid="referred-wallets-error">
				<p role="alert" className="text-sm text-amber-300">
					We couldn&apos;t load your referred wallets. Please refresh and
					try again.
				</p>
			</section>
		);
	}

	return (
		<section className={className} data-testid="referred-wallets-panel">
			<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
				Referred wallets
			</h2>

			{wallets.length === 0 ? (
				<p
					className="mt-2 text-sm text-white/55"
					data-testid="referred-wallets-empty"
				>
					No referred wallets yet. Share your referral link to get
					started.
				</p>
			) : (
				<>
					<div
						className="mt-4 overflow-x-auto"
						data-testid="referred-wallets-table"
					>
						<table className="w-full min-w-[40rem] text-left text-sm">
							<thead>
								<tr className="border-b border-white/10 text-[0.65rem] uppercase tracking-[0.18em] text-white/40">
									<th scope="col" className="py-2 pr-4 font-bold">
										Wallet
									</th>
									<th scope="col" className="py-2 pr-4 font-bold">
										Joined
									</th>
									<th scope="col" className="py-2 pr-4 font-bold">
										First trade
									</th>
									<th scope="col" className="py-2 pr-4 font-bold">
										Reward
									</th>
									<th scope="col" className="py-2 font-bold">
										Status
									</th>
								</tr>
							</thead>
							<tbody>
								{wallets.map(wallet => (
									<tr
										key={wallet.address}
										className="border-b border-white/5"
										data-testid="referred-wallet-row"
									>
										<td className="py-2 pr-4">
											<a
												href={buildAccountExplorerUrl(wallet.address)}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-1 font-mono text-xs text-white/70 hover:text-white"
												data-testid="referred-wallet-address"
											>
												{wallet.displayName || wallet.address}
												<ExternalLink
													className="size-3.5"
													aria-hidden="true"
												/>
											</a>
										</td>
										<td
											className="py-2 pr-4 text-xs text-white/60"
											title={
												formatAbsoluteDateTime(wallet.joinedAt) ??
												undefined
											}
											data-testid="referred-wallet-joined"
										>
											{formatAbsoluteDateTime(wallet.joinedAt) ?? '—'}
										</td>
										<td
											className="py-2 pr-4 text-xs text-white/60"
											data-testid="referred-wallet-first-trade"
										>
											{wallet.firstTradeAt ? 'Yes' : 'Not yet'}
										</td>
										<td
											className="py-2 pr-4 font-mono text-xs font-semibold text-emerald-400"
											data-testid="referred-wallet-reward"
										>
											{formatXlmPrice(wallet.rewardXlm ?? 0)}
										</td>
										<td className="py-2">
											<span
												className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${STATUS_BADGE_CLASS[wallet.status] ?? STATUS_BADGE_CLASS.joined}`}
												data-testid="referred-wallet-status"
											>
												{describeReferredWalletStatus(wallet)}
											</span>
										</td>
									</tr>
								))}
							</tbody>
						</table>
					</div>

					{hasNextPage && (
						<button
							type="button"
							onClick={onLoadMore}
							disabled={isFetchingNextPage}
							className="mt-4 text-sm font-semibold text-amber-300 hover:text-amber-200 disabled:opacity-50"
							data-testid="referred-wallets-load-more"
						>
							{isFetchingNextPage ? 'Loading…' : 'Load more'}
						</button>
					)}
				</>
			)}
		</section>
	);
};

export default ReferredWalletsTable;
