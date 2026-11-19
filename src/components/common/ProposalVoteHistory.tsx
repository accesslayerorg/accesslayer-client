import { useMemo } from 'react';
import { AlertCircle, Minus, ThumbsDown, ThumbsUp } from 'lucide-react';
import { useAccount } from 'wagmi';
import { Button } from '@/components/ui/button';
import { useGovernanceProposalVotes } from '@/hooks/useGovernanceProposals';
import { cn } from '@/lib/utils';
import type { Vote } from '@/types/governance';
import { formatAbsoluteDateTime, formatRelativeTime } from '@/utils/time.utils';
import { formatNumber } from '@/utils/numberFormat.utils';

interface ProposalVoteHistoryProps {
	proposalId: string;
}

const DIRECTION_PRESENTATION = {
	for: {
		label: 'For',
		icon: ThumbsUp,
		className: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
	},
	against: {
		label: 'Against',
		icon: ThumbsDown,
		className: 'border-red-500/25 bg-red-500/10 text-red-400',
	},
	abstain: {
		label: 'Abstain',
		icon: Minus,
		className: 'border-white/10 bg-white/[0.05] text-white/55',
	},
} as const;

function getVoteKey(vote: Vote): string {
	return (
		vote.id ??
		`${vote.voter.toLowerCase()}:${vote.timestamp}:${vote.direction}`
	);
}

function VoteHistorySkeleton() {
	return (
		<div
			className="space-y-2"
			aria-label="Loading vote history"
			aria-busy="true"
		>
			{Array.from({ length: 4 }).map((_, index) => (
				<div
					key={index}
					className="h-16 animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.03]"
				/>
			))}
		</div>
	);
}

function DirectionBadge({ direction }: { direction: Vote['direction'] }) {
	const presentation = DIRECTION_PRESENTATION[direction];
	const Icon = presentation.icon;

	return (
		<span
			className={cn(
				'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold capitalize',
				presentation.className
			)}
		>
			<Icon className="size-3" aria-hidden="true" />
			{presentation.label}
		</span>
	);
}

