import { Link } from 'react-router';
import { ArrowUpRight, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ArrowRight, Clock, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import QuorumIndicator from '@/components/common/QuorumIndicator';
import type { Proposal } from '@/types/governance';
import { cn } from '@/lib/utils';
import {
	getProposalOptions,
	getProposalVoteTotal,
} from '@/utils/governance.utils';
import { formatCompactNumber } from '@/utils/numberFormat.utils';
import { getEligibleVotingWeight } from '@/utils/governance.utils';

interface ProposalCardProps {
	proposal: Proposal;
	className?: string;
}

const statusClasses: Record<Proposal['status'], string> = {
	active: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
	closed: 'border-white/15 bg-white/10 text-white/60',
	passed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
	rejected: 'border-red-500/30 bg-red-500/10 text-red-400',
	executed: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
	cancelled: 'border-white/10 bg-white/[0.04] text-white/40',
};

function formatDate(iso: string): string {
	return new Date(iso).toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, className }) => {
	const isActive = proposal.status === 'active';
	const options = getProposalOptions(proposal);
	const totalVotes = getProposalVoteTotal(proposal);
	const eligibleWeight =
		proposal.eligibleVotingWeight ?? proposal.totalCirculatingSupply;
	const totalVotingWeight =
		proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;
	const eligibleVotingWeight = getEligibleVotingWeight(proposal);

	return (
		<Link
			to={`/governance/proposals/${encodeURIComponent(proposal.id)}`}
			aria-label={`View ${proposal.title}`}
			className={cn(
				'group block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all duration-200 hover:border-amber-500/30 hover:bg-white/[0.05]',
				className
			)}
		>
			<div className="mb-3 flex items-start justify-between gap-3">
				<h3 className="font-jakarta text-base font-bold leading-snug text-white group-hover:text-amber-200">
					{proposal.title}
				<h3 className="font-jakarta text-base font-bold text-white leading-snug">
					<Link
						to={`/governance/${proposal.id}`}
						className="rounded-sm transition-colors hover:text-amber-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/50"
					>
						{proposal.title}
					</Link>
				</h3>
				<div className="flex shrink-0 items-center gap-2">
					<span
						className={cn(
							'rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold capitalize',
							statusClasses[proposal.status]
						)}
					>
						{proposal.status}
					</span>
					<ArrowUpRight className="size-4 text-white/30 transition-colors group-hover:text-amber-300" />
				</div>
			</div>

			<p className="mb-4 line-clamp-2 text-sm leading-relaxed text-white/60">
				{proposal.description ||
					'No additional proposal details were provided.'}
			</p>

			<div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/50">
				{options.map(option => (
					<span
						key={option.label}
						className="inline-flex items-center gap-1"
					>
						<span className="max-w-28 truncate">{option.label}</span>
						<span className="font-medium text-white/70">
							{formatCompactNumber(option.weight)}
						</span>
					</span>
				))}
				<span className="ml-auto tabular-nums text-white/40">
					{formatCompactNumber(totalVotes)} weight
			{/* Vote tallies */}
			<div className="mb-4 flex items-center gap-4 text-xs text-white/50">
				<span className="inline-flex items-center gap-1">
					<ThumbsUp
						className="size-3 text-emerald-400"
						aria-hidden="true"
					/>
					{formatCompactNumber(proposal.forVotes)}
				</span>
				<span className="inline-flex items-center gap-1">
					<ThumbsDown className="size-3 text-red-400" aria-hidden="true" />
					{formatCompactNumber(proposal.againstVotes)}
				</span>
				<span className="inline-flex items-center gap-1">
					<Minus className="size-3 text-white/40" aria-hidden="true" />
					{formatCompactNumber(proposal.abstainVotes)}
				</span>
				<span className="ml-auto tabular-nums text-white/40">
					{formatCompactNumber(totalVotingWeight)} weight
				</span>
			</div>

			{isActive && (
				<QuorumIndicator
					quorumBps={proposal.quorumBps}
					totalVotingWeight={totalVotes}
					totalCirculatingSupply={eligibleWeight}
					className="mt-4"
				/>
			)}

			<div className="flex items-center gap-1.5 text-xs text-white/35">
				<Clock className="size-3" aria-hidden="true" />
				<span>
					totalVotingWeight={proposal.totalVotingWeight}
					totalCirculatingSupply={eligibleVotingWeight}
					className="mb-4"
				/>
			)}

			{/* Footer: dates */}
			<div className="flex flex-wrap items-center justify-between gap-3 text-xs text-white/35">
				<span className="inline-flex items-center gap-1.5">
					<Clock className="size-3" aria-hidden="true" />
					{formatDate(proposal.startDate)} — {formatDate(proposal.endDate)}
				</span>
				<Link
					to={`/governance/${proposal.id}`}
					className="inline-flex items-center gap-1 font-semibold text-white/50 transition-colors hover:text-amber-300"
				>
					View proposal
					<ArrowRight className="size-3" aria-hidden="true" />
				</Link>
			</div>
		</Link>
	);
};

export default ProposalCard;
