import { useParams, Link } from 'react-router';
import {
	ArrowLeft,
	CalendarDays,
	CheckCircle2,
	Clock3,
	Users,
} from 'lucide-react';
import ProposalOutcomeSummary from '@/components/common/ProposalOutcomeSummary';
import ProposalVoteHistory from '@/components/common/ProposalVoteHistory';
import { ProposalVotePanel } from '@/components/common/ProposalVotePanel';
import QuorumIndicator from '@/components/common/QuorumIndicator';
import { useGovernanceProposal } from '@/hooks/useGovernanceProposals';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';
import { shortenAddress } from '@/lib/web3/format';
import { ApiError } from '@/services/api.service';
import type { Proposal, ProposalStatus } from '@/types/governance';
import {
	getEligibleVotingWeight,
	getProposalOptions,
	getProposalVoteTotal,
	isProposalClosed,
} from '@/utils/governance.utils';
import { formatCompactNumber } from '@/utils/numberFormat.utils';

const STATUS_CLASSES: Record<ProposalStatus, string> = {
	active: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
	closed: 'border-white/15 bg-white/10 text-white/60',
	passed: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
	rejected: 'border-red-500/30 bg-red-500/10 text-red-400',
	executed: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
	cancelled: 'border-white/10 bg-white/[0.04] text-white/50',
};

function formatDateTime(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return 'Date unavailable';
	return date.toLocaleString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
}

function DetailPageShell({ children }: { children: React.ReactNode }) {
	return (
		<main className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-6 lg:px-8">
			<div className="mx-auto max-w-5xl">{children}</div>
		</main>
	);
}

