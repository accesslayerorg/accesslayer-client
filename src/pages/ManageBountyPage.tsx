import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAccount } from 'wagmi';
import { ArrowLeft, CheckCircle2, ShieldX, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import EmptyState from '@/components/common/EmptyState';
import { cn } from '@/lib/utils';
import {
	useAwardSubmission,
	useBounties,
	useBounty,
	useBountySubmissions,
	useRejectSubmission,
	useReclaimBounty,
} from '@/hooks/useBounties';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import type { BountySubmission } from '@/services/bounty.service';

const CARD =
	'rounded-2xl border border-white/10 bg-white/[0.02] shadow-xl backdrop-blur-md';

export default function ManageBountyPage() {
	useDocumentTitle('Manage bounties — AccessLayer');
	const { id } = useParams<{ id: string }>();
	const { address } = useAccount();
	const wallet = address ?? undefined;

	if (!wallet) {
		return (
			<main
				className="min-h-screen bg-[#06111f] px-4 py-10 text-white"
				data-testid="manage-bounty-page"
			>
				<div className="mx-auto max-w-4xl">
					<h1 className="text-2xl font-black">Manage bounties</h1>
					<p className="mt-2 text-sm text-white/50">
						Connect the creator wallet to review submissions.
					</p>
					<div className="mt-5">
						<ConnectWalletButton />
					</div>
				</div>
			</main>
		);
	}

	return id ? (
		<ManageSingleBounty bountyId={id} wallet={wallet} />
	) : (
		<CreatorBountyList wallet={wallet} />
	);
}

function CreatorBountyList({ wallet }: { wallet: string }) {
	const { data: bounties = [], isLoading } = useBounties({ status: 'all' });
	const mine = bounties.filter(bounty => bounty.creator === wallet);

	return (
		<main
			className="min-h-screen bg-[#06111f] px-4 py-10 text-white"
			data-testid="manage-bounty-page"
		>
			<div className="mx-auto max-w-4xl space-y-6">
				<Link
					to="/bounties"
					className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70"
				>
					<ArrowLeft className="size-4" aria-hidden="true" />
					Back to bounty board
				</Link>
				<header>
					<h1 className="text-3xl font-black">Manage my bounties</h1>
					<p className="mt-2 text-sm text-white/50">
						Review submissions, award winners and reclaim expired rewards.
					</p>
				</header>

				{isLoading && (
					<p className="text-sm text-white/50">Loading bounties…</p>
				)}
				{!isLoading && mine.length === 0 && (
					<EmptyState
						title="No bounties posted"
						message="Post a bounty from the bounty board to start receiving submissions."
						data-testid="manage-bounties-empty"
					/>
				)}
				<div className="space-y-3">
					{mine.map(bounty => (
						<Link
							key={bounty.id}
							to={`/bounties/manage/${bounty.id}`}
							className={cn(
								CARD,
								'flex items-center justify-between gap-4 p-5 hover:border-white/25'
							)}
							data-testid={`manage-bounty-link-${bounty.id}`}
						>
							<div>
								<p className="font-bold">{bounty.title}</p>
								<p className="mt-1 text-xs text-white/40">
									{bounty.keyName}
								</p>
							</div>
							<div className="text-right">
								<p className="font-mono font-bold text-emerald-300">
									{formatDisplayKeyPrice(bounty.rewardStroops)}
								</p>
								<p className="mt-1 text-xs text-white/40">Manage →</p>
							</div>
						</Link>
					))}
				</div>
			</div>
		</main>
	);
}

function ManageSingleBounty({
	bountyId,
	wallet,
}: {
	bountyId: string;
	wallet: string;
}) {
	const { data: bounty } = useBounty(bountyId);
	const { data: submissions = [] } = useBountySubmissions(bountyId);
	const award = useAwardSubmission(wallet);
	const reject = useRejectSubmission(wallet);
	const reclaim = useReclaimBounty(wallet);
	const [reasons, setReasons] = useState<Record<string, string>>({});

	if (!bounty) {
		return (
			<main className="min-h-screen bg-[#06111f] px-4 py-10 text-white">
				<p data-testid="manage-bounty-missing">Bounty not found.</p>
			</main>
		);
	}

	if (bounty.creator !== wallet) {
		return (
			<main className="min-h-screen bg-[#06111f] px-4 py-10 text-white">
				<p data-testid="manage-bounty-forbidden">
					Only the bounty creator can manage these submissions.
				</p>
			</main>
		);
	}

	const awarded = submissions.filter(s => s.status === 'awarded').length;
	const remaining = Math.max(0, bounty.winnersLimit - awarded);
	const expired = new Date(bounty.deadline).getTime() <= Date.now();

	return (
		<main
			className="min-h-screen bg-[#06111f] px-4 py-10 text-white"
			data-testid="manage-bounty-page"
		>
			<div className="mx-auto max-w-4xl space-y-6">
				<Link
					to="/bounties/manage"
					className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70"
				>
					<ArrowLeft className="size-4" aria-hidden="true" />
					All my bounties
				</Link>

				<header className={cn(CARD, 'p-6')}>
					<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/80">
						{bounty.keyName}
					</p>
					<h1 className="mt-1 text-2xl font-black">{bounty.title}</h1>
					<p className="mt-2 text-sm text-white/50">
						{bounty.description}
					</p>
					<div className="mt-4 flex flex-wrap items-center gap-4 text-sm">
						<span className="font-mono font-bold text-emerald-300">
							{formatDisplayKeyPrice(bounty.rewardStroops)} per winner
						</span>
						<span className="flex items-center gap-1 text-white/60">
							<Trophy
								className="size-4 text-amber-400"
								aria-hidden="true"
							/>
							<span data-testid="manage-bounty-remaining">
								{remaining}
							</span>{' '}
							of {bounty.winnersLimit} winners remaining
						</span>
					</div>
					{expired && bounty.status === 'open' && (
						<Button
							variant="outline"
							className="mt-4 border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
							onClick={() => void reclaim.mutateAsync(bounty.id)}
							disabled={reclaim.isPending}
							data-testid="manage-bounty-reclaim"
						>
							{reclaim.isPending
								? 'Reclaiming…'
								: 'Reclaim unpaid rewards'}
						</Button>
					)}
				</header>

				<section data-testid="bounty-submissions-list">
					<h2 className="mb-3 text-lg font-bold">Submissions</h2>
					{submissions.length === 0 && (
						<p
							className="text-sm text-white/45"
							data-testid="bounty-submissions-empty"
						>
							No work has been submitted yet.
						</p>
					)}
					<div className="space-y-3">
						{submissions.map(submission => (
							<SubmissionRow
								key={submission.id}
								submission={submission}
								remaining={remaining}
								reason={reasons[submission.id] ?? ''}
								onReasonChange={value =>
									setReasons(current => ({
										...current,
										[submission.id]: value,
									}))
								}
								onAward={() => void award.mutateAsync(submission.id)}
								onReject={() =>
									void reject.mutateAsync({
										submissionId: submission.id,
										reason: reasons[submission.id],
									})
								}
								isAwarding={award.isPending}
								isRejecting={reject.isPending}
							/>
						))}
					</div>
				</section>
			</div>
		</main>
	);
}

function SubmissionRow({
	submission,
	remaining,
	reason,
	onReasonChange,
	onAward,
	onReject,
	isAwarding,
	isRejecting,
}: {
	submission: BountySubmission;
	remaining: number;
	reason: string;
	onReasonChange: (value: string) => void;
	onAward: () => void;
	onReject: () => void;
	isAwarding: boolean;
	isRejecting: boolean;
}) {
	const canReview = submission.status === 'pending';
	const canAward = canReview && remaining > 0;

	return (
		<article
			className={cn(CARD, 'space-y-3 p-5')}
			data-testid={`bounty-submission-${submission.id}`}
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-xs text-white/40">Worker</p>
					<p className="truncate font-mono text-sm text-white/80">
						{submission.worker}
					</p>
				</div>
				<span
					className={cn(
						'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
						submission.status === 'awarded'
							? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
							: submission.status === 'rejected'
								? 'border-rose-500/30 bg-rose-500/10 text-rose-300'
								: 'border-amber-500/30 bg-amber-500/10 text-amber-300'
					)}
				>
					{submission.status}
				</span>
			</div>
			<p className="text-sm text-white/70">{submission.description}</p>
			<a
				href={submission.link}
				target="_blank"
				rel="noreferrer"
				className="block truncate text-xs text-amber-300 hover:underline"
			>
				{submission.link}
			</a>
			<p className="font-mono text-[10px] text-white/35">
				Proof {submission.proofHash.slice(0, 18)}…
			</p>
			{submission.status === 'rejected' && (
				<p
					className="text-xs text-white/50"
					data-testid={`bounty-resubmission-${submission.id}`}
				>
					{submission.resubmissionAllowed
						? 'One resubmission available to the worker.'
						: submission.resubmissionUsed
							? 'Worker used their one resubmission.'
							: 'No resubmission available.'}
				</p>
			)}

			{canReview && (
				<div className="flex flex-wrap items-center gap-2 border-t border-white/5 pt-3">
					<Input
						placeholder="Rejection reason (optional)"
						value={reason}
						onChange={event => onReasonChange(event.target.value)}
						className="h-8 max-w-xs text-xs"
						aria-label="Rejection reason"
						data-testid={`bounty-reject-reason-${submission.id}`}
					/>
					<Button
						size="sm"
						variant="outline"
						onClick={onReject}
						disabled={isRejecting}
						className="border-rose-500/40 text-rose-300 hover:bg-rose-500/10"
						data-testid={`bounty-reject-${submission.id}`}
					>
						<ShieldX className="size-3.5" aria-hidden="true" />
						Reject
					</Button>
					<Button
						size="sm"
						onClick={onAward}
						disabled={!canAward || isAwarding}
						className="bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
						data-testid={`bounty-award-${submission.id}`}
					>
						<CheckCircle2 className="size-3.5" aria-hidden="true" />
						Award
					</Button>
					{!canAward && (
						<span className="text-xs text-white/40">
							Winner limit reached
						</span>
					)}
				</div>
			)}
		</article>
	);
}
