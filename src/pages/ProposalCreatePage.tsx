import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import {
	CreateProposalForm,
	type CreateProposalFormProps,
} from '@/components/common/CreateProposalDialog';
import { useCreateProposalMutation } from '@/hooks/useGovernanceProposals';
import type { CreateProposalPayload, Proposal } from '@/types/governance';

export default function ProposalCreatePage() {
	const navigate = useNavigate();
	const { creatorId: routeCreatorId } = useParams<{ creatorId: string }>();
	const [searchParams] = useSearchParams();
	const creatorId =
		searchParams.get('creatorId') ?? routeCreatorId ?? undefined;
	const mutation = useCreateProposalMutation(creatorId);
	const [submitError, setSubmitError] = useState<string | null>(null);

	const handleSubmit: CreateProposalFormProps['onSubmit'] = async (
		payload: CreateProposalPayload
	) => {
		setSubmitError(null);
		try {
			let created: Proposal;
			if (mutation.mutateAsync) {
				created = await mutation.mutateAsync(payload);
			} else {
				created = await new Promise<Proposal>((resolve, reject) => {
					mutation.mutate(payload, {
						onSuccess: resolve,
						onError: reject,
					});
				});
			}
			navigate(
				created?.id
					? `/governance?proposal=${encodeURIComponent(created.id)}`
					: '/governance'
			);
		} catch (error) {
			const message =
				error instanceof Error
					? error.message
					: 'Failed to submit proposal';
			setSubmitError(message);
		}
	};

	return (
		<main className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-6 lg:px-8">
			<div className="mx-auto max-w-2xl">
				<Link
					to="/governance"
					className="mb-6 inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
				>
					<ArrowLeft className="size-4" aria-hidden="true" />
					Back to governance
				</Link>

				<div className="mb-8">
					<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400/80">
						Governance
					</p>
					<h1 className="mt-1 font-jakarta text-3xl font-black tracking-tight sm:text-4xl">
						Create Proposal
					</h1>
					<p className="mt-2 max-w-lg text-sm text-white/50">
						Submit a governance proposal for on-chain voting.
					</p>
				</div>

				<div className="rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8">
					<CreateProposalForm
						idPrefix="proposal-create"
						onSubmit={handleSubmit}
						isSubmitting={mutation.isPending}
						error={submitError}
						submitLabel="Submit Proposal"
					/>
				</div>

				{creatorId && (
					<Link
						to={`/creator/${encodeURIComponent(creatorId)}/dashboard?tab=governance`}
						className="mt-6 inline-flex text-sm text-amber-400 hover:underline"
					>
						Back to creator governance
					</Link>
				)}
			</div>
		</main>
	);
}
