import { AlertTriangle, Clock } from 'lucide-react';
import { Link } from 'react-router';
import { useEscapeStatus } from '@/hooks/useEscapeStatus';
import { formatCountdown } from '@/utils/escapeHatch.utils';

/**
 * App-wide banner shown while the protocol emergency pause is active.
 * Displays a countdown to escape-hatch availability and, once escape mode is
 * active, a link to the redemption page.
 */
const EscapeBanner: React.FC = () => {
	const {
		isLoading,
		isProtocolPaused,
		isEscapeModeActive,
		msUntilEscapeAvailable,
	} = useEscapeStatus();

	if (isLoading || !isProtocolPaused) return null;

	const countdownLabel = isEscapeModeActive
		? 'Escape hatch open'
		: `Escape available in ${formatCountdown(msUntilEscapeAvailable)}`;

	return (
		<div
			role="alert"
			aria-live="polite"
			data-testid="escape-banner"
			className="relative z-[60] w-full border-b border-amber-500/40 bg-gradient-to-r from-amber-950/90 via-red-950/80 to-amber-950/90 px-4 py-3 text-sm text-amber-50 backdrop-blur-md"
		>
			<div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-2 text-center sm:flex-row sm:gap-4">
				<div className="flex items-center gap-2 font-semibold">
					<AlertTriangle
						className="size-4 shrink-0 text-amber-300"
						aria-hidden="true"
					/>
					<span>Protocol paused — emergency redemption</span>
				</div>
				<div
					className="flex items-center gap-2 font-mono text-amber-200"
					data-testid="escape-countdown"
				>
					<Clock className="size-4 shrink-0" aria-hidden="true" />
					<span>{countdownLabel}</span>
				</div>
				{isEscapeModeActive && (
					<Link
						to="/escape"
						data-testid="escape-page-link"
						className="rounded-md bg-amber-400 px-3 py-1.5 font-semibold text-slate-950 transition hover:bg-amber-300"
					>
						Redeem holdings
					</Link>
				)}
			</div>
		</div>
	);
};

export default EscapeBanner;
