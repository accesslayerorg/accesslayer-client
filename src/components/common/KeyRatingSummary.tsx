import { Star } from 'lucide-react';
import { formatNumber } from '@/utils/numberFormat.utils';
import type { KeyRatingSummary as KeyRatingSummaryData } from '@/types/keyRating';
import { cn } from '@/lib/utils';

interface KeyRatingSummaryProps {
	summary: KeyRatingSummaryData;
	isLoading?: boolean;
}

function StarRow({ rating }: { rating: number }) {
	const rounded = Math.round(rating);
	return (
		<div className="flex items-center gap-0.5" aria-hidden="true">
			{Array.from({ length: 5 }).map((_, index) => (
				<Star
					key={index}
					className={cn(
						'size-4',
						index < rounded ? 'fill-amber-400 text-amber-400' : 'text-white/20'
					)}
				/>
			))}
		</div>
	);
}

export default function KeyRatingSummary({
	summary,
	isLoading = false,
}: KeyRatingSummaryProps) {
	const maxCount = Math.max(1, ...Object.values(summary.distribution));

	return (
		<div
			className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
			data-testid="key-rating-summary"
		>
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start">
				<div className="shrink-0">
					<div className="flex items-end gap-2">
						<span
							className="font-grotesque text-4xl font-black tabular-nums text-white"
							data-testid="key-rating-average"
						>
							{isLoading
								? '—'
								: formatNumber(summary.averageRating, {
										minimumFractionDigits: 1,
										maximumFractionDigits: 1,
									})}
						</span>
						<span className="pb-1 text-sm text-white/50">/ 5</span>
					</div>
					<div className="mt-1">
						<StarRow rating={summary.averageRating} />
					</div>
					<p className="mt-2 text-xs text-white/50" data-testid="key-rating-total">
						{formatNumber(summary.totalRatings)}{' '}
						{summary.totalRatings === 1 ? 'review' : 'reviews'}
					</p>
				</div>

				<div className="flex-1 space-y-1.5" aria-label="Rating distribution">
					{([5, 4, 3, 2, 1] as const).map(star => {
						const count = summary.distribution[star] ?? 0;
						const width = (count / maxCount) * 100;
						return (
							<div
								key={star}
								className="flex items-center gap-2 text-xs"
								data-testid={`rating-distribution-row-${star}`}
							>
								<span className="w-8 shrink-0 text-right text-white/60">
									{star}★
								</span>
								<div className="h-2 flex-1 overflow-hidden rounded-full bg-white/10">
									<div
										className="h-full rounded-full bg-amber-400 transition-[width]"
										style={{ width: `${width}%` }}
										data-testid={`rating-distribution-bar-${star}`}
									/>
								</div>
								<span className="w-8 shrink-0 tabular-nums text-white/50">
									{formatNumber(count)}
								</span>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
