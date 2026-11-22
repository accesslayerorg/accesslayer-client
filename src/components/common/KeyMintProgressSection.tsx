import React from 'react';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import Skeleton from '@/components/ui/skeleton';
import MiniStatChip from '@/components/common/MiniStatChip';
import { formatNumber } from '@/utils/numberFormat.utils';
import { calculateMintProgress } from '@/utils/mintProgress.utils';
import { ERROR_CODE_TO_COPY } from '@/utils/errorHandling.utils';

export interface KeyMintProgressSectionProps {
	/** Current minted key supply. */
	currentSupply?: number | null;
	/** Configured max supply cap. Uncapped if null, undefined, or <= 0. */
	maxSupply?: number | null;
	/** Loading state for key data. */
	isLoading?: boolean;
	/** Callback invoked when the user clicks the Buy button. */
	onBuy?: () => void;
	/** Whether a buy transaction is currently submitting. */
	isSubmitting?: boolean;
	className?: string;
}

const KeyMintProgressSection: React.FC<KeyMintProgressSectionProps> = ({
	currentSupply,
	maxSupply,
	isLoading = false,
	onBuy,
	isSubmitting = false,
	className,
}) => {
	if (isLoading) {
		return (
			<div
				className={cn(
					'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8 space-y-4',
					className
				)}
				data-testid="key-mint-progress-skeleton"
				aria-busy="true"
				aria-label="Loading mint progress"
			>
				<div className="flex items-center justify-between">
					<Skeleton className="h-6 w-36" />
					<Skeleton className="h-6 w-24 rounded-full" />
				</div>
				<Skeleton className="h-3 w-full rounded-full" />
				<div className="flex justify-end">
					<Skeleton className="h-10 w-28 rounded-xl" />
				</div>
			</div>
		);
	}

	const progress = calculateMintProgress(currentSupply, maxSupply);

	// If the key has no max supply configured, hide the progress bar and chip entirely
	if (!progress.isCapped) {
		return (
			<div
				className={cn(
					'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4',
					className
				)}
				data-testid="key-mint-progress-section"
			>
				<div>
					<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
						Key Supply
					</h2>
					<p className="mt-1 text-sm text-white/55">
						Uncapped supply &bull; {formatNumber(progress.currentSupply)} keys minted
					</p>
				</div>
				<Button
					type="button"
					onClick={onBuy}
					disabled={isSubmitting}
					aria-disabled={isSubmitting}
					data-testid="buy-key-button"
					className="rounded-xl font-bold bg-amber-400 text-slate-950 hover:bg-amber-300 active:scale-95 px-6 py-2.5 transition-all"
				>
					<ShoppingCart className="mr-2 size-4" aria-hidden="true" />
					Buy Key
				</Button>
			</div>
		);
	}

	const maxSupplyFormatted = formatNumber(progress.maxSupply);
	const currentSupplyFormatted = formatNumber(progress.currentSupply);
	const remainingFormatted = formatNumber(progress.remaining);

	return (
		<div
			className={cn(
				'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8 space-y-5',
				className
			)}
			data-testid="key-mint-progress-section"
		>
			{/* Header with Title and Remaining Mintable Chip */}
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
						Mint Progress
					</h2>
					<p className="text-xs text-white/55 mt-0.5">
						Supply cap: {maxSupplyFormatted} keys
					</p>
				</div>
				<div data-testid="remaining-mintable-chip">
					<MiniStatChip
						label="Remaining"
						value={`${remainingFormatted} keys`}
						explanation="Number of keys remaining before reaching the maximum supply cap."
					/>
				</div>
			</div>

			{/* Progress Bar & Percentage Label */}
			<div className="space-y-2">
				<div className="flex items-center justify-between text-xs font-semibold text-white/70">
					<span>
						{currentSupplyFormatted} / {maxSupplyFormatted} minted
					</span>
					<span
						data-testid="mint-progress-percentage"
						className="font-bold text-amber-400"
					>
						{progress.percentageLabel}
					</span>
				</div>

				<div
					role="progressbar"
					aria-valuenow={progress.currentSupply}
					aria-valuemin={0}
					aria-valuemax={progress.maxSupply ?? undefined}
					aria-label="Key mint progress"
					aria-valuetext={`${progress.percentageLabel} minted (${currentSupplyFormatted} of ${maxSupplyFormatted} keys)`}
					className="relative h-3 w-full overflow-hidden rounded-full bg-white/10"
					data-testid="mint-progress-bar"
				>
					<div
						className={cn(
							'h-full rounded-full transition-all duration-300',
							progress.isAtCap
								? 'bg-amber-400'
								: 'bg-gradient-to-r from-amber-500 to-amber-300'
						)}
						style={{ width: `${progress.percentage}%` }}
						data-testid="mint-progress-fill"
					/>
				</div>
			</div>

			{/* Action & Cap Warning Row */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-1">
				{progress.isAtCap ? (
					<div
						id="max-supply-reached-message"
						role="status"
						aria-live="polite"
						data-testid="max-supply-message"
						className="flex items-center gap-2 text-xs font-medium text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3.5 py-2.5"
					>
						<AlertCircle className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
						<span>{ERROR_CODE_TO_COPY.MaxSupplyReached}</span>
					</div>
				) : (
					<div className="text-xs text-white/45">
						Keys are minted on-demand via the bonding curve until the cap is reached.
					</div>
				)}

				<Button
					type="button"
					onClick={onBuy}
					disabled={progress.isAtCap || isSubmitting}
					aria-disabled={progress.isAtCap || isSubmitting}
					aria-describedby={progress.isAtCap ? 'max-supply-reached-message' : undefined}
					data-testid="buy-key-button"
					className={cn(
						'rounded-xl font-bold px-6 py-2.5 transition-all shrink-0',
						progress.isAtCap
							? 'opacity-60 cursor-not-allowed bg-white/10 text-white/40 border border-white/10'
							: 'bg-amber-400 text-slate-950 hover:bg-amber-300 active:scale-95'
					)}
				>
					<ShoppingCart className="mr-2 size-4" aria-hidden="true" />
					{progress.isAtCap ? 'Cap Reached' : 'Buy Key'}
				</Button>
			</div>
		</div>
	);
};

export default KeyMintProgressSection;
