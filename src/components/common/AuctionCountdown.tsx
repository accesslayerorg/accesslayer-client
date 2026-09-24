import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AuctionCountdownProps {
	/**
	 * Human-readable time remaining until the auction closes, computed by
	 * `getAuctionCountdownState`. `null` when the key has no closing
	 * timestamp, in which case nothing is rendered.
	 */
	label?: string | null;
	/** Whether the auction window has already closed. */
	isEnded?: boolean;
	className?: string;
}

/**
 * Live pill showing time remaining until the pre-launch auction closes (#924).
 * Pure presentational: the ticking state comes from `useAuctionPhase` so the
 * surrounding auction section and the page react to the same instant.
 */
const AuctionCountdown: React.FC<AuctionCountdownProps> = ({
	label,
	isEnded = false,
	className,
}) => {
	if (label == null) return null;

	return (
		<p
			role="status"
			aria-live="polite"
			aria-label={isEnded ? 'Auction closed' : `Auction closes in ${label}`}
			className={cn(
				'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold',
				isEnded
					? 'border-white/10 bg-white/[0.04] text-white/50'
					: 'border-amber-400/30 bg-amber-500/10 text-amber-200',
				className
			)}
		>
			<Timer className="size-3.5 shrink-0" aria-hidden="true" />
			{isEnded ? (
				'Auction closed'
			) : (
				<span>
					Auction closes in{' '}
					<span className="font-mono tabular-nums">{label}</span>
				</span>
			)}
		</p>
	);
};

export default AuctionCountdown;