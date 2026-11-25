import { Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatUnlockCountdown } from '@/utils/lockupCountdown.utils';

export interface RentedBadgeProps {
	/** Seconds left on the rental; omitted when unknown. */
	remainingSeconds?: number | null;
	className?: string;
}

/**
 * Marks access that comes from a key rental rather than a held key (#1360).
 */
export default function RentedBadge({
	remainingSeconds,
	className,
}: RentedBadgeProps) {
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 px-2.5 py-1 text-xs font-semibold text-sky-300',
				className
			)}
			data-testid="rented-badge"
		>
			<Clock className="size-3.5" aria-hidden="true" />
			Rented
			{remainingSeconds != null && remainingSeconds > 0 && (
				<span className="font-mono text-sky-300/80">
					· {formatUnlockCountdown(remainingSeconds)} left
				</span>
			)}
		</span>
	);
}
