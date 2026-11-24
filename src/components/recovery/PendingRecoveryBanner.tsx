import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { truncateWalletAddress } from '@/utils/referral.utils';
import {
	formatRecoveryCountdown,
	getRecoveryProgress,
	type RecoveryRequest,
} from '@/utils/socialRecovery.utils';

export interface PendingRecoveryBannerProps {
	request: RecoveryRequest;
	nowMs: number;
}

/**
 * Prominent owner warning shown while a recovery of their account is
 * pending (#1382). If the owner did not start it, they should cancel now.
 */
export default function PendingRecoveryBanner({
	request,
	nowMs,
}: PendingRecoveryBannerProps) {
	const { msUntilExecution, delayElapsed } = getRecoveryProgress(
		request,
		nowMs
	);

	return (
		<Alert
			data-testid="pending-recovery-banner"
			className="mb-6 border-red-500/50 bg-red-500/10 text-red-100"
		>
			<AlertTriangle className="size-4 text-red-400" aria-hidden="true" />
			<AlertDescription>
				<p className="font-semibold">
					A recovery of your account is in progress.
				</p>
				<p>
					If it succeeds, control moves to{' '}
					<span className="font-mono" title={request.newOwner}>
						{truncateWalletAddress(request.newOwner)}
					</span>
					.{' '}
					{delayElapsed
						? 'The safety delay has ended.'
						: `You have ${formatRecoveryCountdown(msUntilExecution)} to cancel it.`}{' '}
					If you did not ask for this, cancel the recovery now.
				</p>
			</AlertDescription>
		</Alert>
	);
}
