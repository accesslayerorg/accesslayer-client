import { AlertCircle, BadgeCheck, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import type { VerificationApplication } from '@/services/creatorVerification.service';
import {
	formatVerificationTimestamp,
	getStatusLabel,
} from '@/utils/verificationApplication.utils';

export interface VerificationStatusCardProps {
	application: VerificationApplication;
	onResubmit?: () => void;
}

export default function VerificationStatusCard({
	application,
	onResubmit,
}: VerificationStatusCardProps) {
	const isApproved = application.status === 'approved';
	const isRejected = application.status === 'rejected';

	return (
		<section
			aria-labelledby="verification-status-heading"
			data-testid="verification-status-card"
			className="rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md"
		>
			<div className="flex flex-wrap items-center gap-3">
				<h2
					id="verification-status-heading"
					className="font-grotesque text-xl font-bold text-white"
				>
					Application status
				</h2>
				<span
					data-testid="verification-status"
					data-status={application.status}
					className="rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1 font-jakarta text-xs font-bold text-amber-200"
				>
					{getStatusLabel(application.status)}
				</span>
				{isApproved && <VerifiedBadge verified className="shrink-0" />}
			</div>

			<dl className="mt-4 grid gap-3 font-jakarta text-xs text-white/60 sm:grid-cols-2">
				<div>
					<dt className="font-bold text-white/80">Submitted</dt>
					<dd data-testid="verification-submitted-at">
						{formatVerificationTimestamp(application.submittedAt)}
					</dd>
				</div>
				<div>
					<dt className="font-bold text-white/80">Last updated</dt>
					<dd data-testid="verification-updated-at">
						{formatVerificationTimestamp(application.updatedAt)}
					</dd>
				</div>
				<div>
					<dt className="font-bold text-white/80">Proof code</dt>
					<dd className="font-mono text-white">{application.proofCode}</dd>
				</div>
				<div>
					<dt className="font-bold text-white/80">Proof check</dt>
					<dd
						data-testid="verification-proof-state"
						className="inline-flex items-center gap-1.5"
					>
						{application.proofVerified ? (
							<>
								<BadgeCheck className="size-3.5 text-emerald-300" aria-hidden="true" />
								Verified
							</>
						) : (
							<>
								<Clock3 className="size-3.5 text-amber-300" aria-hidden="true" />
								Not verified yet
							</>
						)}
					</dd>
				</div>
			</dl>

			{application.reviewerNote && (
				<p
					role={isRejected ? 'alert' : undefined}
					data-testid="verification-reviewer-note"
					className="mt-4 flex items-start gap-2 rounded-lg border border-white/10 bg-white/[0.03] p-3 font-jakarta text-sm text-white/70"
				>
					<AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
					<span>
						<strong className="text-white">
							{isRejected ? 'Reviewer note: ' : 'Note from reviewer: '}
						</strong>
						{application.reviewerNote}
					</span>
				</p>
			)}

			{isRejected && onResubmit && (
				<Button
					type="button"
					onClick={onResubmit}
					data-testid="verification-resubmit-button"
					className="mt-4"
				>
					Resubmit application
				</Button>
			)}
		</section>
	);
}