export default function ProposalVoteHistory({
	proposalId,
}: ProposalVoteHistoryProps) {
	const { address } = useAccount();
	const {
		data,
		fetchNextPage,
		hasNextPage,
		isError,
		isFetchNextPageError,
		isFetchingNextPage,
		isLoading,
		refetch,
	} = useGovernanceProposalVotes(proposalId);

	const votes = useMemo(() => {
		const seen = new Set<string>();
		const flattenedVotes: Vote[] = [];

		for (const page of data?.pages ?? []) {
			for (const vote of page.votes) {
				const key = getVoteKey(vote);
				if (seen.has(key)) continue;
				seen.add(key);
				flattenedVotes.push(vote);
			}
		}

		return flattenedVotes;
	}, [data]);

	if (isLoading) return <VoteHistorySkeleton />;

	if (isError) {
		return (
			<div
				role="alert"
				className="rounded-2xl border border-red-500/25 bg-red-500/[0.07] p-6 text-center"
			>
				<AlertCircle
					className="mx-auto size-6 text-red-400"
					aria-hidden="true"
				/>
				<p className="mt-3 text-sm font-semibold text-white/80">
					Unable to load vote history
				</p>
				<p className="mt-1 text-xs text-white/45">
					The votes may be temporarily unavailable.
				</p>
				<Button
					type="button"
					variant="outline"
					onClick={() => void refetch()}
					className="mt-4 border-white/15 bg-white/[0.04] text-white/75 hover:bg-white/[0.08] hover:text-white"
				>
					Try again
				</Button>
			</div>
		);
	}

	if (votes.length === 0) {
		return (
			<div
				role="status"
				className="rounded-2xl border border-dashed border-white/10 px-6 py-10 text-center"
			>
				<p className="text-sm font-semibold text-white/65">No votes yet</p>
				<p className="mt-1 text-xs text-white/40">
					Votes will appear here as eligible wallets participate.
				</p>
			</div>
		);
	}

	return (
		<section aria-label="Vote history">
			<div className="mb-3 flex items-center justify-between gap-3">
				<p className="text-xs text-white/40" aria-live="polite">
					Showing {formatNumber(votes.length)} vote
					{votes.length === 1 ? '' : 's'}
				</p>
				{address && (
					<p className="text-xs text-amber-400/70">
						Your vote is highlighted
					</p>
				)}
			</div>

			<div className="overflow-x-auto rounded-2xl border border-white/[0.08]">
				<table className="w-full min-w-[680px] border-collapse text-left">
					<caption className="sr-only">
						All votes cast on this proposal
					</caption>
					<thead className="border-b border-white/[0.08] bg-white/[0.025] text-[10px] font-bold uppercase tracking-[0.16em] text-white/35">
						<tr>
							<th scope="col" className="px-4 py-3 font-bold">
								Voter wallet
							</th>
							<th scope="col" className="px-4 py-3 font-bold">
								Direction
							</th>
							<th scope="col" className="px-4 py-3 text-right font-bold">
								Weight
							</th>
							<th scope="col" className="px-4 py-3 text-right font-bold">
								Cast
							</th>
						</tr>
					</thead>
					<tbody className="divide-y divide-white/[0.06]">
						{votes.map(vote => {
							const isOwnVote = Boolean(
								address &&
								vote.voter.toLowerCase() === address.toLowerCase()
							);
							const absoluteTime = formatAbsoluteDateTime(
								vote.timestamp
							);
							const relativeTime = formatRelativeTime(vote.timestamp);

							return (
								<tr
									key={getVoteKey(vote)}
									data-testid="proposal-vote-row"
									data-own-vote={isOwnVote ? 'true' : undefined}
									aria-label={
										isOwnVote
											? `Your vote: ${DIRECTION_PRESENTATION[vote.direction].label}, weight ${vote.weight}`
											: undefined
									}
									className={cn(
										'transition-colors hover:bg-white/[0.035]',
										isOwnVote &&
											'bg-amber-400/[0.09] shadow-[inset_3px_0_0_#fbbf24] hover:bg-amber-400/[0.12]'
									)}
								>
									<td className="px-4 py-3.5">
										<div className="flex items-center gap-2">
											<span
												className="max-w-[320px] break-all font-mono text-xs text-white/75"
												title={vote.voter}
											>
												{vote.voter}
											</span>
											{isOwnVote && (
												<span className="shrink-0 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300">
													Your vote
												</span>
											)}
										</div>
									</td>
									<td className="px-4 py-3.5">
										<DirectionBadge direction={vote.direction} />
									</td>
									<td className="px-4 py-3.5 text-right font-mono text-sm font-semibold tabular-nums text-white/85">
										{formatNumber(vote.weight, {
											maximumFractionDigits: 4,
										})}
									</td>
									<td
										className="px-4 py-3.5 text-right font-mono text-xs text-white/40"
										title={absoluteTime ?? undefined}
									>
										{relativeTime}
									</td>
								</tr>
							);
						})}
					</tbody>
				</table>
			</div>

			{isFetchNextPageError && (
				<p role="alert" className="mt-3 text-center text-xs text-red-400">
					Additional votes could not be loaded. Please try again.
				</p>
			)}

			{hasNextPage && (
				<div className="mt-5 flex justify-center">
					<Button
						type="button"
						variant="outline"
						onClick={() => void fetchNextPage()}
						disabled={isFetchingNextPage}
						className="rounded-xl border-white/15 bg-white/[0.04] px-7 text-white/75 hover:bg-white/[0.08] hover:text-white"
					>
						{isFetchingNextPage ? 'Loading votes…' : 'Load more votes'}
					</Button>
				</div>
			)}
		</section>
	);
}
