import { Link, useParams } from 'react-router';
import {
	ArrowLeft,
	CalendarDays,
	CheckCircle2,
	Clock3,
	LoaderCircle,
	Users,
} from 'lucide-react';
import QuorumIndicator from '@/components/common/QuorumIndicator';
import { ProposalVotePanel } from '@/components/common/ProposalVotePanel';
import { useGovernanceProposal } from '@/hooks/useGovernanceProposals';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import type { Proposal, ProposalOutcome } from '@/types/governance';
import {
	getLeadingOption,
	getParticipationRate,
	getProposalOptions,
	getProposalOutcome,
	getProposalVoteTotal,
} from '@/utils/governance.utils';
import { formatCompactNumber, formatPercent } from '@/utils/numberFormat.utils';
import { shortenAddress } from '@/lib/web3/format';

const statusClasses: Record<Proposal['status'], string> = {
	active: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
	closed: 'border-white/15 bg-white/10 text-white/60',
	passed: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
	rejected: 'border-red-400/30 bg-red-400/10 text-red-300',
	executed: 'border-blue-400/30 bg-blue-400/10 text-blue-300',
	cancelled: 'border-white/10 bg-white/[0.04] text-white/40',
};

const outcomeCopy: Record<
	ProposalOutcome,
	{ title: string; description: string; icon: typeof CheckCircle2 }
> = {
	passed: {
		title: 'Proposal passed',
		description: 'The leading option received the most voting weight.',
		icon: CheckCircle2,
	},
	failed: {
		title: 'Proposal did not pass',
		description: 'The final result did not meet the passing threshold.',
		icon: Users,
	},
	quorum_not_met: {
		title: 'Quorum not met',
		description:
			'The proposal closed without reaching the required participation.',
		icon: Users,
	},
};

function formatDateTime(iso: string): string {
	return new Date(iso).toLocaleString('en-US', {
		dateStyle: 'medium',
		timeStyle: 'short',
	});
}

function ProposalDetailContent({ proposal }: { proposal: Proposal }) {
	const options = getProposalOptions(proposal);
	const voteTotal = getProposalVoteTotal(proposal);
	const eligibleWeight =
		proposal.eligibleVotingWeight ?? proposal.totalCirculatingSupply;
	const participation = getParticipationRate(proposal, voteTotal);
	const leadingOption = getLeadingOption(proposal);
	const outcome = getProposalOutcome(proposal);
	const isClosed = proposal.status !== 'active';
	const outcomeDetails = outcome ? outcomeCopy[outcome] : undefined;
	const OutcomeIcon = outcomeDetails?.icon;

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 border-b border-white/10 pb-6 sm:flex-row sm:items-start sm:justify-between">
				<div className="min-w-0">
					<Link
						to="/governance"
						className="mb-5 inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-amber-300"
					>
						<ArrowLeft className="size-4" />
						Back to governance
					</Link>
					<div className="flex flex-wrap items-center gap-2">
						<span
							className={`rounded-full border px-2.5 py-1 text-xs font-semibold capitalize ${statusClasses[proposal.status]}`}
						>
							{proposal.status}
						</span>
						{proposal.pollId !== undefined && (
							<span className="text-xs text-white/35">
								Poll #{proposal.pollId}
							</span>
						)}
					</div>
					<h1 className="mt-3 max-w-3xl text-2xl font-bold leading-tight text-white sm:text-3xl">
						{proposal.title}
					</h1>
					<div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/50">
						<span className="inline-flex items-center gap-2">
							<Users className="size-4" />
							{proposal.creatorAddress || proposal.creatorId
								? `Creator ${shortenAddress(proposal.creatorAddress ?? proposal.creatorId)}`
								: 'Creator not specified'}
						</span>
						<span className="inline-flex items-center gap-2">
							<CalendarDays className="size-4" />
							{isClosed ? 'Closed' : 'Ends'}{' '}
							{formatDateTime(proposal.endDate)}
						</span>
					</div>
				</div>
			</div>

			<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
				<div className="space-y-6">
					<section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
						<h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-white/45">
							Proposal details
						</h2>
						<p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-white/75">
							{proposal.description ||
								'No additional proposal details were provided.'}
						</p>
					</section>

					<section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
						<div className="flex flex-wrap items-end justify-between gap-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
									{isClosed ? 'Final results' : 'Live results'}
								</p>
								{isClosed && outcomeDetails && OutcomeIcon ? (
									<div className="mt-2 flex items-center gap-2">
										<OutcomeIcon className="size-5 text-amber-300" />
										<h2 className="text-xl font-semibold text-white">
											{outcomeDetails.title}
										</h2>
									</div>
								) : (
									<h2 className="mt-2 text-xl font-semibold text-white">
										Voting is open
									</h2>
								)}
							</div>
							<div className="text-right">
								<p className="text-2xl font-bold text-white">
									{formatCompactNumber(voteTotal)}
								</p>
								<p className="text-xs text-white/45">
									total voting weight
								</p>
							</div>
						</div>
						{isClosed && outcomeDetails && (
							<p className="mt-2 text-sm text-white/55">
								{outcomeDetails.description}
							</p>
						)}

						<div className="mt-6 space-y-4">
							{options.map((option, index) => {
								const percentage =
									voteTotal > 0
										? (option.weight / voteTotal) * 100
										: 0;
								const isLeading = leadingOption?.label === option.label;
								return (
									<div key={option.label}>
										<div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
											<span
												className={
													isLeading
														? 'font-semibold text-amber-200'
														: 'text-white/70'
												}
											>
												{option.label}
											</span>
											<span className="tabular-nums text-white/50">
												{formatCompactNumber(option.weight)} ·{' '}
												{percentage.toFixed(1)}%
											</span>
										</div>
										<div className="h-2 overflow-hidden rounded-full bg-white/10">
											<div
												className={`h-full rounded-full transition-all ${
													index === 0
														? 'bg-emerald-400'
														: index === 1
															? 'bg-red-400'
															: 'bg-amber-300'
												}`}
												style={{
													width: `${Math.min(100, percentage)}%`,
												}}
											/>
										</div>
									</div>
								);
							})}
						</div>
					</section>

					<section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
						<div className="flex flex-wrap items-center justify-between gap-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-[0.16em] text-white/45">
									Participation
								</p>
								<p className="mt-2 text-2xl font-bold text-white">
									{eligibleWeight > 0
										? formatPercent(participation)
										: '—'}
								</p>
							</div>
							<div className="text-right text-sm text-white/50">
								<p>Quorum requirement</p>
								<p className="mt-1 font-semibold text-white">
									{proposal.quorumBps > 0
										? formatPercent(proposal.quorumBps / 100)
										: 'Not configured'}
								</p>
							</div>
						</div>
						<QuorumIndicator
							quorumBps={proposal.quorumBps}
							totalVotingWeight={voteTotal}
							totalCirculatingSupply={eligibleWeight}
							className="mt-5"
						/>
					</section>
				</div>

				<div className="space-y-6">
					{proposal.status === 'active' ? (
						<ProposalVotePanel proposal={proposal} />
					) : (
						<section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 sm:p-6">
							<div className="flex items-center gap-3">
								<div className="rounded-lg bg-white/10 p-2 text-white/60">
									<CheckCircle2 className="size-4" />
								</div>
								<div>
									<p className="text-sm font-semibold text-white">
										Voting is closed
									</p>
									<p className="mt-1 text-xs text-white/45">
										This proposal is read-only and no longer accepts
										votes.
									</p>
								</div>
							</div>
							{proposal.closedAt && (
								<p className="mt-5 flex items-center gap-2 text-xs text-white/45">
									<Clock3 className="size-3.5" />
									Closed {formatDateTime(proposal.closedAt)}
								</p>
							)}
						</section>
					)}

					<section className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm text-white/55">
						<p className="font-semibold text-white">Voting details</p>
						<div className="mt-3 space-y-2">
							<p className="flex items-center justify-between gap-3">
								<span>Creator keys</span>
								<span className="text-right text-white/80">
									{proposal.creatorAddress ||
										proposal.creatorId ||
										'—'}
								</span>
							</p>
							{proposal.snapshotLedger !== undefined && (
								<p className="flex items-center justify-between gap-3">
									<span>Snapshot ledger</span>
									<span className="text-white/80">
										{proposal.snapshotLedger}
									</span>
								</p>
							)}
						</div>
					</section>
				</div>
			</div>
		</div>
	);
}

