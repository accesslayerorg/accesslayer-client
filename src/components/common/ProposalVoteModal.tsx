import React, { useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import { governanceContractService } from '@/services/governanceContract.service';
import type { Proposal } from '@/types/governance';
import { formatCompactNumber } from '@/utils/numberFormat.utils';
import showToast from '@/utils/toast.util';
import { cn } from '@/lib/utils';
import { ThumbsUp, ThumbsDown, Scale } from 'lucide-react';

export interface ProposalVoteModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	proposal: Proposal | null;
	voterAddress?: string;
	voteWeight: number;
	onVoteSubmitted?: (args: {
		proposalId: string;
		support: boolean;
		direction: 'for' | 'against';
		weight: number;
	}) => Promise<void> | void;
}

/**
 * Governance vote modal (#1126) with For/Against toggle and estimated vote
 * weight derived from the connected wallet's holdings. Submits `cast_vote`
 * on confirmation.
 */
export const ProposalVoteModal: React.FC<ProposalVoteModalProps> = ({
	open,
	onOpenChange,
	proposal,
	voterAddress = '',
	voteWeight,
	onVoteSubmitted,
}) => {
	const [direction, setDirection] = useState<'for' | 'against'>('for');
	const [isSubmitting, setIsSubmitting] = useState(false);

	if (!proposal) return null;

	const handleSubmit = async () => {
		if (isSubmitting || voteWeight <= 0) return;
		setIsSubmitting(true);
		try {
			const support = direction === 'for';
			await governanceContractService.cast_vote({
				proposalId: proposal.id,
				voter: voterAddress,
				support,
				weight: voteWeight,
			});
			await onVoteSubmitted?.({
				proposalId: proposal.id,
				support,
				direction,
				weight: voteWeight,
			});
			showToast.success(
				`Vote cast (${direction === 'for' ? 'For' : 'Against'}) with weight ${formatCompactNumber(voteWeight)}`
			);
			onOpenChange(false);
		} catch (error) {
			showToast.error(
				error instanceof Error ? error.message : 'Failed to submit vote'
			);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={next => !isSubmitting && onOpenChange(next)}
		>
			<DialogContent
				data-testid="proposal-vote-modal"
				className="max-w-md border-white/10 bg-[#0b1728] text-white p-6"
			>
				<DialogHeader>
					<DialogTitle data-testid="vote-modal-title">
						Cast Vote: {proposal.title}
					</DialogTitle>
					<DialogDescription className="text-xs text-white/60">
						Select your voting stance. Your voting weight is derived from
						your creator key holdings.
					</DialogDescription>
				</DialogHeader>

				<div className="mt-4 space-y-4">
					{/* Vote Weight Display */}
					<div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] p-4">
						<div className="flex items-center gap-2 text-sm text-white/70">
							<Scale className="size-4 text-amber-400" />
							<span>Estimated Vote Weight</span>
						</div>
						<span
							data-testid="estimated-vote-weight"
							className="font-mono text-lg font-bold text-amber-300"
						>
							{formatCompactNumber(voteWeight)} keys
						</span>
					</div>

					{/* For / Against Toggle */}
					<div className="space-y-2">
						<span className="text-xs font-semibold uppercase tracking-wider text-white/60">
							Your Vote
						</span>
						<div
							role="group"
							aria-label="Vote direction"
							className="grid grid-cols-2 gap-3"
						>
							<button
								type="button"
								data-testid="vote-toggle-for"
								aria-pressed={direction === 'for'}
								onClick={() => setDirection('for')}
								disabled={isSubmitting}
								className={cn(
									'flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-all',
									direction === 'for'
										? 'border-emerald-400/60 bg-emerald-500/20 text-emerald-300'
										: 'border-white/10 bg-white/[0.03] text-white/60 hover:text-white'
								)}
							>
								<ThumbsUp className="size-4" />
								For
							</button>
							<button
								type="button"
								data-testid="vote-toggle-against"
								aria-pressed={direction === 'against'}
								onClick={() => setDirection('against')}
								disabled={isSubmitting}
								className={cn(
									'flex items-center justify-center gap-2 rounded-xl border py-3 text-sm font-bold transition-all',
									direction === 'against'
										? 'border-rose-400/60 bg-rose-500/20 text-rose-300'
										: 'border-white/10 bg-white/[0.03] text-white/60 hover:text-white'
								)}
							>
								<ThumbsDown className="size-4" />
								Against
							</button>
						</div>
					</div>
				</div>

				<DialogFooter className="mt-6 flex flex-row justify-between gap-3 sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						data-testid="cancel-vote-button"
						onClick={() => onOpenChange(false)}
						disabled={isSubmitting}
					>
						Cancel
					</Button>
					<Button
						type="button"
						data-testid="confirm-vote-button"
						onClick={handleSubmit}
						disabled={isSubmitting || voteWeight <= 0}
						className="bg-amber-400 text-slate-950 hover:bg-amber-300 font-bold"
					>
						<StableButtonContent
							isLoading={isSubmitting}
							loadingLabel="Submitting…"
						>
							Submit Vote
						</StableButtonContent>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default ProposalVoteModal;
