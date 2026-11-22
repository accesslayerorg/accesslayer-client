import { useEffect, useState } from 'react';
import { ArrowRight, TrendingDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import {
	estimateSellProceeds,
	formatDisplayKeyPrice,
} from '@/utils/keyPriceDisplay.utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import { computeRemainingCooldownSeconds } from '@/utils/buyCooldown.utils';

export interface RetirementExitPanelProps {
	holdingsCount: number;
	marketPriceStroops: number | null;
	currentSupply?: number | null;
	noticeExpiresAt?: string | null;
	onReviewSell: (quantity: number) => void;
}

export default function RetirementExitPanel({
	holdingsCount,
	marketPriceStroops,
	currentSupply,
	noticeExpiresAt,
	onReviewSell,
}: RetirementExitPanelProps) {
	const [quantityText, setQuantityText] = useState(
		String(Math.min(1, holdingsCount))
	);
	const [remainingNoticeSeconds, setRemainingNoticeSeconds] = useState(() =>
		computeRemainingCooldownSeconds(noticeExpiresAt)
	);

	useEffect(() => {
		if (!noticeExpiresAt) {
			setRemainingNoticeSeconds(0);
			return;
		}

		setRemainingNoticeSeconds(computeRemainingCooldownSeconds(noticeExpiresAt));
		const intervalId = setInterval(() => {
			setRemainingNoticeSeconds(
				computeRemainingCooldownSeconds(noticeExpiresAt)
			);
		}, 1000);

		return () => clearInterval(intervalId);
	}, [noticeExpiresAt]);

	const quantity = Number(quantityText);
	const isValidQuantity =
		Number.isFinite(quantity) && quantity > 0 && quantity <= holdingsCount;
	const estimatedProceedsStroops = isValidQuantity
		? estimateSellProceeds(marketPriceStroops, currentSupply, quantity)
		: null;
	const canReviewSell =
		(!noticeExpiresAt || remainingNoticeSeconds > 0) &&
		isValidQuantity &&
		marketPriceStroops != null &&
		Number.isFinite(marketPriceStroops) &&
		marketPriceStroops > 0;

	if (noticeExpiresAt && remainingNoticeSeconds <= 0) {
		return null;
	}

	return (
		<section
			className="rounded-2xl border border-white/10 bg-[#0a1526]/80 p-5 text-white shadow-lg md:p-6"
			data-testid="retirement-voluntary-exit-panel"
			aria-labelledby="retirement-exit-title"
		>
			<div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
				<div className="space-y-2">
					<div className="flex items-center gap-2 text-red-300">
						<TrendingDown className="size-4" aria-hidden="true" />
						<h2
							id="retirement-exit-title"
							className="font-grotesque text-lg font-bold"
						>
							Voluntary exit
						</h2>
					</div>
					<p className="max-w-xl text-sm leading-relaxed text-white/65">
						Sell any part of your position at the current market rate
						before the retirement notice period ends. Review the final
						quote and fees before confirming.
					</p>
					<p className="text-xs text-white/55">
						Market rate:{' '}
						<span className="font-semibold text-white/85">
							{formatDisplayKeyPrice(marketPriceStroops)}
						</span>{' '}
						per key
					</p>
				</div>

				<div className="w-full space-y-3 sm:max-w-xs">
					<div className="space-y-1.5">
						<label
							htmlFor="retirement-sell-quantity"
							className="text-xs font-semibold uppercase tracking-wider text-white/60"
						>
							Keys to sell
						</label>
						<input
							id="retirement-sell-quantity"
							data-testid="retirement-sell-quantity"
							type="number"
							inputMode="decimal"
							min="0"
							max={holdingsCount}
							step="any"
							value={quantityText}
							onChange={event => setQuantityText(event.target.value)}
							className="w-full rounded-lg border border-white/15 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none focus:border-red-400/60 focus:ring-2 focus:ring-red-400/20"
							aria-describedby="retirement-sell-estimate"
						/>
						<p className="text-xs text-white/45">
							Available: {formatNumber(holdingsCount)} keys
						</p>
					</div>

					<div
						id="retirement-sell-estimate"
						className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2"
					>
						<div className="text-xs text-white/50">
							Estimated gross proceeds
						</div>
						<div
							className="text-sm font-bold tabular-nums text-white"
							data-testid="retirement-sell-estimate"
						>
							{estimatedProceedsStroops == null
								? '—'
								: `${formatNumber(
										estimatedProceedsStroops / STROOPS_PER_XLM,
										{
											minimumFractionDigits: 2,
											maximumFractionDigits: 4,
										}
									)} XLM`}
						</div>
					</div>

					<Button
						type="button"
						onClick={() => onReviewSell(quantity)}
						disabled={!canReviewSell}
						className="w-full gap-2 bg-red-500 font-bold text-slate-950 hover:bg-red-400"
						data-testid="retirement-review-sell-button"
					>
						Review sell
						<ArrowRight className="size-4" aria-hidden="true" />
					</Button>
				</div>
			</div>
		</section>
	);
}
