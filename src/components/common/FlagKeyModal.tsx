import { useEffect, useState } from 'react';
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
import { KEY_FLAG_REASONS, getKeyFlagReasonLabel } from '@/constants/keyFlags';
import type {
	KeyFlag,
	KeyFlagReasonCode,
	KeyFlagResolution,
} from '@/services/course.service';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatAbsoluteDateTime } from '@/utils/time.utils';
import { cn } from '@/lib/utils';
import {
	AlertTriangle,
	CheckCircle2,
	Flag,
	Lock,
	ShieldCheck,
} from 'lucide-react';

export interface FlagKeyModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	keyTitle: string;
	/** Stake required to submit a flag, in stroops. */
	requiredStakeStroops: number;
	/** The wallet's existing flag; when present the form is replaced. */
	existingFlag?: KeyFlag | null;
	isSubmitting?: boolean;
	onSubmit: (input: { reasonCode: KeyFlagReasonCode }) => Promise<void> | void;
	className?: string;
}

function ResolutionSummary({
	resolution,
}: {
	resolution: KeyFlagResolution;
}) {
	const returned = resolution.status === 'returned';
	return (
		<div
			className={cn(
				'flex items-start gap-2 rounded-xl border px-3.5 py-3 text-xs',
				returned
					? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-300'
					: 'border-rose-500/25 bg-rose-500/10 text-rose-200'
			)}
			data-testid="flag-resolution-summary"
		>
			{returned ? (
				<CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
			) : (
				<AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
			)}
			<div>
				<p className="font-semibold">
					{returned
						? 'Review upheld the flag — your stake was returned in full.'
						: 'Review rejected the flag — your stake was forfeited.'}
				</p>
				<p className="mt-0.5 text-white/55">
					{formatAbsoluteDateTime(resolution.resolvedAt) ??
						resolution.resolvedAt}
					{resolution.note ? ` · ${resolution.note}` : ''}
				</p>
			</div>
		</div>
	);
}

/**
 * Stake-weighted key flagging modal (#1386).
 *
 * Lets a holder pick a reason and lock the required stake to flag an abusive
 * key, explaining the refund/forfeit rules up front. If the wallet has already
 * flagged the key, the form is replaced by the existing flag and its review
 * outcome so a second flag cannot be submitted.
 */
