import { useState } from 'react';
import {
	Check,
	Clock3,
	LoaderCircle,
	LockKeyhole,
	WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import {
	useCastProposalVote,
	useProposalSnapshotWeight,
} from '@/hooks/useGovernanceProposals';
import { useStellarWallet } from '@/hooks/useStellarWallet';
import { GovernanceContractError } from '@/services/governanceContract.service';
import type { Proposal } from '@/types/governance';
import {
	getProposalOptions,
	getProposalVoteTotal,
} from '@/utils/governance.utils';
import { formatCompactNumber } from '@/utils/numberFormat.utils';
import { shortenAddress } from '@/lib/web3/format';

export function ProposalVotePanel({ proposal }: { proposal: Proposal }) {
	const [selectedOptionIndex, setSelectedOptionIndex] = useState<number>();
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	const {
		address,
		isConnected,
		loading: walletLoading,
		activeSigner,
	} = useStellarWallet();
	const snapshotQuery = useProposalSnapshotWeight(proposal, address);
	const voteMutation = useCastProposalVote({
		proposal,
		voter: address,
		signer: activeSigner,
	});
	const options = getProposalOptions(proposal);
	const selectedOption =
		selectedOptionIndex === undefined
			? undefined
			: options[selectedOptionIndex];
	const snapshotWeight = snapshotQuery.data?.weight ?? null;
	const canReview =
		isConnected &&
		Boolean(activeSigner) &&
		!walletLoading &&
		!snapshotQuery.isFetching &&
		!snapshotQuery.isError &&
		snapshotWeight !== null &&
		snapshotWeight > 0 &&
		selectedOptionIndex !== undefined &&
		!voteMutation.isPending;

	const handleConfirm = () => {
		if (selectedOptionIndex === undefined) return;
		voteMutation.mutate(
			{ optionIndex: selectedOptionIndex },
			{ onSuccess: () => setConfirmationOpen(false) }
		);
	};

	return (
		<section className="rounded-2xl border border-white/10 bg-white/5 p-5 sm:p-6">
			<div className="flex flex-col gap-1">
				<p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
					Cast your vote
				</p>
				<h2 className="text-lg font-semibold text-white">
					Choose an option
				</h2>
			</div>

			<div className="mt-5 rounded-xl border border-white/10 bg-slate-950/30 p-4">
				<div className="flex items-start gap-3">
					<div className="rounded-lg bg-amber-400/10 p-2 text-amber-300">
						<WalletCards className="size-4" />
					</div>
					<div className="min-w-0 flex-1">
						<p className="text-sm font-medium text-white">
							{walletLoading
								? 'Loading connected wallet…'
								: isConnected
									? `Connected to ${shortenAddress(address!)}`
									: 'No Stellar wallet connected'}
						</p>
						{isConnected && (
							<p className="mt-1 text-xs text-white/50">
								Vote weight is locked to this Stellar address.
							</p>
						)}
					</div>
					{isConnected && activeSigner && (
						<span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-300">
							Stellar
						</span>
					)}
				</div>

				<div className="mt-4 border-t border-white/10 pt-4">
					{walletLoading || snapshotQuery.isFetching ? (
						<p className="flex items-center gap-2 text-sm text-white/60">
							<LoaderCircle className="size-4 animate-spin" />
							Checking snapshot voting weight…
						</p>
					) : snapshotQuery.isError ? (
						<p className="text-sm text-red-300">
							{snapshotQuery.error instanceof GovernanceContractError
								? snapshotQuery.error.message
								: 'Snapshot voting weight is unavailable right now.'}
						</p>
					) : !isConnected ? (
						<p className="text-sm text-white/60">
							Connect a Stellar wallet to view your voting weight.
						</p>
					) : snapshotWeight === null ? (
						<p className="text-sm text-white/60">
							No snapshot voting weight is available for this wallet.
						</p>
					) : (
						<div className="flex items-end justify-between gap-3">
							<div>
								<p className="text-2xl font-bold text-white">
									{formatCompactNumber(snapshotWeight, {
										maximumFractionDigits: 2,
									})}
								</p>
								<p className="mt-0.5 text-xs text-white/50">
									{snapshotQuery.data?.isCaptured
										? 'Captured snapshot weight'
										: 'Voting weight that will be locked on first vote'}
								</p>
							</div>
							{snapshotQuery.data?.isCaptured ? (
								<span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-300">
									<Check className="size-3.5" /> Captured
								</span>
							) : (
								<span className="inline-flex items-center gap-1 text-xs font-medium text-amber-300">
									<LockKeyhole className="size-3.5" /> Not captured
								</span>
							)}
						</div>
					)}
				</div>
			</div>

			<div
				className="mt-5 space-y-2"
				role="radiogroup"
				aria-label="Proposal options"
			>
				{options.map((option, index) => {
					const selected = selectedOptionIndex === index;
					const percentage = getProposalVoteTotal(proposal)
						? (option.weight / getProposalVoteTotal(proposal)) * 100
						: 0;

					return (
						<button
							type="button"
							key={option.label}
							role="radio"
							aria-checked={selected}
							onClick={() => setSelectedOptionIndex(index)}
							className={`flex w-full items-center justify-between gap-3 rounded-xl border p-3 text-left transition-colors ${
								selected
									? 'border-amber-300/70 bg-amber-300/10'
									: 'border-white/10 bg-white/[0.03] hover:border-white/25'
							}`}
						>
							<span className="flex min-w-0 items-center gap-3">
								<span
									className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
										selected
											? 'border-amber-300 bg-amber-300 text-slate-950'
											: 'border-white/30'
									}`}
								>
									{selected && <Check className="size-3" />}
								</span>
								<span className="truncate text-sm font-medium text-white">
									{option.label}
								</span>
							</span>
							<span className="shrink-0 text-right">
								<span className="block text-sm font-semibold text-white">
									{formatCompactNumber(option.weight)}
								</span>
								<span className="block text-[11px] text-white/45">
									{percentage.toFixed(1)}%
								</span>
							</span>
						</button>
					);
				})}
			</div>

			{voteMutation.isError && (
				<p className="mt-3 text-sm text-red-300">
					Your vote could not be submitted. Check your wallet and try
					again.
				</p>
			)}

			<Button
				type="button"
				className="mt-5 w-full"
				disabled={!canReview}
				onClick={() => setConfirmationOpen(true)}
			>
				Review vote
			</Button>

			<p className="mt-3 flex items-start gap-2 text-xs leading-5 text-white/45">
				<Clock3 className="mt-0.5 size-3.5 shrink-0" />
				<span>
					The contract captures your key balance on your first vote and
					reuses that snapshot for later vote changes.
				</span>
			</p>

			<Dialog open={confirmationOpen} onOpenChange={setConfirmationOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Confirm your vote</DialogTitle>
						<DialogDescription>
							You are voting as {shortenAddress(address ?? '')} with{' '}
							{formatCompactNumber(snapshotWeight)} voting weight.
						</DialogDescription>
					</DialogHeader>
					<div className="rounded-xl border border-amber-300/20 bg-amber-300/5 p-4">
						<p className="text-xs uppercase tracking-[0.16em] text-amber-300">
							Selected option
						</p>
						<p className="mt-1 text-lg font-semibold text-white">
							{selectedOption?.label}
						</p>
						<p className="mt-2 text-sm text-white/60">
							This transaction is submitted to the Creator Keys contract
							and may require your Stellar wallet signature.
						</p>
					</div>
					<DialogFooter>
						<Button
							type="button"
							variant="outline"
							onClick={() => setConfirmationOpen(false)}
							disabled={voteMutation.isPending}
						>
							Go back
						</Button>
						<Button
							type="button"
							onClick={handleConfirm}
							disabled={voteMutation.isPending}
						>
							{voteMutation.isPending && (
								<LoaderCircle className="size-4 animate-spin" />
							)}
							{voteMutation.isPending
								? 'Submitting…'
								: 'Sign and submit'}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</section>
	);
}