export default function ProposalDetailPage() {
	const { proposalId } = useParams<{ proposalId: string }>();
	const proposalQuery = useGovernanceProposal(proposalId);
	useDocumentTitle(proposalQuery.data?.title);

	if (proposalQuery.isLoading) {
		return (
			<div className="flex min-h-[50vh] items-center justify-center">
				<LoaderCircle className="size-8 animate-spin text-amber-300" />
			</div>
		);
	}

	if (proposalQuery.isError || !proposalQuery.data) {
		return (
			<div className="mx-auto max-w-3xl py-12 text-center">
				<h1 className="text-2xl font-bold text-white">
					Proposal not found
				</h1>
				<p className="mt-3 text-sm text-white/55">
					{proposalQuery.error instanceof Error
						? proposalQuery.error.message
						: 'This proposal could not be loaded.'}
				</p>
				<Link
					to="/governance"
					className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-amber-300 hover:text-amber-200"
				>
					<ArrowLeft className="size-4" /> Back to governance
				</Link>
			</div>
		);
	}

	return (
		<div className="mx-auto w-full max-w-6xl">
			<ProposalDetailContent proposal={proposalQuery.data} />
		</div>
import { useParams, Link } from 'react-router';
import { ArrowLeft, CalendarDays, UserRound } from 'lucide-react';
import ProposalOutcomeSummary from '@/components/common/ProposalOutcomeSummary';
import ProposalVoteHistory from '@/components/common/ProposalVoteHistory';
import { useGovernanceProposal } from '@/hooks/useGovernanceProposals';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { cn } from '@/lib/utils';
import { shortenAddress } from '@/lib/web3/format';
import { ApiError } from '@/services/api.service';
import type { ProposalStatus } from '@/types/governance';

const STATUS_CLASSES: Record<ProposalStatus, string> = {
	active: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
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
						</div>
						<h1 className="mt-4 font-jakarta text-3xl font-black tracking-tight text-white sm:text-4xl">
							{proposal.title}
						</h1>
						<div className="mt-5 flex flex-wrap gap-x-6 gap-y-3 text-xs text-white/45">
							<span
								className="inline-flex items-center gap-1.5"
								title={proposal.creatorId}
							>
								<UserRound className="size-3.5" aria-hidden="true" />
								Creator {shortenAddress(proposal.creatorId)}
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
