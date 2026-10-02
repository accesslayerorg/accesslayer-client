import { useState } from 'react';
import {
	CheckCircle2,
	Clock4,
	GitMerge,
	Loader2,
	ThumbsDown,
	ThumbsUp,
	XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useMergeProposal, useCastMergeVote } from '@/hooks/useMergeProposal';
import MergeProposalCountdown from '@/components/common/MergeProposalCountdown';
import {
	getApprovalPercentage,
	getMergeProposalOutcome,
	getRequiredThresholdPercentage,
	getTotalVotesCast,
	isQualifyingVoter,
	isVotingOpen,
} from '@/utils/mergeProposal.utils';
import { formatCompactNumber } from '@/utils/numberFormat.utils';
import type { MergeVoteDirection } from '@/types/mergeProposal';

export interface MergeProposalBannerProps {
	sourceKeyId: string;
	/** Number of source keys the connected wallet holds. */
	holdingsCount: number;
	/** Whether a wallet is connected at all. */
	isConnected: boolean;
	className?: string;
}

const OUTCOME_COPY: Record<
	'passed' | 'failed' | 'pending_execution',
	{ label: string; icon: React.ElementType; classes: string }
> = {
	passed: {
		label: 'Merge proposal passed',
		icon: CheckCircle2,
		classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
	},
	pending_execution: {
		label: 'Merge proposal passed — pending execution',
		icon: Clock4,
		classes: 'border-blue-500/30 bg-blue-500/10 text-blue-300',
	},
	failed: {
		label: 'Merge proposal failed',
		icon: XCircle,
		classes: 'border-red-500/30 bg-red-500/10 text-red-300',
	},
};

/**
 * Merge proposal voting banner shown on a source key's detail page (#983).
 *
 * - Renders only when the key has a merge proposal at all (active or
 *   recently closed).
 * - Shows approve/reject vote buttons only to qualifying holders while
 *   voting is open.
 * - Shows a live tally (approval % vs. required threshold) that refreshes
 *   every 30s via React Query.
 * - Shows a deadline countdown while voting is open, and an outcome banner
 *   (passed / failed / pending execution) once it closes.
 */