function OptionResults({ proposal }: { proposal: Proposal }) {
	const options = getProposalOptions(proposal);
	const voteTotal = getProposalVoteTotal(proposal);

	return (
		<section aria-label="Option results" className="mt-8">
			<h2 className="mb-4 font-jakarta text-xl font-bold text-white">
				{isProposalClosed(proposal.status)
					? 'Final results'
					: 'Live results'}
			</h2>
			<div className="space-y-4">
				{options.map((option, index) => {
					const percentage =
						voteTotal > 0 ? (option.weight / voteTotal) * 100 : 0;
					return (
						<div key={option.label}>
							<div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
								<span className="text-white/70">{option.label}</span>
								<span className="tabular-nums text-white/50">
									{formatCompactNumber(option.weight)} ·{' '}
									{percentage.toFixed(1)}%
								</span>
							</div>
							<div className="h-2 overflow-hidden rounded-full bg-white/10">
								<div
									className={cn(
										'h-full rounded-full transition-all',
										index === 0
											? 'bg-emerald-400'
											: index === 1
												? 'bg-red-400'
												: 'bg-amber-300'
									)}
									style={{ width: `${Math.min(100, percentage)}%` }}
								/>
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

export default function ProposalDetailPage() {
	const { proposalId = '' } = useParams<{ proposalId: string }>();
	const {
		data: proposal,
		error,
		isLoading,
		refetch,
	} = useGovernanceProposal(proposalId);
	const notFound = error instanceof ApiError && error.status === 404;

	useDocumentTitle(
		proposal ? `${proposal.title} — AccessLayer` : 'Proposal — AccessLayer'
	);

	return (
		<DetailPageShell>
			<Link
				to="/governance"
				className="inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
			>
				<ArrowLeft className="size-4" aria-hidden="true" />
				Back to proposals
			</Link>

			{isLoading && (
				<div
					className="mt-8 space-y-4"
					aria-label="Loading proposal"
					aria-busy="true"
				>
					<div className="h-10 w-3/4 animate-pulse rounded-lg bg-white/[0.06]" />
					<div className="h-40 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
					<div className="h-64 animate-pulse rounded-2xl border border-white/[0.06] bg-white/[0.03]" />
				</div>
			)}

			{!isLoading && error && (
				<section className="mt-8 rounded-2xl border border-red-500/25 bg-red-500/[0.07] p-8 text-center">
					<h1 className="font-jakarta text-xl font-bold text-white">
						{notFound ? 'Proposal not found' : 'Unable to load proposal'}
					</h1>
					<p className="mt-2 text-sm text-white/50">
						{notFound
							? 'This proposal may have been removed or the link is incorrect.'
							: 'Something went wrong while loading this proposal.'}
					</p>
					{!notFound && (
						<button
							type="button"
							onClick={() => void refetch()}
							className="mt-5 rounded-xl border border-white/15 bg-white/[0.05] px-5 py-2.5 text-sm font-semibold text-white/75 transition-colors hover:bg-white/[0.09] hover:text-white"
						>
							Try again
						</button>
					)}
				</section>
			)}

			{!isLoading && !error && proposal && (
				<article className="mt-8">
					<header className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-7">
						<div className="flex flex-wrap items-center gap-3">
							<span
								className={cn(
									'rounded-full border px-3 py-1 text-xs font-semibold capitalize',
									STATUS_CLASSES[proposal.status]
								)}
							>
								{proposal.status}
							</span>
							<span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
								Proposal {proposal.id}
							</span>
							{proposal.pollId !== undefined && (
								<span className="font-mono text-[10px] uppercase tracking-[0.18em] text-white/30">
									Poll #{proposal.pollId}
								</span>
							)}
						</div>
						<h1 className="mt-4 font-jakarta text-3xl font-black tracking-tight text-white sm:text-4xl">
							{proposal.title}
						</h1>
						<div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/45">
							<span
								className="inline-flex items-center gap-1.5"
								title={proposal.creatorAddress ?? proposal.creatorId}
							>
								<Users className="size-3.5" aria-hidden="true" />
								Creator{' '}
								{shortenAddress(
									proposal.creatorAddress ?? proposal.creatorId
								)}
							</span>
							<span className="inline-flex items-center gap-1.5">
								<CalendarDays className="size-3.5" aria-hidden="true" />
								{formatDateTime(proposal.startDate)} —{' '}
								{formatDateTime(proposal.endDate)}
							</span>
						</div>
					</header>

					<section
						aria-label="Proposal description"
						className="mt-5 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-7"
					>
						<h2 className="font-jakarta text-sm font-bold uppercase tracking-[0.16em] text-white/40">
							Description
						</h2>
						<p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/70">
							{proposal.description}
						</p>
					</section>

					<section className="mt-8" aria-label="Proposal result">
						<h2 className="mb-4 font-jakarta text-xl font-bold text-white">
							Result and participation
						</h2>
						<ProposalOutcomeSummary proposal={proposal} />
					</section>

					<OptionResults proposal={proposal} />

					<section className="mt-8" aria-label="Quorum progress">
						<h2 className="mb-4 font-jakarta text-xl font-bold text-white">
							Quorum progress
						</h2>
						<QuorumIndicator
							quorumBps={proposal.quorumBps}
							totalVotingWeight={getProposalVoteTotal(proposal)}
							totalCirculatingSupply={getEligibleVotingWeight(proposal)}
						/>
					</section>

					<section className="mt-10" aria-label="Cast your vote">
						{proposal.status === 'active' ? (
							<ProposalVotePanel proposal={proposal} />
						) : (
							<div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-5 sm:p-7">
								<div className="flex items-center gap-3">
									<div className="rounded-lg bg-white/10 p-2 text-white/60">
										<CheckCircle2
											className="size-4"
											aria-hidden="true"
										/>
									</div>
									<div>
										<p className="text-sm font-semibold text-white">
											Voting is closed
										</p>
										<p className="mt-1 text-xs text-white/45">
											This proposal is read-only and no longer
											accepts votes.
										</p>
									</div>
								</div>
								{proposal.closedAt && (
									<p className="mt-5 flex items-center gap-2 text-xs text-white/45">
										<Clock3 className="size-3.5" aria-hidden="true" />
										Closed {formatDateTime(proposal.closedAt)}
									</p>
								)}
							</div>
						)}
					</section>

					<section
						className="mt-10"
						aria-labelledby="vote-history-heading"
					>
						<div className="mb-4 flex items-end justify-between gap-4">
							<div>
								<p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-400/80">
									Governance
								</p>
								<h2
									id="vote-history-heading"
									className="mt-1 font-jakarta text-xl font-bold text-white"
								>
									Vote history
								</h2>
							</div>
						</div>
						<ProposalVoteHistory proposalId={proposal.id} />
					</section>
				</article>
			)}
		</DetailPageShell>
	);
}
