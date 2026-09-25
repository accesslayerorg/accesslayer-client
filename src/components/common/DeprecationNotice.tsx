import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DeprecationNoticeProps {
	/** Optional human-readable reason shown in the notice's title attribute. */
	reason?: string | null;
	className?: string;
}

/**
 * Badge shown on a portfolio holding row for a key that has been marked
 * deprecated (#871) — e.g. the creator left the platform or the key was
 * superseded. Deprecated keys can no longer be bought/sold; holders should
 * redeem their position instead (see `RedeemKeyDialog`).
 */
const DeprecationNotice: React.FC<DeprecationNoticeProps> = ({
	reason,
	className,
}) => {
	return (
		<span
			className={cn(
				'inline-flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/10 px-2 py-0.5 text-[0.65rem] font-semibold text-orange-400',
				className
			)}
			title={reason ?? 'This key has been deprecated and can no longer be traded.'}
			data-testid="deprecation-notice"
		>
			<AlertTriangle className="size-3" aria-hidden="true" />
			<span>Deprecated</span>
		</span>
	);
};

export default DeprecationNotice;
