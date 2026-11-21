import React from 'react';
import { Share2, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import {
	formatPnLDisplay,
	formatPnLPercentage,
	type PnLSummary,
} from '@/utils/portfolioValue.utils';
import { cn } from '@/lib/utils';

export interface PortfolioSummaryHeaderProps {
	/** Held-keys portfolio value in stroops, or null while prices load/unavailable. */
	heldValueStroops: number | null;
	/** Staked-positions value in stroops, or null while prices load/unavailable. */
	stakedValueStroops: number | null;
	/** Number of held key positions (with quantity > 0). */
	heldPositionCount: number;
	/** Number of active staking positions. */
	stakedPositionCount: number;
	/** PnL summary for the held-keys side. */
	pnl: PnLSummary;
	/** Whether key prices are still being fetched (#921). */
	isPriceLoading?: boolean;
	/** Whether the viewer owns this profile — gates the share button. */
	isOwnProfile?: boolean;
	/** Copies the public `/profile/:wallet` link to the clipboard. */
	onShareProfile?: () => void;
	/** Whether the share button currently shows "Copied!" feedback. */
	isShareCopied?: boolean;
	className?: string;
}

/**
 * Portfolio summary header for the user profile page (#921).
 *
 * Renders the portfolio total as the sum of held keys and staking positions,
 * a per-segment value breakdown, and the unrealised PnL band. When the owner
 * is viewing, a share button copies the public profile URL for sharing.
 */
const PortfolioSummaryHeader: React.FC<PortfolioSummaryHeaderProps> = ({
	heldValueStroops,
	stakedValueStroops,
	heldPositionCount,
	stakedPositionCount,
	pnl,
	isPriceLoading = false,
	isOwnProfile = true,
	onShareProfile,
	isShareCopied = false,
	className,
}) => {
	const totalStroops =
		heldValueStroops != null && stakedValueStroops != null
			? heldValueStroops + stakedValueStroops
			: null;

	const totalDisplay = isPriceLoading
		? 'Loading prices…'
		: totalStroops != null
			? formatDisplayKeyPrice(totalStroops)
			: 'Unavailable';

	const showPnL =
		pnl.status === 'ready' && pnl.totalInvested > 0 && !isPriceLoading;
	const isPnlPositive = pnl.unrealisedPnL >= 0;

	return (
		<section
			aria-label="Portfolio summary"
			className={cn(
				'transition-all duration-300 rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
		>
			<div className="grid gap-6 md:grid-cols-[1fr_auto] md:items-center">
				<div>
					<p className="mb-2 text-xs font-bold uppercase tracking-[0.24em] text-amber-300/80">
						Portfolio overview
					</p>
					<h2 className="font-grotesque text-2xl font-black tracking-tight text-white">
						Total portfolio value
					</h2>
					<p className="mt-2 max-w-2xl font-jakarta text-sm leading-relaxed text-white/60">
						Sums the current value of every creator key you hold and every
						key you have staked using the latest bond-curve prices.
					</p>
				</div>

				<div
					role="status"
					aria-live="polite"
					aria-busy={isPriceLoading || undefined}
					data-testid="portfolio-summary-total"
					className="rounded-2xl border border-white/10 bg-slate-950/45 px-5 py-4 text-left md:min-w-64"
				>
					<div className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-white/45">
						Portfolio total
					</div>
					<div className="mt-1 flex items-center gap-2 font-grotesque text-3xl font-black text-white">
						{isPriceLoading && (
							<span
								className="size-4 animate-spin rounded-full border-2 border-amber-400/25 border-t-amber-400"
								aria-hidden="true"
							/>
						)}
						{totalDisplay}
					</div>
				</div>
			</div>

			<div className="mt-6 grid gap-3 sm:grid-cols-2">
				<div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/30 px-4 py-3">
					<div className="flex items-center gap-2">
						<span className="text-sm font-semibold text-white/70">
							Held keys
						</span>
						<span
							data-testid="portfolio-summary-held-count"
							className="rounded-full bg-amber-400/15 px-2 py-0.5 text-xs font-bold text-amber-300"
						>
							{heldPositionCount}
						</span>
					</div>
					<span
						data-testid="portfolio-summary-held-value"
						className="font-mono text-sm font-bold text-white"
					>
						{formatDisplayKeyPrice(heldValueStroops)}
					</span>
				</div>

				<div className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-950/30 px-4 py-3">
					<div className="flex items-center gap-2">
						<span className="text-sm font-semibold text-white/70">
							Staked
						</span>
						<span
							data-testid="portfolio-summary-staked-count"
							className="rounded-full bg-emerald-400/15 px-2 py-0.5 text-xs font-bold text-emerald-300"
						>
							{stakedPositionCount}
						</span>
					</div>
					<span
						data-testid="portfolio-summary-staked-value"
						className="font-mono text-sm font-bold text-white"
					>
						{formatDisplayKeyPrice(stakedValueStroops)}
					</span>
				</div>
			</div>

			{showPnL && (
				<div
					data-testid="portfolio-summary-pnl"
					className="mt-4 flex flex-col gap-3 rounded-xl border border-white/10 bg-slate-950/30 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
				>
					<div className="flex flex-wrap items-center gap-6 text-sm">
						<div>
							<span className="text-white/45">Unrealised PnL</span>
							<span className="ml-2 font-grotesque font-bold text-white">
								{formatPnLDisplay(pnl.unrealisedPnL)}
							</span>
						</div>
						<div>
							<span className="text-white/45">Change</span>
							<span
								className={cn(
									'ml-2 font-grotesque font-bold',
									isPnlPositive ? 'text-emerald-400' : 'text-rose-400'
								)}
							>
								{formatPnLPercentage(pnl.pnlPercentage)}
							</span>
						</div>
					</div>
				</div>
			)}

			{isOwnProfile && onShareProfile && (
				<div className="mt-4 flex justify-end">
					<Button
						type="button"
						variant="outline"
						onClick={onShareProfile}
						aria-label={isShareCopied ? 'Copied!' : 'Share profile'}
						data-testid="share-profile-button"
						className="w-full rounded-xl border-white/10 bg-white/5 font-bold text-white transition-all hover:border-amber-500/30 hover:bg-amber-500/10 sm:w-auto"
					>
						{isShareCopied ? (
							<Check
								className="size-4 text-emerald-400"
								aria-hidden="true"
							/>
						) : (
							<Share2
								className="size-4 text-amber-500"
								aria-hidden="true"
							/>
						)}
						{isShareCopied ? 'Copied!' : 'Share profile'}
					</Button>
				</div>
			)}
		</section>
	);
};

export default PortfolioSummaryHeader;
