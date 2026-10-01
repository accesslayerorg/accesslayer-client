import React from 'react';
import { Wallet, TrendingUp, TrendingDown } from 'lucide-react';
import {
	type PnLSummary,
	type HeldKeyPosition,
	formatPnLDisplay,
	formatPnLPercentage,
	sortHoldingsByTotalValue,
	calculatePositionTotalValue,
} from '@/utils/portfolioValue.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { shortenAddress } from '@/lib/web3/format';
import type { Course } from '@/services/course.service';
import { cn } from '@/lib/utils';

export interface PortfolioPerformanceCardProps {
	pnlSummary: PnLSummary;
	walletAddress: string;
	heldPositions: HeldKeyPosition[];
	creators: Course[];
	className?: string;
}

export const AccessLayerLogoIcon: React.FC<{ className?: string }> = ({
	className = 'size-8',
}) => (
	<svg
		xmlns="http://www.w3.org/2000/svg"
		viewBox="0 0 256 256"
		fill="none"
		className={className}
		aria-hidden="true"
	>
		<defs>
			<linearGradient id="alLogoGradient" x1="0" y1="0" x2="256" y2="256" gradientUnits="userSpaceOnUse">
				<stop offset="0%" stopColor="#FBBF24" />
				<stop offset="50%" stopColor="#F59E0B" />
				<stop offset="100%" stopColor="#D97706" />
			</linearGradient>
		</defs>
		<path
			d="M 100 136 C 111.046 136 120 144.954 120 156 L 120 256 L 100 256 C 44.772 256 0 211.228 0 156 L 0 136 Z M 256 256 L 136 256 L 136 156 C 136 144.954 144.954 136 156 136 L 256 136 Z M 120 100 C 120 111.046 111.046 120 100 120 L 0 120 L 0 100 C 0 44.772 44.772 0 100 0 L 120 0 Z M 156 0 C 211.228 0 256 44.772 256 100 L 256 120 L 156 120 C 144.954 120 136 111.046 136 100 L 136 0 Z"
			fill="url(#alLogoGradient)"
		/>
	</svg>
);

