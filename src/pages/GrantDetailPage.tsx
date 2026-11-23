import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useAccount } from 'wagmi';
import {
	ArrowLeft,
	Check,
	Clock3,
	FileCheck2,
	Link2,
	LockKeyhole,
	Undo2,
} from 'lucide-react';
import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import SubmitEvidenceModal from '@/components/grants/SubmitEvidenceModal';
import type { EvidenceValues } from '@/components/grants/SubmitEvidenceModal';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import {
	useGrant,
	useReviewMilestone,
	useSubmitEvidence,
} from '@/hooks/useGrants';
import { cn } from '@/lib/utils';
import type { GrantMilestone } from '@/services/grants.service';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { shortenAddress } from '@/lib/web3/format';

const CARD =
	'rounded-2xl border border-white/10 bg-white/[0.02] shadow-xl backdrop-blur-md';

const STATE_STYLES: Record<GrantMilestone['state'], string> = {
	pending: 'border-white/15 bg-white/5 text-white/55',
	submitted: 'border-amber-500/30 bg-amber-500/10 text-amber-200',
	approved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
	rejected: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
};

export default function GrantDetailPage() {
	const { grantId } = useParams<{ grantId: string }>();
	useDocumentTitle('Grant tracker — AccessLayer');
	const { address } = useAccount();
	const wallet = address ?? undefined;
	const grantQuery = useGrant(grantId);
	const submitEvidence = useSubmitEvidence();
	const review = useReviewMilestone();
	const [evidenceTarget, setEvidenceTarget] = useState<GrantMilestone | null>(
		null
	);
	const [rejectionTarget, setRejectionTarget] =
		useState<GrantMilestone | null>(null);
	const [rejectionReason, setRejectionReason] = useState('');

	const grant = grantQuery.data;

	if (grantQuery.isLoading) {
		return (
			<main className="min-h-screen bg-[#06111f] px-4 py-8 text-white">
				<p role="status" className="text-sm text-white/50">
					Loading grant…
				</p>
			</main>
		);
	}

	if (!grant) {
		return (
			<main className="min-h-screen bg-[#06111f] px-4 py-8 text-white">
				<EmptyState
					title="Grant not found"
					message="This grant may have been removed or the link is incorrect."
					ctaLabel="Back to grants"
					ctaHref="/treasury/grants"
				/>
			</main>
		);
	}

	const isRecipient = Boolean(wallet && wallet === grant.recipient);
	const isReviewer = Boolean(wallet && wallet === grant.reviewer);
	const remaining = Math.max(0, grant.totalStroops - grant.releasedStroops);

	const handleSubmitEvidence = (values: EvidenceValues) => {
		if (!evidenceTarget || !wallet) return;
		submitEvidence.mutate({
			milestoneId: evidenceTarget.id,
			wallet,
			...values,
		});
		setEvidenceTarget(null);
	};

	const handleReject = (target: GrantMilestone) => {
		if (!wallet || !rejectionReason.trim()) return;
		review.mutate({
			grantId: grant.id,
			milestoneId: target.id,
			wallet,
			decision: 'reject',
			reason: rejectionReason,
		});
		setRejectionTarget(null);
		setRejectionReason('');
	};

	return (
		<main
			className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-6 lg:px-8"
			data-testid="grant-detail-page"
		>
			<div className="mx-auto max-w-5xl space-y-8">
				<Link
					to="/treasury/grants"
					className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70"
				>
					<ArrowLeft className="size-4" aria-hidden="true" />
					All grants
				</Link>

				<header className={cn(CARD, 'p-6')}>
					<div className="flex flex-wrap items-start justify-between gap-4">
						<div className="min-w-0">
							<p className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-400/80">
								{grant.keyName} · {grant.status}
							</p>
							<h1 className="mt-1 text-2xl font-black tracking-tight sm:text-3xl">
								{grant.title}
							</h1>
							<p className="mt-2 max-w-2xl text-sm text-white/50">
								{grant.summary}
							</p>
						</div>
						<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 font-mono text-xs text-white/70">
							{shortenAddress(grant.id)}
						</span>
					</div>

					<div className="mt-6 grid gap-4 sm:grid-cols-3">
						{[
							['Funded', grant.totalStroops, 'text-white'],
							['Released', grant.releasedStroops, 'text-emerald-300'],
							['Remaining', remaining, 'text-amber-300'],
						].map(([label, value, tone]) => (
							<div
								key={String(label)}
								className="rounded-xl border border-white/5 bg-black/20 p-4"
							>
								<p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
									{label}
								</p>
								<p
									className={cn(
										'mt-1 font-mono text-lg font-bold',
										tone
									)}
								>
									{formatDisplayKeyPrice(Number(value))}
								</p>
							</div>
						))}
					</div>

					<div className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-white/40">
						<span>Recipient: {shortenAddress(grant.recipient)}</span>
						<span>Reviewer: {shortenAddress(grant.reviewer)}</span>
					</div>

					{!wallet && (
						<div className="mt-4 flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
							<LockKeyhole
								className="size-4 shrink-0 text-amber-300"
								aria-hidden="true"
							/>
							<p className="flex-1 text-xs text-amber-100/80">
								Connect the recipient or reviewer wallet to act on
								milestones.
							</p>
							<ConnectWalletButton />
						</div>
					)}
					{wallet && !isRecipient && !isReviewer && (
						<p className="mt-4 text-xs text-white/35">
							You are viewing this grant as an observer. Only the
							recipient and reviewer can change milestone state.
						</p>
					)}
				</header>

				<section className="space-y-4" data-testid="grant-milestones">
					<div className="flex items-center justify-between">
						<h2 className="text-lg font-bold">Milestones</h2>
						<span className="text-xs text-white/35">
							{
								grant.milestones.filter(m => m.state === 'approved')
									.length
							}{' '}
							of {grant.milestones.length} released
						</span>
					</div>

					{grant.milestones.map(milestone => (
						<article
							key={milestone.id}
							className={cn(CARD, 'p-5')}
							data-testid={`milestone-${milestone.id}`}
						>
							<div className="flex flex-wrap items-center justify-between gap-3">
								<div>
									<p className="text-[10px] font-bold uppercase tracking-wider text-white/35">
										Milestone {milestone.index + 1}
									</p>
									<h3 className="mt-0.5 text-base font-bold">
										{milestone.title}
									</h3>
								</div>
								<div className="flex items-center gap-2">
									<span className="font-mono text-sm font-bold text-white/80">
										{formatDisplayKeyPrice(milestone.amountStroops)}
									</span>
									<span
										className={cn(
											'rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
											STATE_STYLES[milestone.state]
										)}
										data-testid={`milestone-state-${milestone.id}`}
									>
										{milestone.state}
									</span>
								</div>
							</div>

							{milestone.rejectionReason && (
								<p
									className="mt-3 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-200"
									data-testid={`milestone-rejection-${milestone.id}`}
								>
									Changes requested: {milestone.rejectionReason}
								</p>
							)}

							{milestone.evidence && (
								<div
									className="mt-4 space-y-1.5 rounded-xl border border-white/5 bg-black/20 p-3 text-xs"
									data-testid={`milestone-evidence-${milestone.id}`}
								>
									{milestone.evidence.description && (
										<p className="text-white/60">
											{milestone.evidence.description}
										</p>
									)}
									{milestone.evidence.link && (
										<a
											href={milestone.evidence.link}
											target="_blank"
											rel="noreferrer"
											className="inline-flex items-center gap-1 text-sky-300 hover:text-sky-200"
										>
											<Link2 className="size-3" aria-hidden="true" />
											View submitted work
										</a>
									)}
									<p className="flex items-center gap-1 font-mono text-[10px] text-white/30">
										<FileCheck2
											className="size-3"
											aria-hidden="true"
										/>
										{milestone.evidence.fileHash}
									</p>
								</div>
							)}

							<div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
								{isRecipient &&
									grant.status === 'active' &&
									(milestone.state === 'pending' ||
										milestone.state === 'rejected') && (
										<Button
											size="sm"
											onClick={() => setEvidenceTarget(milestone)}
											className="bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400"
											data-testid={`submit-evidence-${milestone.id}`}
										>
											{milestone.state === 'rejected'
												? 'Resubmit evidence'
												: 'Submit evidence'}
										</Button>
									)}
								{isReviewer &&
									grant.status === 'active' &&
									milestone.state === 'submitted' && (
										<>
											<Button
												size="sm"
												disabled={review.isPending}
												onClick={() =>
													review.mutate({
														grantId: grant.id,
														milestoneId: milestone.id,
														wallet: wallet!,
														decision: 'approve',
													})
												}
												className="bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400"
												data-testid={`approve-milestone-${milestone.id}`}
											>
												<Check
													className="mr-1 size-3.5"
													aria-hidden="true"
												/>
												Approve & release
											</Button>
											<Button
												size="sm"
												variant="outline"
												disabled={review.isPending}
												onClick={() => {
													setRejectionTarget(milestone);
													setRejectionReason('');
												}}
												className="border-rose-500/30 text-rose-200 hover:bg-rose-500/10"
												data-testid={`reject-milestone-${milestone.id}`}
											>
												<Undo2
													className="mr-1 size-3.5"
													aria-hidden="true"
												/>
												Request changes
											</Button>
										</>
									)}
								{milestone.state === 'approved' && (
									<p className="flex items-center gap-1 text-xs text-emerald-300/70">
										<Clock3 className="size-3.5" aria-hidden="true" />
										Funds released to recipient
									</p>
								)}
							</div>

							{rejectionTarget?.id === milestone.id && (
								<div className="mt-4 space-y-3 rounded-xl border border-rose-500/20 bg-rose-500/[0.04] p-3">
									<div className="space-y-1.5">
										<Label htmlFor={`reject-reason-${milestone.id}`}>
											Reason for returning this milestone
										</Label>
										<Textarea
											id={`reject-reason-${milestone.id}`}
											rows={2}
											value={rejectionReason}
											onChange={event =>
												setRejectionReason(event.target.value)
											}
											placeholder="Describe what needs to change"
											data-testid={`reject-reason-${milestone.id}`}
										/>
									</div>
									<div className="flex gap-2">
										<Button
											size="sm"
											variant="ghost"
											onClick={() => setRejectionTarget(null)}
										>
											Cancel
										</Button>
										<Button
											size="sm"
											disabled={
												!rejectionReason.trim() || review.isPending
											}
											onClick={() => handleReject(milestone)}
											className="bg-rose-500 font-semibold text-white hover:bg-rose-400"
											data-testid={`confirm-reject-${milestone.id}`}
										>
											Confirm rejection
										</Button>
									</div>
								</div>
							)}
						</article>
					))}
				</section>

				<section
					className={cn(CARD, 'p-5')}
					data-testid="grant-release-timeline"
				>
					<h2 className="text-lg font-bold">Release history</h2>
					{grant.releases.length === 0 ? (
						<p className="mt-3 text-sm text-white/40">
							No funds have been released yet.
						</p>
					) : (
						<ol className="mt-4 space-y-3 border-l border-white/10 pl-5">
							{grant.releases.map(release => (
								<li key={release.id} className="relative">
									<span
										className="absolute top-1.5 -left-[1.55rem] size-2 rounded-full bg-emerald-400"
										aria-hidden="true"
									/>
									<p className="text-sm font-semibold text-white/85">
										{release.title}
									</p>
									<p className="text-xs text-white/40">
										{formatDisplayKeyPrice(release.amountStroops)} ·{' '}
										{new Date(
											release.releasedAt
										).toLocaleDateString()}
									</p>
								</li>
							))}
						</ol>
					)}
					{grant.status === 'cancelled' && (
						<p className="mt-4 rounded-lg border border-rose-500/25 bg-rose-500/[0.06] px-3 py-2 text-xs text-rose-200">
							Grant cancelled —{' '}
							{formatDisplayKeyPrice(grant.returnedAmountStroops ?? 0)}{' '}
							returned to treasury.
						</p>
					)}
				</section>
			</div>

			{evidenceTarget && (
				<SubmitEvidenceModal
					open={Boolean(evidenceTarget)}
					onOpenChange={open => !open && setEvidenceTarget(null)}
					milestoneTitle={evidenceTarget.title}
					isSubmitting={submitEvidence.isPending}
					onSubmit={handleSubmitEvidence}
				/>
			)}
		</main>
	);
}