export default function FlagKeyModal({
	open,
	onOpenChange,
	keyTitle,
	requiredStakeStroops,
	existingFlag,
	isSubmitting = false,
	onSubmit,
	className,
}: FlagKeyModalProps) {
	const [reasonCode, setReasonCode] = useState<KeyFlagReasonCode>(
		KEY_FLAG_REASONS[0].value
	);

	useEffect(() => {
		if (open) {
			setReasonCode(KEY_FLAG_REASONS[0].value);
		}
	}, [open]);

	const alreadyFlagged = Boolean(existingFlag);
	const stakeLabel = formatDisplayKeyPrice(requiredStakeStroops);

	const handleSubmit = async () => {
		if (alreadyFlagged || isSubmitting) return;
		try {
			await onSubmit({ reasonCode });
		} catch {
			// Errors are surfaced by the calling mutation's toast.
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={next => {
				if (!isSubmitting) onOpenChange(next);
			}}
		>
			<DialogContent
				className={cn(
					'max-w-md border-white/10 bg-[#0a1526]/95 text-white backdrop-blur-xl',
					className
				)}
				showCloseButton={!isSubmitting}
				showEscapeHint={!isSubmitting}
				data-testid="flag-key-modal"
				onEscapeKeyDown={event => {
					if (isSubmitting) event.preventDefault();
				}}
				onInteractOutside={event => {
					if (isSubmitting) event.preventDefault();
				}}
			>
				{alreadyFlagged && existingFlag ? (
					<div className="space-y-5">
						<DialogHeader>
							<div className="mb-1 flex size-11 items-center justify-center rounded-full border border-amber-500/20 bg-amber-500/10 text-amber-300">
								<Flag className="size-5" aria-hidden="true" />
							</div>
							<DialogTitle className="text-xl font-bold font-grotesque text-white tracking-tight">
								You already flagged this key
							</DialogTitle>
							<DialogDescription className="text-sm text-white/70">
								Only one flag is allowed per wallet. Your existing flag for{' '}
								<span className="font-semibold text-white">{keyTitle}</span> is
								shown below.
							</DialogDescription>
						</DialogHeader>

						<div
							className="space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm"
							data-testid="existing-flag-notice"
						>
							<div className="flex items-center justify-between gap-3">
								<span className="text-white/60">Reason</span>
								<span className="text-right font-semibold text-white">
									{getKeyFlagReasonLabel(existingFlag.reasonCode)}
								</span>
							</div>
							<div className="flex items-center justify-between gap-3">
								<span className="text-white/60">Stake locked</span>
								<span className="font-semibold text-white tabular-nums">
									{formatDisplayKeyPrice(existingFlag.stakeStroops)}
								</span>
							</div>
							<div className="flex items-center justify-between gap-3">
								<span className="text-white/60">Submitted</span>
								<span className="text-xs text-white/80 tabular-nums">
									{formatAbsoluteDateTime(existingFlag.createdAt) ??
										existingFlag.createdAt}
								</span>
							</div>
						</div>

						{existingFlag.resolution ? (
							<ResolutionSummary resolution={existingFlag.resolution} />
						) : (
							<div
								className="flex items-center gap-2 rounded-xl border border-amber-500/20 bg-amber-500/10 px-3.5 py-3 text-xs text-amber-200"
								data-testid="flag-pending-resolution"
							>
								<Lock className="size-4 shrink-0" aria-hidden="true" />
								<span>
									Stake locked on-chain. It is returned if the review upholds
									the flag, or forfeited if the flag is rejected.
								</span>
							</div>
						)}

						<DialogFooter>
							<Button
								type="button"
								onClick={() => onOpenChange(false)}
								className="w-full bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
								data-testid="close-flag-modal-button"
							>
								Done
							</Button>
						</DialogFooter>
					</div>
				) : (
					<div className="space-y-5">
						<DialogHeader>
							<DialogTitle className="text-xl font-bold font-grotesque text-white tracking-tight">
								Flag this key
							</DialogTitle>
							<DialogDescription className="text-sm text-white/70">
								Flag{' '}
								<span className="font-semibold text-white">{keyTitle}</span> for
								abuse. Enough unique flags freeze trading until a review
								completes.
							</DialogDescription>
						</DialogHeader>

						<div className="space-y-2">
							<label
								htmlFor="flag-reason-select"
								className="text-xs font-semibold uppercase tracking-wider text-white/55"
							>
								Reason
							</label>
							<select
								id="flag-reason-select"
								data-testid="flag-reason-select"
								value={reasonCode}
								onChange={event =>
									setReasonCode(event.target.value as KeyFlagReasonCode)
								}
								disabled={isSubmitting}
								className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15"
							>
								{KEY_FLAG_REASONS.map(reason => (
									<option
										key={reason.value}
										value={reason.value}
										className="bg-slate-900"
									>
										{reason.label}
									</option>
								))}
							</select>
						</div>

						<div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
							<div>
								<p className="text-xs font-semibold uppercase tracking-wider text-white/55">
									Stake required
								</p>
								<p className="mt-0.5 text-[0.7rem] text-white/45">
									Locked on-chain when you submit this flag.
								</p>
							</div>
							<span
								className="text-base font-bold text-amber-300 tabular-nums"
								data-testid="flag-stake-amount"
							>
								{stakeLabel}
							</span>
						</div>

						<div
							className="space-y-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3.5"
							data-testid="flag-stake-rules"
						>
							<div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-amber-300">
								<ShieldCheck className="size-4" aria-hidden="true" />
								<span>Refund and forfeit rules</span>
							</div>
							<ul className="list-disc space-y-1 pl-4 text-xs leading-relaxed text-white/75">
								<li>
									Your full stake is returned if the review confirms the abuse.
								</li>
								<li>
									Your stake is forfeited to the protocol if the review finds no
									violation.
								</li>
								<li>
									The stake stays locked and trading pauses automatically once
									the flag threshold is reached.
								</li>
							</ul>
						</div>

						<DialogFooter className="sm:justify-between gap-3">
							<Button
								type="button"
								variant="ghost"
								onClick={() => onOpenChange(false)}
								disabled={isSubmitting}
								className="text-white/70 hover:text-white"
								data-testid="cancel-flag-button"
							>
								Cancel
							</Button>
							<Button
								type="button"
								onClick={handleSubmit}
								disabled={isSubmitting || requiredStakeStroops <= 0}
								aria-busy={isSubmitting || undefined}
								className="bg-amber-500 font-bold text-slate-950 hover:bg-amber-400"
								data-testid="confirm-flag-button"
							>
								<StableButtonContent
									isLoading={isSubmitting}
									loadingLabel="Locking stake…"
								>
									Flag and lock {stakeLabel}
								</StableButtonContent>
							</Button>
						</DialogFooter>
					</div>
				)}
			</DialogContent>
		</Dialog>
	);
}
