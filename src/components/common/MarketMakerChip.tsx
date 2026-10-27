import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { MarketMakerInfo } from '@/hooks/useKeyMarketMaker';

interface MarketMakerChipProps {
	maker: MarketMakerInfo;
	className?: string;
}

function shortenWallet(address: string): string {
	if (address.length <= 12) return address;
	return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function MarketMakerChip({ maker, className }: MarketMakerChipProps) {
	const tooltipContent = (
		<div className="max-w-[220px] space-y-1 p-1 text-left">
			<p className="font-semibold text-white">Market Maker Active</p>
			<p className="text-white/70">
				Spread:{' '}
				<span className="font-mono text-white">
					{(maker.spreadBps / 100).toFixed(2)}%
				</span>
			</p>
			<p className="text-white/70">
				Wallet:{' '}
				<span className="font-mono text-white" title={maker.walletAddress}>
					{shortenWallet(maker.walletAddress)}
				</span>
			</p>
		</div>
	);

	return (
		<Tooltip content={tooltipContent}>
			<span
				className={cn(
					'inline-flex cursor-default items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-400',
					className
				)}
				aria-label={`Market maker active, spread ${(maker.spreadBps / 100).toFixed(2)}%, wallet ${maker.walletAddress}`}
			>
				<span
					className="size-1.5 rounded-full bg-emerald-400"
					aria-hidden="true"
				/>
				MM Active
			</span>
		</Tooltip>
	);
}

export function MMBadge({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				'inline-flex items-center rounded border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400',
				className
			)}
			aria-label="Market maker listing"
		>
			MM
		</span>
	);
}