export default function MergeProposalBanner({
	sourceKeyId,
	holdingsCount,
	isConnected,
	className,
}: MergeProposalBannerProps) {
	const { data: proposal, isLoading } = useMergeProposal(sourceKeyId);
	const castVote = useCastMergeVote(sourceKeyId);
	const [pendingDirection, setPendingDirection] =
		useState<MergeVoteDirection | null>(null);

	if (isLoading || !proposal) return null;

	const votingOpen = isVotingOpen(proposal);
	const outcome = getMergeProposalOutcome(proposal);
	const approvalPct = getApprovalPercentage(proposal);
	const requiredPct = getRequiredThresholdPercentage(
		proposal.approvalThresholdBps
	);
	const totalVotes = getTotalVotesCast(proposal);
	const canVote =
		votingOpen &&
		isConnected &&
		isQualifyingVoter(proposal, holdingsCount);

	const handleVote = (direction: MergeVoteDirection) => {
		setPendingDirection(direction);
		castVote.mutate(
			{ proposalId: proposal.id, direction },
			{ onSettled: () => setPendingDirection(null) }
		);
	};

	return (
		<section
			className={cn(
				'rounded-2xl border border-amber-500/25 bg-white/[0.03] p-5 md:p-6',
				className
			)}
			data-testid="merge-proposal-banner"
			aria-label="Merge proposal voting"
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0 max-w-2xl">
					<div className="flex flex-wrap items-center gap-2.5">
						<span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/20 px-2.5 py-0.5 text-xs font-semibold text-amber-300">
							<GitMerge className="size-3.5" aria-hidden="true" />
							Merge proposal
						</span>
						{votingOpen && (
							<MergeProposalCountdown
								votingDeadline={proposal.votingDeadline}
							/>
						)}
					</div>
					<h3 className="mt-2.5 font-jakarta text-base font-bold text-white">
						{proposal.title}
					</h3>
					<p className="mt-1 text-sm leading-relaxed text-white/60">
						{proposal.description}
					</p>
				</div>

				{/* Outcome banner — post-deadline result (#983 AC) */}
				{!votingOpen && outcome && (
					<span
						className={cn(
							'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold',
							OUTCOME_COPY[outcome].classes
						)}
						data-testid="merge-proposal-outcome"
					>
						{(() => {
							const Icon = OUTCOME_COPY[outcome].icon;
							return <Icon className="size-3.5" aria-hidden="true" />;
						})()}
						{OUTCOME_COPY[outcome].label}
					</span>
				)}
			</div>

			{/* Live vote tally */}
			<div className="mt-5 space-y-1.5" data-testid="merge-proposal-tally">
				<div className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.08]">
					<div
						className={cn(
							'absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out',
							approvalPct >= requiredPct ? 'bg-emerald-500' : 'bg-amber-400'
						)}
						style={{ width: `${approvalPct}%` }}
						aria-hidden="true"
					/>
					<div
						className="absolute inset-y-0 w-0.5 bg-white/70"
						style={{ left: `${requiredPct}%` }}
						aria-hidden="true"
					/>
				</div>
				<div className="flex flex-wrap items-center justify-between gap-2 text-xs text-white/50">
					<span className="tabular-nums">
						<span className="font-semibold text-white/80">
							{approvalPct.toFixed(1)}%
						</span>{' '}
						approval · {requiredPct.toFixed(0)}% required
					</span>
					<span className="flex items-center gap-3 tabular-nums">
						<span className="inline-flex items-center gap-1 text-emerald-400">
							<ThumbsUp className="size-3" aria-hidden="true" />
							{formatCompactNumber(proposal.approveWeight)}
						</span>
						<span className="inline-flex items-center gap-1 text-red-400">
							<ThumbsDown className="size-3" aria-hidden="true" />
							{formatCompactNumber(proposal.rejectWeight)}
						</span>
						<span className="text-white/35">
							{formatCompactNumber(totalVotes)} votes cast
						</span>
					</span>
				</div>
			</div>

			{/* Vote actions — qualifying holders only, while voting is open */}
			{votingOpen && (
				<div className="mt-5 flex flex-wrap items-center gap-3 border-t border-white/10 pt-4">
					{canVote ? (
						<>
							<Button
								type="button"
								onClick={() => handleVote('approve')}
								disabled={castVote.isPending}
								className="rounded-xl bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400"
								data-testid="merge-vote-approve"
							>
								{castVote.isPending && pendingDirection === 'approve' ? (
									<Loader2 className="size-4 animate-spin" aria-hidden="true" />
								) : (
									<ThumbsUp className="size-4" aria-hidden="true" />
								)}
								Approve
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => handleVote('reject')}
								disabled={castVote.isPending}
								className="rounded-xl border-red-500/30 bg-red-500/10 font-bold text-red-300 hover:border-red-500/50 hover:bg-red-500/20"
								data-testid="merge-vote-reject"
							>
								{castVote.isPending && pendingDirection === 'reject' ? (
									<Loader2 className="size-4 animate-spin" aria-hidden="true" />
								) : (
									<ThumbsDown className="size-4" aria-hidden="true" />
								)}
								Reject
							</Button>
						</>
					) : (
						<p className="text-xs text-white/40" data-testid="merge-vote-gate">
							{proposal.userVote
								? `You voted to ${proposal.userVote} this proposal.`
								: !isConnected
									? 'Connect a wallet holding this key to vote.'
									: `Hold at least ${proposal.minHoldingToVote} key${
											proposal.minHoldingToVote === 1 ? '' : 's'
										} to vote on this proposal.`}
						</p>
					)}
				</div>
			)}
		</section>
	);
}
