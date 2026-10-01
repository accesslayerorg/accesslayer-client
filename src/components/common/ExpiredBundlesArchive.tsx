import React from 'react';
import { ExternalLink } from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import { formatAbsoluteDateTime } from '@/utils/time.utils';
import type { KeyBundle } from '@/services/bundle.service';
import {
	describeBundleEndReason,
	getBundleQuantityTotal,
} from '@/utils/bundle.utils';

export interface ExpiredBundlesArchiveProps {
	/** Bundles that have expired or been cancelled. */
	bundles: KeyBundle[];
	/** Shared ticking clock to ensure the end reason is up to date. */
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
	className?: string;
}

function buildBundleDetailUrl(creatorId: string, bundleId: string): string {
	const path = `/creator/${creatorId}/bundle/${bundleId}`;
	return `${window.location.origin}${path}`;
}

/**
 * Archive of expired and cancelled bundles.
 *
 * Sorted so the most recently ended bundles surface at the top. The end reason
 * is derived from status so cancelled bundles are labelled explicitly rather
 * than being shown as "expired".
 */
export const ExpiredBundlesArchive: React.FC<ExpiredBundlesArchiveProps> = ({
	bundles,
	nowMs,
	isLoading = false,
	isError = false,
	isFetchingNextPage = false,
	hasNextPage = false,
	onLoadMore,
	className,
}) => {
	if (isLoading) {
		return (
			<section className={className} data-testid="expired-bundles-skeleton">
				<Skeleton className="h-6 w-48" />
				<div className="mt-6 space-y-2">
					<Skeleton className="h-12 w-full" />
					<Skeleton className="h-12 w-full" />
				</div>
			</section>
		);
	}

	if (isError) {
		return (
			<section className={className} data-testid="expired-bundles-error">
				<p role="alert" className="text-sm text-amber-300">
					We couldn&apos;t load your archived bundles. Please refresh and try
					again.
				</p>
			</section>
		);
	}

	if (bundles.length === 0) {
		return (
			<section className={className} data-testid="expired-bundles-empty">
				<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
					Expired bundles
				</h2>
				<p className="mt-2 text-sm text-white/55">
					Expired or cancelled bundles will appear here automatically.
				</p>
			</section>
		);
	}

	return (
		<section className={className} data-testid="expired-bundles-archive">
			<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
				Expired bundles
			</h2>

			<div
				className="mt-4 overflow-x-auto"
				data-testid="expired-bundles-table"
			>
				<table className="w-full min-w-[44rem] text-left text-sm">
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
								Ended at
							</th>
							<th scope="col" className="py-2 font-bold">
								End reason
							</th>
						</tr>
					</thead>
					<tbody>
						{bundles.map(bundle => (
							<tr
								key={bundle.id}
								className="border-b border-white/5"
								data-testid="expired-bundle-row"
							>
								<td className="py-2 pr-4">
									<a
										href={buildBundleDetailUrl(bundle.creatorId, bundle.id)}
										target="_blank"
										rel="noopener noreferrer"
										className="inline-flex items-center gap-1 text-xs text-white/70 hover:text-white"
										data-testid="expired-bundle-id"
									>
										{bundle.id}
										<ExternalLink className="size-3.5" aria-hidden="true" />
									</a>
								</td>
								<td
									className="py-2 pr-4 text-xs text-white/60"
									data-testid="expired-bundle-keys"
								>
									{getBundleQuantityTotal(bundle.items)}
								</td>
								<td
									className="py-2 pr-4 font-mono text-xs text-white/60"
									data-testid="expired-bundle-list-price"
								>
									{formatXlmPrice(bundle.listPriceXlm)}
								</td>
								<td
									className="py-2 pr-4 font-mono text-xs text-white/60"
									data-testid="expired-bundle-discount-price"
								>
									{formatXlmPrice(bundle.discountPriceXlm)}
								</td>
								<td
									className="py-2 pr-4 text-xs text-white/60"
									data-testid="expired-bundle-purchases"
								>
									{bundle.purchaseCount}
								</td>
								<td
									className="py-2 pr-4 text-xs text-white/60"
									title={formatAbsoluteDateTime(bundle.expiresAt) ?? undefined}
									data-testid="expired-bundle-ended"
								>
									{formatAbsoluteDateTime(bundle.expiresAt) ?? '—'}
								</td>
								<td className="py-2">
									<span
										className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.06] px-2 py-0.5 text-xs font-medium text-white/70"
										data-testid="expired-bundle-end-reason"
									>
										{describeBundleEndReason(bundle, nowMs)}
									</span>
								</td>
							</tr>
						))}
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
					data-testid="expired-bundles-load-more"
				>
					{isFetchingNextPage ? 'Loading…' : 'Load more'}
				</Button>
			)}
		</section>
	);
};

export default ExpiredBundlesArchive;
