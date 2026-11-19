import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KeyTradingPausedBannerProps {
	tradingPaused?: boolean;
	className?: string;
}

export default function KeyTradingPausedBanner({
	tradingPaused,
	className,
}: KeyTradingPausedBannerProps) {
	if (!tradingPaused) {
		return null;
	}

	return (
		<div
			role="alert"
			data-testid="key-trading-paused-banner"
			className={cn(
				'flex items-center gap-2.5 rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm font-medium text-yellow-300',
				className
			)}
		>
			<AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
			<span>Trading is temporarily paused for this key</span>
		</div>
	);
}
