import { useState } from 'react';
import { CheckCircle2, Handshake } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import RecoveryStatusCard from '@/components/recovery/RecoveryStatusCard';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import { useNowMs } from '@/hooks/useNowMs';
import { useSocialRecovery } from '@/hooks/useSocialRecovery';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import {
	normalizeAddress,
	requestsForGuardian,
} from '@/utils/socialRecovery.utils';

/**
 * Guardian approvals (#1382) at `/settings/recovery/approve`.
 *
 * A connected guardian sees only the pending recoveries that name them and
 * can approve each one once.
 */
export default function GuardianApprovePage() {
	useNavigationTiming('guardian-approvals');

	const { address, isConnected, loading } = useStellarWallet();
	const nowMs = useNowMs(1000);
	const guardian = address ? normalizeAddress(address) : undefined;

	const requests = useSocialRecovery(state => state.requests);
	const approve = useSocialRecovery(state => state.approve);
	const [error, setError] = useState<string | null>(null);

	const visible = requestsForGuardian(requests, guardian);

	const handleApprove = (requestId: string) => {
		if (!guardian) return;
		const result = approve(requestId, guardian);
		setError(result.ok ? null : result.error);
	};

	return (
		<main className="mx-auto max-w-3xl px-6 py-16">
			<div className="mb-2 flex items-center gap-3">
				<Handshake className="size-6 text-foreground" aria-hidden="true" />
				<h1 className="font-jakarta text-2xl font-semibold">
					Guardian approvals
				</h1>
			</div>
			<p className="mb-8 text-sm text-muted-foreground">
				Approve a recovery only after confirming with the account owner
				through a channel you trust, such as a call.{' '}
				<Link to="/settings/recovery" className="underline">
					Back to social recovery
				</Link>
			</p>

			{loading ? (
				<p className="text-sm text-muted-foreground" role="status">
					Checking wallet…
				</p>
			) : !isConnected || !guardian ? (
				<p className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
					Connect your Stellar wallet to see recovery requests that name
					you.
				</p>
			) : visible.length === 0 ? (
				<p className="rounded-xl border border-border p-6 text-sm text-muted-foreground">
					No recovery requests name you as a guardian.
				</p>
			) : (
				<div className="space-y-6">
					{error && (
						<p role="alert" className="text-xs text-destructive">
							{error}
						</p>
					)}
					{visible.map(request => {
						const approved = request.approvals.includes(guardian);
						return (
							<div key={request.id} className="space-y-3">
								<RecoveryStatusCard request={request} nowMs={nowMs} />
								{approved ? (
									<p className="flex items-center gap-1.5 text-xs text-emerald-300">
										<CheckCircle2
											className="size-3.5"
											aria-hidden="true"
										/>
										You approved this recovery
									</p>
								) : (
									<Button
										type="button"
										onClick={() => handleApprove(request.id)}
									>
										Approve recovery
									</Button>
								)}
							</div>
						);
					})}
				</div>
			)}
		</main>
	);
}
