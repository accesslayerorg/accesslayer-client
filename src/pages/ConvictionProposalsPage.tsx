import { useState } from 'react';
import { Link } from 'react-router';
import {
	Coins,
	ShieldCheck,
	ArrowLeft,
	Zap,
	AlertTriangle,
	CheckCircle,
	Wallet,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ConvictionMeter } from '@/components/governance/ConvictionMeter';
import { AllocateStakeModal } from '@/components/governance/AllocateStakeModal';
import {
	useConviction,
	useConvictionProposals,
} from '@/hooks/useConviction';
import { cn } from '@/lib/utils';
import { shortenAddress } from '@/lib/web3/format';

function ProposalCard({
	proposalId,
	unallocatedBalance,
}: {
	proposalId: string;
	unallocatedBalance: number;
}) {
	const {
		conviction,
		threshold,
		stake,
		proposal,
		projection,
		isThresholdCrossed,
		isExecuted,
		allocateStake,
		withdrawStake,
		executeProposal,
		isMutating,
	} = useConviction(proposalId);

	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isWithdrawing, setIsWithdrawing] = useState(false);

	if (!proposal) return null;

	const handleWithdraw = async () => {
		await withdrawStake();
		setIsWithdrawing(false);
	};

	return (
		<article
			className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 space-y-5 transition-all hover:border-white/20"
			data-testid={`conviction-proposal-card-${proposal.id}`}
		>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="space-y-1.5 flex-1 min-w-[240px]">
					<div className="flex items-center gap-2">
						<span
							className={cn(
								'rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize tracking-wide',
								proposal.status === 'executed'
									? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
									: proposal.status === 'passed' || isThresholdCrossed
										? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
										: 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
							)}
							data-testid="proposal-status-badge"
						>
							{proposal.status}
						</span>
						<span className="font-mono text-xs text-white/40">
							ID: {proposal.id}
						</span>
					</div>
					<h3 className="text-xl font-bold font-jakarta text-white">
						{proposal.title}
					</h3>
					<p className="text-sm text-white/60 line-clamp-2">
						{proposal.description}
					</p>
				</div>

				<div className="text-right sm:min-w-[140px] rounded-xl bg-white/[0.04] p-3 border border-white/5">
					<span className="text-xs text-white/50 block">Requested Amount</span>
					<span
						className="text-lg font-bold font-mono text-white tabular-nums"
						data-testid="proposal-requested-amount"
					>
						{proposal.requestedAmount.toLocaleString()} XLM
					</span>
					{proposal.beneficiary && (
						<span className="text-[11px] text-white/40 block mt-0.5 font-mono">
							to {shortenAddress(proposal.beneficiary)}
						</span>
					)}
				</div>
			</div>

			{/* Conviction Meter */}
			<ConvictionMeter
				conviction={conviction}
				threshold={threshold}
				totalStake={proposal.totalStake}
				alpha={proposal.alpha}
				projection={projection}
			/>

			{/* User Stake Info */}
			<div className="flex flex-wrap items-center justify-between gap-3 text-xs bg-white/[0.02] p-3 rounded-xl border border-white/5">
				<div className="flex items-center gap-4">
					<div>
						<span className="text-white/50 block">Your Allocated Stake</span>
						<span
							className="font-mono font-semibold text-white text-sm tabular-nums"
							data-testid="user-allocated-stake"
						>
							{stake.toLocaleString()} VOTE
						</span>
					</div>
					<div>
						<span className="text-white/50 block">Total Stake on Proposal</span>
						<span
							className="font-mono text-white/80 text-sm tabular-nums"
							data-testid="total-proposal-stake"
						>
							{proposal.totalStake.toLocaleString()} VOTE
						</span>
					</div>
				</div>

				{/* Stake / Withdraw / Execute Actions */}
				<div className="flex flex-wrap items-center gap-2">
					{!isExecuted && (
						<>
							<Button
								type="button"
								variant="outline"
								size="sm"
								onClick={() => setIsModalOpen(true)}
								className="border-white/15 bg-white/5 text-white hover:bg-white/10"
								data-testid="allocate-stake-button"
							>
								{stake > 0 ? 'Adjust Stake' : 'Allocate Stake'}
							</Button>

							{stake > 0 && !isWithdrawing && (
								<Button
									type="button"
									variant="ghost"
									size="sm"
									onClick={() => setIsWithdrawing(true)}
									className="text-white/70 hover:text-white hover:bg-white/10"
									data-testid="init-withdraw-button"
								>
									Withdraw
								</Button>
							)}

							{/* Execute appears ONLY after the threshold is crossed (#acceptance criteria) */}
							{isThresholdCrossed && (
								<Button
									type="button"
									size="sm"
									disabled={isMutating}
									onClick={() => void executeProposal()}
									className="bg-emerald-500 hover:bg-emerald-400 text-black font-semibold gap-1.5"
									data-testid="execute-proposal-button"
								>
									<Zap className="size-3.5 fill-black" />
									{isMutating ? 'Executing…' : 'Execute Proposal'}
								</Button>
							)}
						</>
					)}
				</div>
			</div>

			{/* Withdraw Confirmation with decay notice */}
			{isWithdrawing && (
				<div
					className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2 text-xs"
					data-testid="withdraw-confirmation-panel"
				>
					<div className="flex items-start gap-2 text-amber-300">
						<AlertTriangle className="size-4 shrink-0 mt-0.5" />
						<div>
							<p className="font-semibold">Confirm Stake Withdrawal</p>
							<p className="text-amber-200/80 mt-0.5">
								Withdrawing will reduce your stake on this proposal.
								<strong className="ml-1 text-amber-200 underline">
									Note: Conviction decays gradually over time after stake is withdrawn.
								</strong>
							</p>
						</div>
					</div>
					<div className="flex items-center justify-end gap-2 pt-1">
						<Button
							type="button"
							variant="ghost"
							size="sm"
							onClick={() => setIsWithdrawing(false)}
							className="text-white/60 hover:text-white"
						>
							Cancel
						</Button>
						<Button
							type="button"
							size="sm"
							disabled={isMutating}
							onClick={handleWithdraw}
							className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
							data-testid="confirm-withdraw-button"
						>
							{isMutating ? 'Withdrawing…' : 'Confirm Withdraw'}
						</Button>
					</div>
				</div>
			)}

			{/* Executed Proposals Final Outcome (#acceptance criteria) */}
			{isExecuted && proposal.outcome && (
				<div
					className="rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 space-y-1 text-xs"
					data-testid="proposal-final-outcome"
				>
					<div className="flex items-center gap-2 text-blue-300 font-semibold text-sm">
						<CheckCircle className="size-4" />
						Final Outcome
					</div>
					<p className="text-blue-100/80 leading-relaxed pt-0.5">
						{proposal.outcome}
					</p>
					{proposal.executedAt && (
						<span className="text-[11px] text-blue-300/60 block pt-1 font-mono">
							Executed on {new Date(proposal.executedAt).toLocaleDateString()} at{' '}
							{new Date(proposal.executedAt).toLocaleTimeString()}
						</span>
					)}
				</div>
			)}

			<AllocateStakeModal
				isOpen={isModalOpen}
				onClose={() => setIsModalOpen(false)}
				proposalId={proposal.id}
				proposalTitle={proposal.title}
				currentStake={stake}
				unallocatedBalance={unallocatedBalance}
				onAllocate={async amount => {
					await allocateStake(amount);
				}}
				isPending={isMutating}
			/>
		</article>
	);
}

