import { AlertTriangle } from 'lucide-react';
import { bpsToPercent } from '@/utils/numberFormat.utils';

export interface LaunchPenaltyWarningProps {
	/** Whether the sell falls within the key's 7-day launch window. */
	visible: boolean;
	/** Penalty rate in basis points that will be deducted. */
	penaltyBps: number;
}

/**
 * Prominent warning shown on the sell confirmation modal when the key is
 * still within its 7-day launch window (#825). Deliberately styled bolder
 * than `StaleDataWarning` — it precedes a signed transaction that will
 * actually cost the holder the stated percentage of their proceeds.
 */
const LaunchPenaltyWarning: React.FC<LaunchPenaltyWarningProps> = ({
	visible,
	penaltyBps,
}) => {
	if (!visible) return null;

	return (
		<div
			role="alert"
			data-testid="launch-penalty-warning"
			className="flex items-start gap-2 rounded-lg border border-yellow-500/40 bg-yellow-500/10 p-3 text-sm text-yellow-200"
		>
			<AlertTriangle
				className="h-4 w-4 flex-shrink-0 text-yellow-400 mt-0.5"
				aria-hidden="true"
			/>
			<p>
				Early sell penalty applies —{' '}
				<span className="font-semibold" data-testid="launch-penalty-rate">
					{bpsToPercent(penaltyBps)}
				</span>{' '}
				will be deducted from your proceeds.
			</p>
		</div>
	);
};

export default LaunchPenaltyWarning;
