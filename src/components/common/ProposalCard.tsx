import { Link } from 'react-router';
import { ArrowRight, ArrowUpRight, Clock } from 'lucide-react';
import type { Proposal } from '@/types/governance';
import { cn } from '@/lib/utils';
import {
	formatProposalTimeRemaining,
	getEligibleVotingWeight,
	getProposalOptions,
	getProposalVoteTotal,
} from '@/utils/governance.utils';
import { formatCompactNumber } from '@/utils/numberFormat.utils';

interface ProposalCardProps {
	proposal: Proposal;
	onVoteClick?: (proposal: Proposal) => void;
	className?: string;
}

const statusClasses: Record<Proposal['status'], string> = {
	active: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
	closed: 'border-white/15 bg-white/10 text-white/60',
	passed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
	rejected: 'border-red-500/30 bg-red-500/10 text-red-400',
	failed: 'border-red-500/30 bg-red-500/10 text-red-400',
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
 * Proposal card with quorum progress indicator, parameter change details,
 * and executed old/new parameter values (#826, #922, #1126).
 */
const ProposalCard: React.FC<ProposalCardProps> = ({
	proposal,
	onVoteClick,
	className,
}) => {
	const isActive = proposal.status === 'active';
	const options = getProposalOptions(proposal);
	const totalVotes = getProposalVoteTotal(proposal);
	const eligibleVotingWeight = getEligibleVotingWeight(proposal);
	const quorumPercent =
		eligibleVotingWeight > 0
			? Math.min(
					100,
					Math.round((totalVotes / eligibleVotingWeight) * 100)
				)
			: 0;
	const hasParamChange =
		proposal.paramName !== undefined ||
		proposal.oldValue !== undefined ||
		proposal.newValue !== undefined;

	return (
		<Link
			to={`/governance/${encodeURIComponent(proposal.id)}`}
			aria-label={`View ${proposal.title}`}
			data-testid={`proposal-card-${proposal.id}`}
			className={cn(
				'group block rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 transition-all duration-200 hover:border-amber-500/30 hover:bg-white/[0.05]',
				className
			)}
		>
			<div className="mb-3 flex items-start justify-between gap-3">
				<h3 className="font-jakarta text-base font-bold leading-snug text-white group-hover:text-amber-200">
					{proposal.title}
				</h3>
				<div className="flex shrink-0 items-center gap-2">
					<span
						data-testid={`proposal-status-${proposal.id}`}
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

			<p
				data-testid="proposal-description"
				className="mb-4 line-clamp-2 text-sm leading-relaxed text-white/60"
			>
				{proposal.description ||
					'No additional proposal details were provided.'}
			</p>

			{hasParamChange && (
				<div
					data-testid="proposal-param-change"
					className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs"
				>
					<span className="font-mono font-semibold text-amber-300">
						{proposal.paramName ?? 'Protocol Parameter'}
					</span>
					<div className="flex items-center gap-2 font-mono">
						{proposal.oldValue !== undefined && (
							<span
								data-testid="proposal-old-value"
								className="text-white/50 line-through"
							>
								{String(proposal.oldValue)}
							</span>
						)}
						{proposal.oldValue !== undefined &&
							proposal.newValue !== undefined && (
								<ArrowRight className="size-3 text-white/40" />
							)}
						{proposal.newValue !== undefined && (
							<span
								data-testid="proposal-new-value"
								className="font-bold text-emerald-300"
							>
								{String(proposal.newValue)}
							</span>
						)}
					</div>
				</div>
			)}

			<div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-white/50">
				{options.map(option => (
					<span
						key={option.label}
						data-testid={
							option.label.toLowerCase() === 'for'
								? 'proposal-votes-for'
								: option.label.toLowerCase() === 'against'
									? 'proposal-votes-against'
									: undefined
						}
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
				</span>
			</div>

			<div className="mt-4" data-testid="proposal-quorum-progress">
				<div className="mb-1 flex items-center justify-between text-xs text-white/50">
					<span>Quorum</span>
					<span
						data-testid="proposal-quorum-percent"
						className="tabular-nums"
					>
						{quorumPercent}%
					</span>
				</div>
				<div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
					<div
						data-testid="proposal-quorum-bar"
						className="h-full rounded-full bg-amber-400 transition-all"
						style={{ width: `${quorumPercent}%` }}
					/>
				</div>
			</div>

			<div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-xs text-white/35">
				<div className="flex items-center gap-1.5">
					<Clock className="size-3" aria-hidden="true" />
					<span>
						{formatDate(proposal.startDate)} — {formatDate(proposal.endDate)}
					</span>
					<span className="text-white/20">·</span>
					<span
						data-testid="proposal-time-remaining"
						className="text-white/55"
					>
						{formatProposalTimeRemaining(
							proposal.endDate,
							proposal.status
						)}
					</span>
				</div>

				{isActive && onVoteClick && (
					<button
						type="button"
						data-testid={`proposal-vote-btn-${proposal.id}`}
						onClick={e => {
							e.preventDefault();
							e.stopPropagation();
							onVoteClick(proposal);
						}}
						className="rounded-lg border border-amber-400/40 bg-amber-400/15 px-3 py-1 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-400/25"
					>
						Vote
					</button>
				)}
			</div>
		</Link>
	);
};

export default ProposalCard;
