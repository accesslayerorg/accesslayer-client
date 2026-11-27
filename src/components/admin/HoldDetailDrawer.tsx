import React, { useEffect, useState } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatXlmPrice } from '@/utils/numberFormat.utils';
import { formatAbsoluteDateTime } from '@/utils/time.utils';
import { truncateWalletAddress } from '@/utils/referral.utils';
import {
	REFERRAL_HOLD_REASON_LABELS,
	REFERRAL_HOLD_STATUS_LABELS,
} from '@/utils/referralHolds.utils';
import type {
	ReferralHoldDetail,
	ReferralHoldReviewAction,
} from '@/services/adminReferralHolds.service';

export interface HoldDetailDrawerProps {
	detail?: ReferralHoldDetail | null;
	isLoading?: boolean;
	open?: boolean;
	onClose?: () => void;
	onReview?: (action: ReferralHoldReviewAction, note: string) => void | Promise<void>;
	isReviewing?: boolean;
	reviewError?: string | null;
	className?: string;
}

export const HoldDetailDrawer: React.FC<HoldDetailDrawerProps> = ({
	detail,
	isLoading = false,
	open = true,
	onClose,
	onReview,
	isReviewing = false,
	reviewError,
	className,
}) => {
	const [note, setNote] = useState('');

	useEffect(() => {
		if (!open) setNote('');
	}, [open]);

	if (!open) return null;

	const linkedWallets = detail?.linkedWallets ?? [];
	const fundingTransactions = detail?.fundingTransactions ?? [];
	const timeline = detail?.timeline ?? [];
	const noteIsValid = note.trim().length > 0;

	const handleReview = (action: ReferralHoldReviewAction) => {
		if (!noteIsValid || isReviewing) return;
		void onReview?.(action, note.trim());
	};

	return (
		<Dialog
			open={open}
			onOpenChange={nextOpen => {
				if (!nextOpen) onClose?.();
			}}
		>
			<DialogContent
				className={`sm:max-w-2xl ${className ?? ''}`}
				data-testid="hold-detail-drawer"
				aria-label="Referral hold details"
			>
				<DialogHeader>
					<DialogTitle>Referral hold details</DialogTitle>
					<DialogDescription>
						{detail ? (
							<>
								{detail.id} ·{' '}
								<span data-testid="hold-detail-status">
									{REFERRAL_HOLD_STATUS_LABELS[detail.status] ?? detail.status}
								</span>{' '}
								·{' '}
								{REFERRAL_HOLD_REASON_LABELS[detail.reason] ?? detail.reason}
							</>
						) : (
							'Loading evidence…'
						)}
					</DialogDescription>
				</DialogHeader>

				{isLoading && (
					<p className="text-sm text-white/50" data-testid="hold-detail-loading">
						Loading cluster evidence…
					</p>
				)}

				{detail && (
					<div className="max-h-[55vh] space-y-5 overflow-y-auto pr-1">
						<section data-testid="hold-linked-wallets">
							<h3 className="mb-2 font-jakarta text-sm font-bold text-white">
								Linked wallets
							</h3>
							{linkedWallets.length === 0 ? (
								<p className="text-xs text-white/50">No wallets reported.</p>
							) : (
								<ul className="divide-y divide-white/10 rounded-xl border border-white/10">
									{linkedWallets.map((wallet, index) => (
										<li
											key={`${wallet.address}-${index}`}
											className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs"
											data-testid="hold-linked-wallet"
										>
											<span
												className="font-mono text-white/80"
												title={wallet.address}
											>
												{truncateWalletAddress(wallet.address)}
											</span>
											<span className="text-white/50">{wallet.role}</span>
											{wallet.joinedAt && (
												<span className="text-white/40">
													{formatAbsoluteDateTime(wallet.joinedAt)}
												</span>
											)}
										</li>
									))}
								</ul>
							)}
						</section>

						<section data-testid="hold-funding-transactions">
							<h3 className="mb-2 font-jakarta text-sm font-bold text-white">
								First-funding transactions
							</h3>
							{fundingTransactions.length === 0 ? (
								<p className="text-xs text-white/50">
									No funding transactions reported.
								</p>
							) : (
								<ul className="divide-y divide-white/10 rounded-xl border border-white/10">
									{fundingTransactions.map((transaction, index) => (
										<li
											key={`${transaction.hash}-${index}`}
											className="flex flex-wrap items-center justify-between gap-2 p-3 text-xs"
											data-testid="hold-funding-transaction"
										>
											<span className="font-mono text-white/60">
												{truncateWalletAddress(transaction.from)} →{' '}
												{truncateWalletAddress(transaction.to)}
											</span>
											<span className="font-mono font-semibold text-emerald-400">
												{formatXlmPrice(transaction.amountXlm)}
											</span>
											<span className="font-mono text-white/40">
												{transaction.hash}
											</span>
										</li>
									))}
								</ul>
							)}
						</section>

						<section data-testid="hold-timeline">
							<h3 className="mb-2 font-jakarta text-sm font-bold text-white">
								Timeline
							</h3>
							{timeline.length === 0 ? (
								<p className="text-xs text-white/50">No events reported.</p>
							) : (
								<ol className="space-y-2 border-l border-white/10 pl-4">
									{timeline.map((event, index) => (
										<li
											key={`${event.id}-${index}`}
											className="text-xs"
											data-testid="hold-timeline-event"
										>
											<span className="font-semibold text-white/80">
												{event.label}
											</span>
											<span className="ml-2 text-white/40">
												{formatAbsoluteDateTime(event.timestamp)}
											</span>
											{event.description && (
												<p className="mt-0.5 text-white/50">
													{event.description}
												</p>
											)}
										</li>
									))}
								</ol>
							)}
						</section>
					</div>
				)}

				<div className="space-y-2">
					<label
						htmlFor="hold-review-note"
						className="font-jakarta text-xs font-semibold text-white/70"
					>
						Review note <span className="text-amber-300">*</span>
					</label>
					<Textarea
						id="hold-review-note"
						value={note}
						onChange={event => setNote(event.target.value)}
						placeholder="Explain the decision for the audit trail"
						disabled={isReviewing}
						data-testid="hold-review-note"
					/>
					{!noteIsValid && (
						<p className="text-xs text-white/40" data-testid="hold-review-note-hint">
							A note is required to release or reject a hold.
						</p>
					)}
					{reviewError && (
						<p role="alert" className="text-xs text-rose-300">
							{reviewError}
						</p>
					)}
				</div>

				<DialogFooter>
					<Button type="button" variant="outline" onClick={onClose}>
						Close
					</Button>
					<Button
						type="button"
						variant="destructive"
						disabled={!noteIsValid || isReviewing || !detail}
						onClick={() => handleReview('reject')}
						data-testid="hold-reject-button"
					>
						Reject
					</Button>
					<Button
						type="button"
						disabled={!noteIsValid || isReviewing || !detail}
						onClick={() => handleReview('release')}
						data-testid="hold-release-button"
					>
						Release
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default HoldDetailDrawer;