export default function ConvictionProposalsPage() {
	const { proposals, balances, isLoading } = useConvictionProposals();

	return (
		<main
			className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-6 lg:px-8"
			data-testid="conviction-proposals-page"
		>
			<div className="mx-auto max-w-5xl space-y-8">
				{/* Top nav / breadcrumb */}
				<div className="flex items-center justify-between">
					<Link
						to="/governance"
						className="inline-flex items-center gap-1.5 text-sm text-white/50 hover:text-white transition-colors"
					>
						<ArrowLeft className="size-4" />
						Back to Governance
					</Link>
				</div>

				{/* Header */}
				<header className="space-y-3">
					<div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-400 font-medium">
						<Coins className="size-3.5" />
						Conviction Governance
					</div>
					<h1 className="text-3xl font-black font-jakarta tracking-tight text-white sm:text-4xl">
						Conviction Proposals
					</h1>
					<p className="text-sm text-white/60 max-w-2xl leading-relaxed">
						Proposals can pass by accumulated conviction rather than a one-time
						vote. Allocate your stake across proposals over time. Conviction
						builds continuously until the passing threshold is crossed, and
						decays gradually when stake is withdrawn.
					</p>
				</header>

				{/* User Stake Summary Bar */}
				{balances && (
					<section
						className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl border border-white/10 bg-white/[0.04] p-5"
						data-testid="conviction-balances-summary"
					>
						<div className="space-y-1">
							<span className="text-xs text-white/50 flex items-center gap-1.5">
								<Wallet className="size-3.5 text-white/40" />
								Total Stakeable Balance
							</span>
							<span
								className="text-xl font-bold font-mono text-white tabular-nums block"
								data-testid="summary-total-balance"
							>
								{balances.totalStakeableBalance.toLocaleString()} VOTE
							</span>
						</div>

						<div className="space-y-1">
							<span className="text-xs text-white/50 flex items-center gap-1.5">
								<Coins className="size-3.5 text-amber-400/70" />
								Total Allocated Across Proposals
							</span>
							<span
								className="text-xl font-bold font-mono text-amber-300 tabular-nums block"
								data-testid="summary-allocated-balance"
							>
								{balances.totalAllocatedStake.toLocaleString()} VOTE
							</span>
						</div>

						<div className="space-y-1">
							<span className="text-xs text-white/50 flex items-center gap-1.5">
								<ShieldCheck className="size-3.5 text-cyan-400/70" />
								Unallocated Available Balance
							</span>
							<span
								className="text-xl font-bold font-mono text-cyan-400 tabular-nums block"
								data-testid="summary-unallocated-balance"
							>
								{balances.unallocatedBalance.toLocaleString()} VOTE
							</span>
						</div>
					</section>
				)}

				{/* Loading skeleton */}
				{isLoading && (
					<div className="space-y-4" aria-busy="true">
						<div className="h-44 animate-pulse rounded-2xl bg-white/[0.04] border border-white/5" />
						<div className="h-44 animate-pulse rounded-2xl bg-white/[0.04] border border-white/5" />
					</div>
				)}

				{/* Proposals List */}
				{!isLoading && proposals.length > 0 && (
					<section className="space-y-5" aria-label="Conviction Proposals List">
						{proposals.map(proposal => (
							<ProposalCard
								key={proposal.id}
								proposalId={proposal.id}
								unallocatedBalance={balances?.unallocatedBalance ?? 0}
							/>
						))}
					</section>
				)}

				{!isLoading && proposals.length === 0 && (
					<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-12 text-center">
						<p className="text-white/60">No conviction proposals found.</p>
					</div>
				)}
			</div>
		</main>
	);
}
