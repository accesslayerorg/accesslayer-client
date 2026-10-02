import React from 'react';
import { ExternalLink } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AsyncButton } from '@/components/ui/async-button';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import { formatAbsoluteDateTime } from '@/utils/time.utils';
import type { KeyBundle } from '@/services/bundle.service';
import { getBundleQuantityTotal } from '@/utils/bundle.utils';
import BundleTimeRemaining from '@/components/common/BundleTimeRemaining';

export interface ActiveBundlesListProps {
	/** Bundles that are currently purchasable. */
	bundles: KeyBundle[];
	/** Shared ticking clock, passed down to the expiry countdown. */
	nowMs: number;
	/** Whether the first page is loading. */
	isLoading?: boolean;
	/** Whether the list query failed. */
	isError?: boolean;
	/** Whether another page is being fetched. */
	isFetchingNextPage?: boolean;
	/** Whether another page exists. */
	hasNextPage?: boolean;
	/** Loads the next page of bundles. */
	onLoadMore?: () => void;
	/** ID of the bundle the creator is currently cancelling. */
	cancellingBundleId?: string;
	/** Called when the Cancel bundle button is clicked. */
	onCancelBundle?: (bundleId: string) => void;
	className?: string;
}

function buildBundleDetailUrl(creatorId: string, bundleId: string): string {
	const path = `/creator/${creatorId}/bundle/${bundleId}`;
	return `${window.location.origin}${path}`;
}

/**
 * List of active bundles with purchase count and time remaining.
 *
 * Shows the per-bundle totals, the discounted price, expiry countdown, and a
 * cancel action that is only enabled while the bundle is live and not already
 * being cancelled.
 */
export const ActiveBundlesList: React.FC<ActiveBundlesListProps> = ({
	bundles,
	nowMs,
	isLoading = false,
	isError = false,
	isFetchingNextPage = false,
	hasNextPage = false,
	onLoadMore,
	cancellingBundleId,
	onCancelBundle,
	className,
}) => {
	if (isLoading) {
		return (
			<section className={className} data-testid="active-bundles-skeleton">
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
			<section className={className} data-testid="active-bundles-error">
				<p role="alert" className="text-sm text-amber-300">
					We couldn&apos;t load your bundles. Please refresh and try again.
				</p>
			</section>
		);
	}

	return (
		<section className={className} data-testid="active-bundles-list">
			<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
				Active bundles
			</h2>

			{bundles.length === 0 ? (
				<p
					className="mt-2 text-sm text-white/55"
					data-testid="active-bundles-empty"
				>
					No active bundles yet. Create one below to offer a discounted bundle.
				</p>
			) : (
				<>
					<div
						className="mt-4 overflow-x-auto"
						data-testid="active-bundles-table"
					>
						<table className="w-full min-w-[48rem] text-left text-sm">
							<thead>
								<tr className="border-b border-white/10 text-[0.65rem] uppercase tracking-[0.18em] text-white/40">
									<th scope="col" className="py-2 pr-4 font-bold">
										Bundle
									</th>
									<th scope="col" className="py-2 pr-4 font-bold">
										Keys
									</th>
									<th scope="col" className="py-2 pr-4 font-bold">
										List price
									</th>
									<th scope="col" className="py-2 pr-4 font-bold">
										Discount price
									</th>
									<th scope="col" className="py-2 pr-4 font-bold">
										Purchases
									</th>
									<th scope="col" className="py-2 pr-4 font-bold">
										Expires at
									</th>
									<th scope="col" className="py-2 pr-4 font-bold">
										Time remaining
									</th>
									<th scope="col" className="py-2 font-bold text-right">
										Actions
									</th>
								</tr>
							</thead>
							<tbody>
								{bundles.map(bundle => {
									const isCancelling = cancellingBundleId === bundle.id;
									return (
										<tr
											key={bundle.id}
											className="border-b border-white/5"
											data-testid="active-bundle-row"
										>
											<td className="py-2 pr-4">
												<a
													href={buildBundleDetailUrl(
														bundle.creatorId,
														bundle.id
													)}
													target="_blank"
													rel="noopener noreferrer"
													className="inline-flex items-center gap-1 text-xs text-white/80 hover:text-white"
													data-testid="active-bundle-id"
												>
													{bundle.id}
													<ExternalLink
														className="size-3.5"
														aria-hidden="true"
													/>
												</a>
											</td>
											<td
												className="py-2 pr-4 text-xs text-white/70"
												data-testid="active-bundle-keys"
											>
												{getBundleQuantityTotal(bundle.items)}
											</td>
											<td
												className="py-2 pr-4 font-mono text-xs text-white/60"
												data-testid="active-bundle-list-price"
											>
												{formatXlmPrice(bundle.listPriceXlm)}
											</td>
											<td
												className="py-2 pr-4 font-mono text-xs font-semibold text-emerald-400"
												data-testid="active-bundle-discount-price"
											>
												{formatXlmPrice(bundle.discountPriceXlm)}
											</td>
											<td
												className="py-2 pr-4 text-xs text-white/70"
												data-testid="active-bundle-purchases"
											>
												{bundle.purchaseCount}
											</td>
											<td
												className="py-2 pr-4 text-xs text-white/60"
												title={
													formatAbsoluteDateTime(bundle.expiresAt) ??
													undefined
												}
												data-testid="active-bundle-expires"
											>
												{formatAbsoluteDateTime(bundle.expiresAt) ?? '—'}
											</td>
											<td className="py-2 pr-4">
												<BundleTimeRemaining
													expiresAt={bundle.expiresAt}
													nowMs={nowMs}
												/>
											</td>
											<td className="py-2">
												<div className="flex justify-end">
													<AsyncButton
														type="button"
														variant="destructive"
														size="sm"
														isPending={isCancelling}
														onClick={() =>
															onCancelBundle?.(bundle.id)
														}
														disabled={isCancelling}
														data-testid="active-bundle-cancel"
													>
														Cancel bundle
													</AsyncButton>
												</div>
											</td>
										</tr>
									);
								})}
							</tbody>
						</table>
					</div>

					{hasNextPage && (
						<Button
							type="button"
							variant="ghost"
							onClick={onLoadMore}
							disabled={isFetchingNextPage}
							className="mt-4 text-sm font-semibold text-amber-300 hover:text-amber-200 disabled:opacity-50"
							data-testid="active-bundles-load-more"
						>
							{isFetchingNextPage ? 'Loading…' : 'Load more'}
						</Button>
					)}
				</>
			)}
		</section>
	);
};

export default ActiveBundlesList;
