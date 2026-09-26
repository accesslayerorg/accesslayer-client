import {
	AlertTriangle,
	CheckCircle2,
	Minus,
	ThumbsDown,
	ThumbsUp,
	XCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Proposal, ProposalOutcome } from '@/types/governance';
import { formatNumber, formatPercent } from '@/utils/numberFormat.utils';
import {
	getEligibleVotingWeight,
	getParticipationPercentage,
	getProposalOutcome,
	getQuorumPercentage,
	isProposalOutcome,
} from '@/utils/governance.utils';

interface ProposalOutcomeSummaryProps {
	proposal: Proposal;
}

const OUTCOME_PRESENTATION: Record<
	ProposalOutcome,
	{
		label: string;
		description: string;
		containerClassName: string;
		iconClassName: string;
	}
> = {
	passed: {
		label: 'Passed',
		description: 'The proposal passed the final vote.',
		containerClassName: 'border-emerald-500/30 bg-emerald-500/10',
		iconClassName: 'bg-emerald-500/15 text-emerald-400',
	},
	failed: {
		label: 'Failed',
		description: 'The proposal did not pass the final vote.',
		containerClassName: 'border-red-500/30 bg-red-500/10',
		iconClassName: 'bg-red-500/15 text-red-400',
	},
	quorum_not_met: {
		label: 'Quorum not met',
		description: 'Participation did not reach the required voting weight.',
		containerClassName: 'border-amber-500/30 bg-amber-500/10',
		iconClassName: 'bg-amber-500/15 text-amber-400',
	},
};

function FinalOutcomeIcon({ outcome }: { outcome: ProposalOutcome }) {
	if (outcome === 'passed') {
		return <CheckCircle2 className="size-7" aria-hidden="true" />;
	}
	if (outcome === 'failed') {
		return <XCircle className="size-7" aria-hidden="true" />;
	}
	return <AlertTriangle className="size-7" aria-hidden="true" />;
}

function VoteTally({
	direction,
	label,
	value,
	icon,
}: {
	direction: 'for' | 'against' | 'abstain';
	label: string;
	value: number;
	icon: React.ReactNode;
}) {
	const directionClassName = {
		for: 'text-emerald-400',
		against: 'text-red-400',
		abstain: 'text-white/45',
	}[direction];

	return (
		<div className="rounded-xl border border-white/[0.07] bg-white/[0.03] p-4">
			<div className="flex items-center gap-2 text-xs text-white/45">
				<span className={directionClassName}>{icon}</span>
				<span>{label}</span>
			</div>
			<p className="mt-2 font-mono text-lg font-semibold tabular-nums text-white/90">
				{formatNumber(value, { maximumFractionDigits: 4 })}
			</p>
		</div>
	);
}

export default function ProposalOutcomeSummary({
	proposal,
}: ProposalOutcomeSummaryProps) {
	const eligibleVotingWeight = getEligibleVotingWeight(proposal);
	const participationPercentage = getParticipationPercentage(
		proposal.totalVotingWeight,
		eligibleVotingWeight
	);
	const quorumPercentage = getQuorumPercentage(proposal.quorumBps);
	const outcome = getProposalOutcome(proposal);
	const resolvedOutcome = isProposalOutcome(outcome) ? outcome : null;
	const finalOutcome = resolvedOutcome
		? OUTCOME_PRESENTATION[resolvedOutcome]
		: null;

	return (
		<div className="space-y-4">
			{finalOutcome && resolvedOutcome && (
				<section
					aria-label={`Final outcome: ${finalOutcome.label}`}
					data-testid="proposal-final-outcome"
					className={cn(
						'flex items-start gap-4 rounded-2xl border p-5',
						finalOutcome.containerClassName
					)}
				>
					<span
						className={cn(
							'flex size-11 shrink-0 items-center justify-center rounded-full',
							finalOutcome.iconClassName
						)}
					>
						<FinalOutcomeIcon outcome={resolvedOutcome} />
					</span>
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
							Final outcome
						</p>
						<h2 className="mt-1 font-jakarta text-xl font-bold text-white">
							{finalOutcome.label}
						</h2>
						<p className="mt-1 text-sm text-white/55">
							{finalOutcome.description}
						</p>
					</div>
				</section>
			)}

			<section
				aria-label="Voting participation"
				className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5"
			>
				<div className="flex flex-wrap items-end justify-between gap-3">
					<div>
						<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
							Participation
						</p>
						<p
							className="mt-1 font-mono text-2xl font-semibold tabular-nums text-white"
							data-testid="proposal-participation-rate"
						>
							{formatPercent(participationPercentage, {
								maximumFractionDigits: 2,
							})}
						</p>
					</div>
					<p className="text-xs text-white/45">
						{formatNumber(proposal.totalVotingWeight, {
							maximumFractionDigits: 4,
						})}{' '}
						of{' '}
						{formatNumber(eligibleVotingWeight, {
							maximumFractionDigits: 4,
						})}{' '}
						eligible weight
					</p>
				</div>

				<div
					role="progressbar"
					aria-label="Participation toward quorum"
					aria-valuemin={0}
					aria-valuemax={100}
					aria-valuenow={Math.min(100, participationPercentage)}
					className="relative mt-4 h-2.5 w-full overflow-hidden rounded-full bg-white/[0.08]"
				>
					<div
						className="absolute inset-y-0 left-0 rounded-full bg-amber-400"
						style={{
							width: `${Math.min(100, participationPercentage)}%`,
						}}
					/>
					<div
						className="absolute inset-y-0 w-0.5 bg-white/80"
						style={{ left: `${quorumPercentage}%` }}
					/>
				</div>
				<p className="mt-2 text-xs text-white/40">
					{formatPercent(quorumPercentage, { maximumFractionDigits: 2 })}{' '}
					quorum required
				</p>
			</section>

			<div className="grid gap-3 sm:grid-cols-3">
				<VoteTally
					direction="for"
					label="For"
					value={proposal.forVotes}
					icon={<ThumbsUp className="size-3.5" aria-hidden="true" />}
				/>
				<VoteTally
					direction="against"
					label="Against"
					value={proposal.againstVotes}
					icon={<ThumbsDown className="size-3.5" aria-hidden="true" />}
				/>
				<VoteTally
					direction="abstain"
					label="Abstain"
					value={proposal.abstainVotes}
					icon={<Minus className="size-3.5" aria-hidden="true" />}
				/>
			</div>
		</div>
	);
}
