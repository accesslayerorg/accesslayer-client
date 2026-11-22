import React, { useEffect, useMemo, useState } from 'react';
import { Clock, ArrowLeftRight, CheckCircle, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import {
	useUserAtomicSwapProposals,
	useAcceptAtomicSwapProposal,
	useCancelAtomicSwapProposal,
} from '@/hooks/useAtomicSwap';
import {
	type AtomicSwapProposal,
	canAcceptProposal,
	canCancelProposal,
	formatSwapExpiryCountdown,
	isProposalExpired,
} from '@/types/atomicSwap';
import { formatNumber } from '@/utils/numberFormat.utils';
import { cn } from '@/lib/utils';

export interface PendingSwapsListProps {
	walletAddress: string;
	proposals?: AtomicSwapProposal[];
}

export const PendingSwapsList: React.FC<PendingSwapsListProps> = ({
	walletAddress,
	proposals: externalProposals,
}) => {
	const { data: fetchedProposals = [], isLoading } =
		useUserAtomicSwapProposals(walletAddress);
	const acceptMutation = useAcceptAtomicSwapProposal(walletAddress);
	const cancelMutation = useCancelAtomicSwapProposal(walletAddress);
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const id = window.setInterval(() => {
			setNow(Date.now());
		}, 1000);
		return () => window.clearInterval(id);
	}, []);

	const allProposals = externalProposals ?? fetchedProposals;

	const outgoingProposals = useMemo(
		() =>
			allProposals.filter(
				p =>
					p.proposerAddress.toLowerCase() ===
					walletAddress.toLowerCase()
			),
		[allProposals, walletAddress]
	);

	const incomingProposals = useMemo(
		() =>
			allProposals.filter(
				p =>
					p.proposerAddress.toLowerCase() !==
						walletAddress.toLowerCase() &&
					(!p.counterpartyAddress ||
						p.counterpartyAddress.toLowerCase() ===
							walletAddress.toLowerCase())
			),
		[allProposals, walletAddress]
	);

	const renderSwapCard = (proposal: AtomicSwapProposal) => {
		const expired = isProposalExpired(proposal, now);
		const displayStatus =
			proposal.status === 'pending' && expired
				? 'expired'
				: proposal.status;
		const canAccept = canAcceptProposal(proposal, walletAddress, now);
		const canCancel = canCancelProposal(proposal, walletAddress);
		const countdownText = formatSwapExpiryCountdown(
			proposal.expiresAt,
			now
		);

		return (
			<div
				key={proposal.id}
				data-testid={`swap-card-${proposal.id}`}
				className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 space-y-4"
			>
				<div className="flex flex-wrap items-center justify-between gap-2">
					<div className="flex items-center gap-2 text-sm font-bold text-white">
						<ArrowLeftRight className="size-4 text-amber-400" />
						<span>
							{formatNumber(proposal.offeredAmount)}{' '}
							{proposal.offeredKeyName} ↔{' '}
							{formatNumber(proposal.desiredAmount)}{' '}
							{proposal.desiredKeyName}
						</span>
					</div>

					<div className="flex items-center gap-2">
						<span
							data-testid={`swap-countdown-${proposal.id}`}
							className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 font-mono text-xs text-white/70"
						>
							<Clock className="size-3 text-amber-400" />
							{countdownText}
						</span>
						<span
							data-testid={`swap-status-${proposal.id}`}
							className={cn(
								'rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize',
								displayStatus === 'pending'
									? 'border-amber-400/30 bg-amber-400/10 text-amber-300'
									: displayStatus === 'executed'
										? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
										: 'border-rose-400/30 bg-rose-400/10 text-rose-300'
							)}
						>
							{displayStatus}
						</span>
					</div>
				</div>

				<div className="grid grid-cols-1 gap-2 text-xs text-white/60 sm:grid-cols-2">
					<div>
						<span className="text-white/40">Proposer: </span>
						<span className="font-mono text-white/80">
							{proposal.proposerAddress}
						</span>
					</div>
					{proposal.counterpartyAddress && (
						<div>
							<span className="text-white/40">Counterparty: </span>
							<span className="font-mono text-white/80">
								{proposal.counterpartyAddress}
							</span>
						</div>
					)}
				</div>

				<div className="flex flex-wrap items-center justify-end gap-2 border-t border-white/10 pt-3">
					<Button
						type="button"
						size="sm"
						variant="outline"
						data-testid={`cancel-swap-${proposal.id}`}
						disabled={!canCancel || cancelMutation.isPending}
						onClick={() =>
							cancelMutation.mutate({
								proposalId: proposal.id,
								proposerAddress: walletAddress,
							})
						}
						className="rounded-xl text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
					>
						<StableButtonContent
							isLoading={cancelMutation.isPending}
							loadingLabel="Cancelling…"
						>
							<span className="inline-flex items-center gap-1">
								<XCircle className="size-3.5" />
								Cancel
							</span>
						</StableButtonContent>
					</Button>

					<Button
						type="button"
						size="sm"
						data-testid={`accept-swap-${proposal.id}`}
						disabled={!canAccept || acceptMutation.isPending}
						onClick={() =>
							acceptMutation.mutate({
								proposalId: proposal.id,
								counterpartyAddress: walletAddress,
							})
						}
						className="rounded-xl bg-emerald-500 font-bold text-slate-950 hover:bg-emerald-400"
					>
						<StableButtonContent
							isLoading={acceptMutation.isPending}
							loadingLabel="Accepting…"
						>
							<span className="inline-flex items-center gap-1">
								<CheckCircle className="size-3.5" />
								Accept
							</span>
						</StableButtonContent>
					</Button>
				</div>
			</div>
		);
	};

	if (isLoading && !externalProposals) {
		return (
			<div
				data-testid="pending-swaps-loading"
				className="text-sm text-white/50"
			>
				Loading pending swaps…
			</div>
		);
	}

	return (
		<div className="space-y-6" data-testid="pending-swaps-container">
			<div className="space-y-3" data-testid="outgoing-swaps-list">
				<h3 className="text-xs font-bold uppercase tracking-[0.2em] text-amber-300/80">
					Outgoing Proposals ({outgoingProposals.length})
				</h3>
				{outgoingProposals.length === 0 ? (
					<p
						data-testid="outgoing-swaps-empty"
						className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/50"
					>
						No outgoing swap proposals.
					</p>
				) : (
					<div className="space-y-3">
						{outgoingProposals.map(renderSwapCard)}
					</div>
				)}
			</div>

			<div className="space-y-3" data-testid="incoming-swaps-list">
				<h3 className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-300/80">
					Incoming Proposals ({incomingProposals.length})
				</h3>
				{incomingProposals.length === 0 ? (
					<p
						data-testid="incoming-swaps-empty"
						className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs text-white/50"
					>
						No incoming swap proposals.
					</p>
				) : (
					<div className="space-y-3">
						{incomingProposals.map(renderSwapCard)}
					</div>
				)}
			</div>
		</div>
	);
};

export default PendingSwapsList;
