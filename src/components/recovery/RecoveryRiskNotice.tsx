import { Info } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { formatDelayHours } from '@/utils/socialRecovery.utils';

export interface RecoveryRiskNoticeProps {
	threshold: number;
	guardianCount: number;
	delayMs: number;
	acknowledged: boolean;
	onAcknowledgedChange: (acknowledged: boolean) => void;
}

/**
 * Plain-language explanation of what guardians can do (#1382). Saving
 * guardians stays disabled until the owner confirms they have read it.
 */
export default function RecoveryRiskNotice({
	threshold,
	guardianCount,
	delayMs,
	acknowledged,
	onAcknowledgedChange,
}: RecoveryRiskNoticeProps) {
	const delay = formatDelayHours(delayMs);
	return (
		<section
			aria-labelledby="recovery-risk-heading"
			data-testid="recovery-risk-notice"
			className="rounded-xl border border-amber-400/40 bg-amber-400/10 p-4"
		>
			<div className="flex items-start gap-2">
				<Info className="mt-0.5 size-4 text-amber-300" aria-hidden="true" />
				<div>
					<h3
						id="recovery-risk-heading"
						className="text-sm font-semibold text-foreground"
					>
						Before you save: what guardians can do
					</h3>
					<ul className="mt-2 list-disc space-y-1 pl-4 text-xs text-muted-foreground">
						<li>
							If {threshold} of your {guardianCount} guardians approve,
							they can move control of this account and its keys to a new
							wallet.
						</li>
						<li>
							Only pick people you trust who will not work together
							against you. Guardians who share a device or email can be
							compromised together.
						</li>
						<li>
							Every recovery waits {delay} before it can run. You will
							see a warning here and can cancel it during that time.
							Cancelling clears all approvals.
						</li>
						<li>
							If you lose access and your guardians also lose theirs,
							nobody can recover the account.
						</li>
					</ul>
				</div>
			</div>
			<label className="mt-3 flex items-center gap-2 text-xs text-foreground">
				<Checkbox
					checked={acknowledged}
					onCheckedChange={onAcknowledgedChange}
					aria-describedby="recovery-risk-heading"
				/>
				I understand these risks
			</label>
		</section>
	);
}
