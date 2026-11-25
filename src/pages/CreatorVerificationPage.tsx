import { useEffect, useState } from 'react';
import VerificationStatusCard from '@/components/creator/VerificationStatusCard';
import VerificationApplicationWizard, {
	type ProofCheckState,
} from '@/components/creator/VerificationApplicationWizard';
import VerifiedBadge from '@/components/common/VerifiedBadge';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
	useCheckProofCode,
	useResubmitVerificationApplication,
	useSubmitVerificationApplication,
	useVerificationApplication,
} from '@/hooks/useVerificationApplication';
import {
	draftFromApplication,
	formatVerificationTimestamp,
} from '@/utils/verificationApplication.utils';

export default function CreatorVerificationPage() {
	useDocumentTitle('Creator verification — AccessLayer');
	const { application, isLoading, isError, refetch } =
		useVerificationApplication();
	const submit = useSubmitVerificationApplication();
	const resubmit = useResubmitVerificationApplication();
	const checkProof = useCheckProofCode();
	const [draft, setDraft] = useState(() => draftFromApplication(null));
	const [proofCheck, setProofCheck] = useState<ProofCheckState>({
		status: 'unchecked',
	});
	const [wizardKey, setWizardKey] = useState(0);

	useEffect(() => {
		if (application) setDraft(draftFromApplication(application));
	}, [application]);

	const isResubmission = application?.status === 'rejected';
	const isSubmitting = submit.isPending || resubmit.isPending;

	const handleSubmit = () => {
		if (isResubmission && application) {
			resubmit.mutate(
				{ id: application.id, draft },
				{
					onSuccess: updated => {
						if (updated) setProofCheck({ status: 'unchecked' });
					},
				}
			);
			return;
		}
		submit.mutate(draft);
	};

	const handleCheckProof = () => {
		checkProof.mutate(draft.proofCode, {
			onSuccess: result => {
				setProofCheck({
					status: result.verified ? 'verified' : 'not_found',
					checkedAt: result.checkedAt ?? new Date().toISOString(),
				});
			},
		});
	};

	return (
		<main className="min-h-screen bg-slate-950 px-6 pt-12 pb-28 md:px-12 md:pb-16">
			<div className="mx-auto max-w-3xl space-y-6">
				<header>
					<div className="flex items-center gap-3">
						<h1 className="font-grotesque text-3xl font-extrabold tracking-tight text-white">
							Creator verification
						</h1>
						{application?.status === 'approved' && (
							<VerifiedBadge verified className="shrink-0" />
						)}
					</div>
					<p className="mt-2 max-w-2xl font-jakarta text-sm text-white/60">
						Verify your identity with legal evidence and a public proof post so
						holders can tell your key apart from impersonators.
					</p>
				</header>

				{isError && (
					<div
						role="alert"
						className="rounded-xl border border-red-400/30 bg-red-500/10 p-4 font-jakarta text-sm text-red-200"
					>
						Could not load your application.{' '}
						<button
							type="button"
							onClick={() => void refetch()}
							className="font-bold underline"
						>
							Try again
						</button>
					</div>
				)}

				{isLoading ? (
					<p role="status" className="font-jakarta text-sm text-white/50">
						Loading your verification application…
					</p>
				) : application ? (
					<VerificationStatusCard
						application={application}
						onResubmit={isResubmission ? () => setWizardKey(key => key + 1) : undefined}
					/>
				) : null}

				{application?.status !== 'approved' && (
					<VerificationApplicationWizard
						key={wizardKey}
						draft={draft}
						onDraftChange={setDraft}
						onSubmit={handleSubmit}
						isSubmitting={isSubmitting}
						submitLabel={
							isResubmission ? 'Resubmit application' : 'Submit application'
						}
						proofCheck={proofCheck}
						onCheckProof={handleCheckProof}
					/>
				)}

				{application?.status === 'approved' && (
					<p
						data-testid="verification-approved-note"
						className="font-jakarta text-xs text-white/50"
					>
						Approved {formatVerificationTimestamp(application.updatedAt)}. Your
						badge is visible across creator profiles and key cards.
					</p>
				)}
			</div>
		</main>
	);
}
