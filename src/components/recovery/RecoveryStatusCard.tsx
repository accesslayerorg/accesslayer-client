import { CheckCircle2, Clock, ShieldAlert, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { truncateWalletAddress } from '@/utils/referral.utils';
import {
	formatRecoveryCountdown,
	getRecoveryProgress,
	type RecoveryRequest,
} from '@/utils/socialRecovery.utils';

export interface RecoveryStatusCardProps {
	request: RecoveryRequest;
	nowMs: number;
	/** Shown to the owner while the delay runs. */
	onCancel?: () => void;
	/** Shown to the new owner; only enabled once the recovery can execute. */
	onExecute?: () => void;
	className?: string;
}

/**
 * Pending recovery summary (#1382): approvals so far, threshold and time
 * until the recovery can execute. Execution is only offered once both the
 * threshold and the safety delay are met.
 */
export default function RecoveryStatusCard({
	request,
	nowMs,
	onCancel,
	onExecute,
	className,
}: RecoveryStatusCardProps) {
	const progress = getRecoveryProgress(request, nowMs);
	const percent = Math.min(
		100,
		Math.round((progress.approvals / progress.threshold) * 100)
	);

	return (
		<section
			aria-labelledby={`recovery-status-${request.id}`}
			data-testid="recovery-status-card"
			className={cn('rounded-xl border border-border p-6', className)}
		>
			<div className="mb-4 flex items-start gap-3">
				<ShieldAlert
					className="mt-0.5 size-5 text-amber-400"
					aria-hidden="true"
				/>
				<div className="min-w-0">
					<h2
						id={`recovery-status-${request.id}`}
						className="font-jakarta text-lg font-semibold"
					>
						Recovery pending
					</h2>
					<p className="text-xs text-muted-foreground">
						Account{' '}
						<span className="font-mono" title={request.owner}>
							{truncateWalletAddress(request.owner)}
						</span>{' '}
						→ new owner{' '}
						<span className="font-mono" title={request.newOwner}>
							{truncateWalletAddress(request.newOwner)}
						</span>
					</p>
				</div>
			</div>

			<dl className="grid gap-4 sm:grid-cols-2">
				<div>
					<dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<Users className="size-3.5" aria-hidden="true" />
						Approvals
					</dt>
					<dd
						className="mt-1 text-sm font-medium"
						data-testid="recovery-approvals"
					>
						{progress.approvals} of {progress.threshold} required
					</dd>
					<Progress
						value={percent}
						className="mt-2"
						aria-label="Guardian approvals"
					/>
				</div>
				<div>
					<dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
						<Clock className="size-3.5" aria-hidden="true" />
						Time until execution
					</dt>
					<dd
						className="mt-1 text-sm font-medium"
						data-testid="recovery-countdown"
					>
						{progress.delayElapsed
							? 'Safety delay complete'
							: formatRecoveryCountdown(progress.msUntilExecution)}
					</dd>
				</div>
			</dl>

			<p className="mt-4 text-xs text-muted-foreground">
				{progress.canExecute ? (
					<span className="inline-flex items-center gap-1 text-emerald-300">
						<CheckCircle2 className="size-3.5" aria-hidden="true" />
						Threshold and safety delay met. This recovery can now execute.
					</span>
				) : !progress.thresholdMet ? (
					`Waiting for ${progress.threshold - progress.approvals} more guardian approval${
						progress.threshold - progress.approvals === 1 ? '' : 's'
					}.`
				) : (
					'Threshold met. Waiting for the safety delay to end.'
				)}
			</p>

			{(onCancel || onExecute) && (
				<div className="mt-4 flex flex-wrap gap-2">
					{onCancel && !progress.delayElapsed && (
						<Button
							type="button"
							variant="destructive"
							onClick={onCancel}
						>
							Cancel recovery
						</Button>
					)}
					{onExecute && progress.canExecute && (
						<Button type="button" onClick={onExecute}>
							Execute recovery
						</Button>
					)}
				</div>
			)}
		</section>
	);
}
