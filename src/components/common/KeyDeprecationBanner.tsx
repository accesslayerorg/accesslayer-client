import type { Course } from '@/services/course.service';
import { isKeyDeprecated } from '@/utils/keyDeprecation.utils';
import {
	resolveCreatorKeyPriceStroops,
	formatDisplayKeyPrice,
} from '@/utils/keyPriceDisplay.utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import { formatAbsoluteDateTime } from '@/utils/time.utils';
import { useKeyBuyback, type KeyBuybackReceipt } from '@/hooks/useKeyBuyback';
import { Button } from '@/components/ui/button';
import {
	AlertTriangle,
	Clock,
	Coins,
	CheckCircle2,
	ArrowRight,
} from 'lucide-react';
import Skeleton from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { STROOPS_PER_XLM } from '@/constants/stellar';

export interface KeyDeprecationBannerProps {
	creator: Course;
	userAddress?: string;
	holdingsCount?: number;
	onInitiateBuyback?: () => void;
	recentSettlement?: KeyBuybackReceipt | null;
	className?: string;
}

export default function KeyDeprecationBanner({
	creator,
	userAddress,
	holdingsCount = 0,
	onInitiateBuyback,
	recentSettlement,
	className,
}: KeyDeprecationBannerProps) {
	// Acceptance criterion: Deprecation banner visible ONLY for deprecated keys
	const deprecated = isKeyDeprecated(creator);

	const { data: buybackInfo, isLoading: isBuybackLoading } = useKeyBuyback(
		creator.id,
		deprecated
	);

	if (!deprecated) {
		return null;
	}

	const buybackPriceStroops =
		buybackInfo?.buybackPriceStroops ??
		resolveCreatorKeyPriceStroops(creator) ??
		0;
	const expiryDate = buybackInfo?.expiryDate;
	const formattedExpiry = expiryDate
		? formatAbsoluteDateTime(expiryDate) ?? expiryDate
		: 'Guaranteed open window';

	const hasHoldings = holdingsCount > 0;
	const estimatedValueXlm =
		(holdingsCount * buybackPriceStroops) / STROOPS_PER_XLM;

	return (
		<div
			className={cn(
				'relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/15 via-orange-950/20 to-amber-900/10 p-5 md:p-6 backdrop-blur-md shadow-xl shadow-amber-950/20',
				className
			)}
			data-testid="key-deprecation-banner"
		>
			<div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
				{/* Left: Deprecation Notice & Reason */}
				<div className="space-y-2 max-w-2xl">
					<div className="flex flex-wrap items-center gap-2.5">
						<span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
							<AlertTriangle className="size-3.5" aria-hidden="true" />
							<span>Key Deprecated</span>
						</span>
						<span className="text-xs font-medium text-amber-200/70">
							Guaranteed Contract Buyback Active
						</span>
					</div>

					<p className="text-sm text-white/80 leading-relaxed font-jakarta">
						{creator.deprecationReason ??
							'This creator key has been deprecated. Trading on the open market has ceased. Existing holders can exit their positions at the guaranteed contract buyback price.'}
					</p>

					{recentSettlement && (
						<div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg w-fit">
							<CheckCircle2 className="size-3.5" />
							<span>
								Settlement confirmed! Redeemed{' '}
								{formatNumber(recentSettlement.quantity)} keys for{' '}
								{formatNumber(
									recentSettlement.totalPayoutStroops / STROOPS_PER_XLM,
									{
										minimumFractionDigits: 2,
										maximumFractionDigits: 4,
									}
								)}{' '}
								XLM.
							</span>
						</div>
					)}
				</div>

				{/* Middle: Prominent Price & Expiry Badges */}
				<div className="flex flex-wrap items-stretch gap-3">
					{/* Buyback Price Card */}
					<div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 min-w-[140px]">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
							<Coins className="size-5" />
						</div>
						<div>
							<div className="text-[0.7rem] uppercase tracking-wider text-white/50 font-medium">
								Buyback Price
							</div>
							<div
								className="text-base font-bold text-amber-300 tabular-nums"
								data-testid="buyback-price"
							>
								{isBuybackLoading && !buybackInfo ? (
									<Skeleton className="h-5 w-20 bg-white/10" />
								) : (
									formatDisplayKeyPrice(buybackPriceStroops)
								)}
							</div>
						</div>
					</div>

					{/* Expiry Date Card */}
					<div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 min-w-[140px]">
						<div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-white/70">
							<Clock className="size-5" />
						</div>
						<div>
							<div className="text-[0.7rem] uppercase tracking-wider text-white/50 font-medium">
								Expiry Date
							</div>
							<div
								className="text-sm font-semibold text-white/90 tabular-nums"
								data-testid="buyback-expiry"
							>
								{isBuybackLoading && !buybackInfo ? (
									<Skeleton className="h-5 w-24 bg-white/10" />
								) : (
									formattedExpiry
								)}
							</div>
						</div>
					</div>
				</div>

				{/* Right: Buyback Action */}
				<div className="flex flex-col sm:flex-row lg:flex-col items-start lg:items-end justify-center gap-1.5 shrink-0">
					{hasHoldings ? (
						<>
							<Button
								type="button"
								onClick={onInitiateBuyback}
								className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-amber-500/10 transition-all hover:scale-[1.02] active:scale-[0.98] flex items-center gap-2"
								data-testid="initiate-buyback-button"
							>
								<span>Initiate Buyback</span>
								<ArrowRight className="size-4" />
							</Button>
							<span className="text-xs text-amber-300/80 font-medium">
								Holding {formatNumber(holdingsCount)}{' '}
								{holdingsCount === 1 ? 'key' : 'keys'} (≈{' '}
								{formatNumber(estimatedValueXlm, {
									minimumFractionDigits: 2,
									maximumFractionDigits: 4,
								})}{' '}
								XLM)
							</span>
						</>
					) : (
						<>
							<Button
								type="button"
								disabled
								variant="outline"
								className="border-white/10 text-white/40 bg-white/[0.02] cursor-not-allowed font-medium"
								data-testid="initiate-buyback-button"
							>
								{userAddress ? 'No Keys Held' : 'Connect to Buyback'}
							</Button>
							<span className="text-xs text-white/40">
								{userAddress
									? recentSettlement
										? 'Position cleared'
										: '0 keys held in wallet'
									: 'Connect wallet to check eligibility'}
							</span>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