export const PortfolioPerformanceCard: React.FC<PortfolioPerformanceCardProps> = ({
	pnlSummary,
	walletAddress,
	heldPositions,
	creators,
	className,
}) => {
	const truncatedWallet = shortenAddress(walletAddress) || 'Demo Wallet';
	const isProfitable = pnlSummary.unrealisedPnL > 0;
	const isLoss = pnlSummary.unrealisedPnL < 0;

	// Sort holdings descending by total value and pick top 3
	const activeHoldings = heldPositions.filter(
		pos => pos.quantity != null && pos.quantity > 0
	);
	const topHoldings = sortHoldingsByTotalValue(activeHoldings).slice(0, 3);

	return (
		<div
			data-testid="portfolio-performance-card"
			className={cn(
				'w-[540px] max-w-full rounded-2xl border border-white/15 bg-gradient-to-br from-slate-950 via-[#0a1526] to-[#040812] p-6 text-white shadow-2xl relative overflow-hidden font-jakarta select-none',
				className
			)}
			style={{
				boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7), 0 0 40px -10px rgba(245, 158, 11, 0.15)',
			}}
		>
			{/* Ambient background decoration */}
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -right-20 -top-20 size-60 rounded-full bg-amber-500/10 blur-3xl"
			/>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute -left-20 -bottom-20 size-60 rounded-full bg-blue-500/10 blur-3xl"
			/>

			{/* Card Header: Logo, Branding & Truncated Wallet */}
			<div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-4">
				<div className="flex items-center gap-3">
					<AccessLayerLogoIcon className="size-9" />
					<div>
						<div className="flex items-center gap-2">
							<span className="font-grotesque text-lg font-black tracking-tight text-white">
								AccessLayer
							</span>
							<span className="rounded-full bg-amber-400/15 border border-amber-400/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300">
								Portfolio
							</span>
						</div>
						<p className="text-[11px] text-white/50">Creator Key Performance</p>
					</div>
				</div>

				<div
					data-testid="performance-card-wallet"
					className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-mono text-white/80"
				>
					<Wallet className="size-3 text-amber-400" aria-hidden="true" />
					<span>{truncatedWallet}</span>
				</div>
			</div>

			{/* Main Metrics: Total Value & Unrealised PnL */}
			<div className="relative z-10 mt-5 grid grid-cols-2 gap-4">
				<div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
					<span className="text-xs font-medium text-white/55 uppercase tracking-wider">
						Total Value
					</span>
					<div
						data-testid="performance-card-total-value"
						className="mt-1 font-grotesque text-2xl font-black text-white tracking-tight"
					>
						{formatPnLDisplay(pnlSummary.currentValue)}
					</div>
					<div className="mt-1 text-[11px] text-white/45">
						Invested: {formatPnLDisplay(pnlSummary.totalInvested)}
					</div>
				</div>

				<div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm">
					<div className="flex items-center justify-between">
						<span className="text-xs font-medium text-white/55 uppercase tracking-wider">
							Unrealised PnL
						</span>
						{isProfitable ? (
							<TrendingUp className="size-4 text-emerald-400" aria-hidden="true" />
						) : isLoss ? (
							<TrendingDown className="size-4 text-red-400" aria-hidden="true" />
						) : null}
					</div>
					<div
						data-testid="performance-card-unrealised-pnl"
						className={cn(
							'mt-1 font-grotesque text-2xl font-black tracking-tight',
							isProfitable
								? 'text-emerald-400'
								: isLoss
									? 'text-red-400'
									: 'text-white'
						)}
					>
						{formatPnLDisplay(pnlSummary.unrealisedPnL)}
					</div>
					<div
						data-testid="performance-card-pnl-percentage"
						className={cn(
							'mt-1 text-[11px] font-bold font-grotesque',
							isProfitable
								? 'text-emerald-400'
								: isLoss
									? 'text-red-400'
									: 'text-white/60'
						)}
					>
						{formatPnLPercentage(pnlSummary.pnlPercentage)} return
					</div>
				</div>
			</div>

			{/* Top 3 Holdings */}
			<div className="relative z-10 mt-5">
				<div className="flex items-center justify-between text-xs mb-2.5">
					<span className="font-semibold text-white/70 uppercase tracking-wider text-[11px]">
						Top Holdings by Value
					</span>
					<span className="text-[11px] text-white/40">
						{activeHoldings.length} {activeHoldings.length === 1 ? 'position' : 'positions'}
					</span>
				</div>

				<div
					data-testid="performance-card-top-holdings"
					className="space-y-2"
				>
					{topHoldings.length === 0 ? (
						<div className="rounded-lg border border-dashed border-white/10 p-3 text-center text-xs text-white/40">
							No held creator keys
						</div>
					) : (
						topHoldings.map((position, index) => {
							const creator = creators.find(c => c.id === position.creatorId);
							const name = creator?.title || creator?.name || `Creator ${position.creatorId}`;
							const handle = creator?.socialHandle
								? `@${creator.socialHandle.replace(/^@/, '')}`
								: null;
							const totalVal = calculatePositionTotalValue(position);

							return (
								<div
									key={position.creatorId}
									data-testid={`top-holding-${index}`}
									className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3.5 py-2.5"
								>
									<div className="flex items-center gap-2.5 min-w-0">
										<span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-amber-300">
											#{index + 1}
										</span>
										<div className="min-w-0">
											<div className="truncate text-xs font-bold text-white">
												{name}
											</div>
											<div className="text-[10px] text-white/50">
												{handle ? `${handle} · ` : ''}
												{position.quantity} {position.quantity === 1 ? 'key' : 'keys'}
											</div>
										</div>
									</div>

									<div className="text-right shrink-0">
										<div className="font-grotesque text-xs font-bold text-white">
											{totalVal != null ? formatDisplayKeyPrice(totalVal) : '—'}
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>
			</div>

			{/* Card Footer: Brand watermark & URL */}
			<div className="relative z-10 mt-5 pt-3 border-t border-white/10 flex items-center justify-between text-[10px] text-white/40 font-mono">
				<span>accesslayer.org</span>
				<span>Decentralized Creator Keys on Stellar</span>
			</div>
		</div>
	);
};

export default PortfolioPerformanceCard;
