import { cn } from '@/lib/utils';
import { Clock, ThumbsUp, ThumbsDown, Minus } from 'lucide-react';
import QuorumIndicator from '@/components/common/QuorumIndicator';
import type { Proposal } from '@/types/governance';
import { formatCompactNumber } from '@/utils/numberFormat.utils';

interface ProposalCardProps {
	proposal: Proposal;
	className?: string;
}

const statusClasses: Record<Proposal['status'], string> = {
	active: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
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

/**
 * Proposal card with quorum progress indicator (#826).
 *
 * Shows the proposal title, description, vote tallies, time remaining,
 * and a quorum progress bar so voters can see whether participation is
 * on track before voting ends.
 */
const ProposalCard: React.FC<ProposalCardProps> = ({ proposal, className }) => {
	const isActive = proposal.status === 'active';
	const totalVotes =
		proposal.forVotes + proposal.againstVotes + proposal.abstainVotes;

	return (
		<div
			className={cn(
				'rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all duration-200',
				isActive && 'hover:border-amber-500/20 hover:bg-white/[0.05]',
				className
			)}
		>
			{/* Header row: status + title */}
			<div className="mb-3 flex items-start justify-between gap-3">
				<h3 className="font-jakarta text-base font-bold text-white leading-snug">
					{proposal.title}
				</h3>
				<span
					className={cn(
						'shrink-0 rounded-full border px-2.5 py-0.5 text-[0.65rem] font-semibold capitalize',
						statusClasses[proposal.status]
					)}
				>
					{proposal.status}
				</span>
			</div>

			{/* Description */}
			<p className="mb-4 text-sm leading-relaxed text-white/60 line-clamp-2">
				{proposal.description}
			</p>

			{/* Vote tallies */}
			<div className="mb-4 flex items-center gap-4 text-xs text-white/50">
				<span className="inline-flex items-center gap-1">
					<ThumbsUp className="size-3 text-emerald-400" aria-hidden="true" />
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
					{formatCompactNumber(totalVotes)} votes
				</span>
			</div>

			{/* Quorum indicator — core of #826 */}
			{isActive && (
				<QuorumIndicator
					quorumBps={proposal.quorumBps}
					totalVotingWeight={proposal.totalVotingWeight}
					totalCirculatingSupply={proposal.totalCirculatingSupply}
					className="mb-4"
				/>
			)}

			{/* Footer: dates */}
			<div className="flex items-center gap-1.5 text-xs text-white/35">
				<Clock className="size-3" aria-hidden="true" />
				<span>
					{formatDate(proposal.startDate)} — {formatDate(proposal.endDate)}
				</span>
			</div>
		</div>
	);
};

export default ProposalCard;
