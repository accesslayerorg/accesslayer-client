import React from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import {
	formatPercent,
	formatXlmPrice,
} from '@/utils/numberFormat.utils';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';
import type { ProtocolTopKey } from '@/services/analytics.service';

export interface TopKeysVolumeTableProps {
	keys?: ProtocolTopKey[];
	isLoading?: boolean;
}

const skeletonBlockClass =
	'rounded-md bg-white/10 skeleton-shimmer motion-reduce:bg-white/15 motion-reduce:ring-1 motion-reduce:ring-white/15';

function SkeletonRow() {
	return (
		<tr>
			<td className="px-4 py-3.5">
				<div className={cn('h-4 w-5 ml-auto', skeletonBlockClass)} />
			</td>
			<td className="px-4 py-3.5">
				<div className="flex items-center gap-3">
					<div className={cn('size-8 shrink-0 rounded-full', skeletonBlockClass)} />
					<div className={cn('h-4 w-32', skeletonBlockClass)} />
				</div>
			</td>
			<td className="px-4 py-3.5">
				<div className={cn('h-4 w-16 ml-auto', skeletonBlockClass)} />
			</td>
			<td className="px-4 py-3.5">
				<div className={cn('h-4 w-12 ml-auto', skeletonBlockClass)} />
			</td>
			<td className="hidden px-4 py-3.5 md:table-cell">
				<div className={cn('h-4 w-16 ml-auto', skeletonBlockClass)} />
			</td>
		</tr>
	);
}

export const TopKeysVolumeTable: React.FC<TopKeysVolumeTableProps> = ({
	keys = [],
	isLoading = false,
}) => {
	return (
		<div
			className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 shadow-xl backdrop-blur-md"
			data-testid="top-keys-volume-table"
		>
			<div className="mb-6">
				<h3 className="font-grotesque text-xl font-black tracking-tight text-white">
					Top 10 Keys by Volume
				</h3>
				<p className="mt-1 text-xs text-white/50">
					Creator keys ranked by 24-hour trading volume
				</p>
			</div>

			{isLoading ? (
				<div
					className="overflow-hidden rounded-xl border border-white/10"
					role="status"
					aria-label="Loading top keys"
					data-testid="top-keys-table-skeleton"
				>
					<table className="w-full">
						<tbody>
							{Array.from({ length: 10 }).map((_, index) => (
								<SkeletonRow key={index} />
							))}
						</tbody>
					</table>
				</div>
			) : keys.length === 0 ? (
				<div
					className="flex h-40 items-center justify-center rounded-xl border border-dashed border-white/10 text-sm text-white/45"
					data-testid="top-keys-table-empty"
				>
					No key trading activity recorded yet
				</div>
			) : (
				<div className="overflow-hidden rounded-xl border border-white/10">
					<table
						className="w-full"
						aria-label="Top 10 creator keys by 24-hour volume"
					>
						<thead>
							<tr className="border-b border-white/10 bg-white/[0.03] text-[10px] font-semibold uppercase tracking-wider text-white/50">
								<th scope="col" className="px-4 py-2.5 text-right w-10">
									#
								</th>
								<th scope="col" className="px-4 py-2.5 text-left">
									Key
								</th>
								<th scope="col" className="px-4 py-2.5 text-right">
									24h Volume
								</th>
								<th scope="col" className="px-4 py-2.5 text-right">
									24h Change
								</th>
								<th
									scope="col"
									className="hidden px-4 py-2.5 text-right md:table-cell"
								>
									Cumulative Volume
								</th>
							</tr>
						</thead>
						<tbody>
							{keys.map((key, index) => {
								const changeColor =
									key.change24h > 0
										? 'text-emerald-400'
										: key.change24h < 0
											? 'text-rose-400'
											: 'text-white/50';
								const displayName =
									normalizeCreatorDisplayName(key.title) || 'Unnamed creator';

								return (
									<tr
										key={key.id}
										className="border-b border-white/5 last:border-b-0"
									>
										<td className="px-4 py-3 text-right font-mono text-xs tabular-nums text-white/50">
											{index + 1}
										</td>
										<td className="px-4 py-3">
											<Link
												to={`/creator/${key.id}`}
												className="flex min-w-0 items-center gap-3 transition-colors hover:text-emerald-300"
												aria-label={`${displayName} — rank ${index + 1}`}
											>
												<div className="size-8 shrink-0 overflow-hidden rounded-full bg-white/10">
													<CreatorInitialsAvatar
														name={displayName}
														creatorId={key.id}
														imageSrc={key.thumbnail}
													/>
												</div>
												<span className="min-w-0 truncate font-jakarta text-sm font-medium text-white">
													{displayName}
												</span>
											</Link>
										</td>
										<td className="px-4 py-3 text-right font-mono text-xs font-semibold tabular-nums text-white">
											{formatXlmPrice(key.volume24h)}
										</td>
										<td
											className={cn(
												'px-4 py-3 text-right font-mono text-xs tabular-nums',
												changeColor
											)}
											data-testid={`top-key-change-${index + 1}`}
										>
											{formatPercent(key.change24h, { signed: true })}
										</td>
										<td className="hidden px-4 py-3 text-right font-mono text-xs tabular-nums text-white/60 md:table-cell">
											{formatXlmPrice(key.cumulativeVolumeXlm)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				</div>
			)}
		</div>
	);
};

export default TopKeysVolumeTable;
