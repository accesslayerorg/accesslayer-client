import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { useAccount } from 'wagmi';
import { ArrowLeft, Filter, Trophy } from 'lucide-react';
import BountyCard from '@/components/bounties/BountyCard';
import PostBountyForm from '@/components/bounties/PostBountyForm';
import SubmitWorkModal from '@/components/bounties/SubmitWorkModal';
import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import EmptyState from '@/components/common/EmptyState';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	useBounties,
	useBountyEligibility,
	useBountySubmissions,
	useCreateBounty,
	useReclaimBounty,
	useSubmitWork,
} from '@/hooks/useBounties';
import { useNowMs } from '@/hooks/useNowMs';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useWalletHoldings } from '@/hooks/useWallet';
import type { Bounty, BountyFilters } from '@/services/bounty.service';

function BountyCardContainer({
	bounty,
	nowMs,
	wallet,
	onSubmit,
	onReclaim,
	isReclaiming,
}: {
	bounty: Bounty;
	nowMs: number;
	wallet?: string;
	onSubmit: (bounty: Bounty) => void;
	onReclaim: (bounty: Bounty) => void;
	isReclaiming: boolean;
}) {
	const { data: submissions = [] } = useBountySubmissions(bounty.id);
	const eligibility = useBountyEligibility(bounty, wallet);
	const awardedCount = submissions.filter(s => s.status === 'awarded').length;
	const remaining = Math.max(0, bounty.winnersLimit - awardedCount);
	const isCreator = Boolean(wallet && wallet === bounty.creator);

	return (
		<BountyCard
			bounty={bounty}
			nowMs={nowMs}
			awardedCount={awardedCount}
			remainingWinners={remaining}
			isCreator={isCreator}
			canSubmit={Boolean(wallet) && eligibility.isEligible && remaining > 0}
			eligibilityReason={eligibility.reason}
			onSubmit={onSubmit}
			onReclaim={onReclaim}
			isReclaiming={isReclaiming}
		/>
	);
}

export default function BountyBoardPage() {
	useDocumentTitle('Bounties — AccessLayer');
	const { address } = useAccount();
	const wallet = address ?? undefined;
	const nowMs = useNowMs();

	const [filters, setFilters] = useState<BountyFilters>({
		key: 'all',
		status: 'active',
		minReward: undefined,
		maxReward: undefined,
	});
	const [submitTarget, setSubmitTarget] = useState<Bounty | null>(null);

	const { data: bounties = [], isLoading } = useBounties(filters);
	const { data: holdings = [] } = useWalletHoldings(wallet ?? '');
	const createBounty = useCreateBounty(wallet);
	const submitWork = useSubmitWork();
	const reclaim = useReclaimBounty(wallet);

	const keys = useMemo(
		() =>
			Array.from(
				new Map(
					holdings.map(holding => [
						holding.creatorId,
						{ id: holding.creatorId, name: holding.creatorId },
					])
				).values()
			),
		[holdings]
	);

	return (
		<main
			className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-6 lg:px-8"
			data-testid="bounty-board-page"
		>
			<div className="mx-auto max-w-6xl space-y-8">
				<Link
					to="/"
					className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70"
				>
					<ArrowLeft className="size-4" aria-hidden="true" />
					Back to marketplace
				</Link>

				<header className="flex flex-wrap items-end justify-between gap-4">
					<div>
						<p className="font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400/80">
							Creator bounties
						</p>
						<h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
							Bounty board
						</h1>
						<p className="mt-2 max-w-xl text-sm text-white/50">
							Discover escrowed work, submit proof, and track how many
							winner slots remain.
						</p>
					</div>
					<Link
						to="/bounties/manage"
						className="text-sm font-semibold text-amber-300 hover:text-amber-200"
					>
						Manage my bounties →
					</Link>
				</header>

				<section
					className="rounded-2xl border border-white/10 bg-white/[0.02] p-4"
					aria-label="Bounty filters"
					data-testid="bounty-filters"
				>
					<div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-white/40">
						<Filter className="size-3.5" aria-hidden="true" /> Filters
					</div>
					<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
						<div className="space-y-1.5">
							<Label htmlFor="bounty-filter-key">Key</Label>
							<select
								id="bounty-filter-key"
								value={filters.key ?? 'all'}
								onChange={event =>
									setFilters(current => ({
										...current,
										key: event.target.value,
									}))
								}
								className="flex h-9 w-full rounded-md border border-white/15 bg-[#0b1728] px-3 text-sm text-white"
								data-testid="bounty-filter-key"
							>
								<option value="all">All keys</option>
								{keys.map(key => (
									<option key={key.id} value={key.id}>
										{key.name}
									</option>
								))}
							</select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="bounty-filter-status">Status</Label>
							<select
								id="bounty-filter-status"
								value={filters.status ?? 'active'}
								onChange={event =>
									setFilters(current => ({
										...current,
										status: event.target
											.value as BountyFilters['status'],
									}))
								}
								className="flex h-9 w-full rounded-md border border-white/15 bg-[#0b1728] px-3 text-sm text-white"
								data-testid="bounty-filter-status"
							>
								<option value="active">Open</option>
								<option value="all">All</option>
								<option value="awarded">Awarded</option>
								<option value="reclaimed">Reclaimed</option>
							</select>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="bounty-filter-min">Min reward (XLM)</Label>
							<Input
								id="bounty-filter-min"
								type="number"
								min="0"
								placeholder="0"
								onChange={event =>
									setFilters(current => ({
										...current,
										minReward: event.target.value
											? Number(event.target.value) * 10_000_000
											: undefined,
									}))
								}
								data-testid="bounty-filter-min-reward"
							/>
						</div>
						<div className="space-y-1.5">
							<Label htmlFor="bounty-filter-max">Max reward (XLM)</Label>
							<Input
								id="bounty-filter-max"
								type="number"
								min="0"
								placeholder="Any"
								onChange={event =>
									setFilters(current => ({
										...current,
										maxReward: event.target.value
											? Number(event.target.value) * 10_000_000
											: undefined,
									}))
								}
								data-testid="bounty-filter-max-reward"
							/>
						</div>
					</div>
				</section>

				<div className="grid gap-8 lg:grid-cols-[1fr_340px]">
					<section data-testid="bounty-list">
						<div className="mb-4 flex items-center justify-between">
							<h2 className="flex items-center gap-2 text-lg font-bold">
								<Trophy
									className="size-4 text-amber-400"
									aria-hidden="true"
								/>
								Open bounties
							</h2>
							<span className="text-xs text-white/40">
								{bounties.length} result
								{bounties.length === 1 ? '' : 's'}
							</span>
						</div>

						{isLoading && (
							<p className="text-sm text-white/50" role="status">
								Loading bounties…
							</p>
						)}

						{!isLoading && bounties.length === 0 && (
							<EmptyState
								title="No bounties match these filters"
								message="Try widening the reward range or clearing the key and status filters."
								data-testid="bounties-empty"
							/>
						)}

						<div className="space-y-4">
							{bounties.map(bounty => (
								<BountyCardContainer
									key={bounty.id}
									bounty={bounty}
									nowMs={nowMs}
									wallet={wallet}
									onSubmit={setSubmitTarget}
									onReclaim={target =>
										void reclaim.mutateAsync(target.id)
									}
									isReclaiming={reclaim.isPending}
								/>
							))}
						</div>
					</section>

					<aside>
						{wallet ? (
							<PostBountyForm
								keys={keys}
								onSubmit={input => void createBounty.mutateAsync(input)}
								isSubmitting={createBounty.isPending}
							/>
						) : (
							<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
								<p className="text-sm text-white/60">
									Connect a wallet to post a bounty or submit work.
								</p>
								<div className="mt-4">
									<ConnectWalletButton />
								</div>
							</div>
						)}
					</aside>
				</div>
			</div>

			{submitTarget && (
				<SubmitWorkModalWrapper
					bounty={submitTarget}
					wallet={wallet}
					onClose={() => setSubmitTarget(null)}
					onSubmit={(values, isHolder) => {
						void submitWork.mutateAsync({
							bountyId: submitTarget.id,
							worker: wallet ?? '',
							isHolder,
							...values,
						});
						setSubmitTarget(null);
					}}
					isSubmitting={submitWork.isPending}
				/>
			)}
		</main>
	);
}

function SubmitWorkModalWrapper({
	bounty,
	wallet,
	onClose,
	onSubmit,
	isSubmitting,
}: {
	bounty: Bounty;
	wallet?: string;
	onClose: () => void;
	onSubmit: (
		values: { link: string; description: string; proofHash: string },
		isHolder: boolean
	) => void;
	isSubmitting: boolean;
}) {
	const { data: submissions = [] } = useBountySubmissions(bounty.id);
	const eligibility = useBountyEligibility(bounty, wallet);
	const existing = submissions.find(s => s.worker === wallet);

	return (
		<SubmitWorkModal
			open
			onOpenChange={open => !open && onClose()}
			bounty={bounty}
			wallet={wallet}
			eligibilityReason={eligibility.reason}
			existingSubmission={existing}
			isSubmitting={isSubmitting}
			onSubmit={values => onSubmit(values, eligibility.isHolder)}
		/>
	);
}
