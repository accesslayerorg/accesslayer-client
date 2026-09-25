/**
 * AllowanceApprovalStep (#955)
 *
 * Inline approval step rendered inside the buy/staking flow when the
 * staking contract does not yet have sufficient allowance to transfer
 * the user's keys.
 *
 * Flow:
 *  1. Parent checks `needsApproval` (from useAllowanceStore).
 *  2. If true, renders this component instead of the normal confirm button.
 *  3. User reads the explanation and clicks "Approve transfer".
 *  4. On success, `onApproved` is called so the parent can proceed.
 *  5. On error, an inline error message is shown with a retry option.
 *
 * The component is purely presentational with respect to layout — it takes
 * no wallet addresses; the parent passes the pre-checked status and the
 * submit handler.
 */

import { ShieldCheck, AlertCircle, Loader2, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import { cn } from '@/lib/utils';

export interface AllowanceApprovalStepProps {
	/** Whether the approval transaction is currently in-flight. */
	isApproving: boolean;
	/** Non-null when the approval transaction failed. */
	errorMessage: string | null;
	/** Called when the user clicks "Approve transfer". */
	onApprove: () => void;
	className?: string;
}

const AllowanceApprovalStep: React.FC<AllowanceApprovalStepProps> = ({
	isApproving,
	errorMessage,
	onApprove,
	className,
}) => {
	return (
		<div
			className={cn(
				'rounded-xl border border-amber-500/25 bg-amber-500/8 px-4 py-4 space-y-3',
				className
			)}
		>
			{/* Header */}
			<div className="flex items-start gap-3">
				<div className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/15">
					<ShieldCheck
						className="size-3.5 text-amber-400"
						aria-hidden="true"
					/>
				</div>
				<div className="min-w-0 flex-1">
					<p className="text-sm font-bold text-amber-100">
						Approval required
					</p>
					<p className="mt-1 text-xs leading-relaxed text-amber-200/70">
						Before staking your keys, you must grant the staking contract
						permission to transfer them on your behalf. This is a one-time
						on-chain approval per wallet.
					</p>
				</div>
			</div>

			{/* What the approval grants */}
			<div className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2.5 space-y-1.5">
				<p className="flex items-center gap-1.5 text-[0.7rem] font-semibold uppercase tracking-wider text-white/40">
					<Info className="size-3" aria-hidden="true" />
					What this approval grants
				</p>
				<ul className="space-y-1 text-xs text-white/60">
					<li className="flex items-start gap-1.5">
						<span className="mt-1 size-1 shrink-0 rounded-full bg-amber-400/60" />
						The staking contract may transfer your approved creator keys.
					</li>
					<li className="flex items-start gap-1.5">
						<span className="mt-1 size-1 shrink-0 rounded-full bg-amber-400/60" />
						Your wallet retains full custody until a stake action is
						confirmed.
					</li>
					<li className="flex items-start gap-1.5">
						<span className="mt-1 size-1 shrink-0 rounded-full bg-amber-400/60" />
						You can revoke this approval at any time from your wallet
						settings.
					</li>
				</ul>
			</div>

			{/* Error state */}
			{errorMessage && (
				<div
					role="alert"
					className="flex items-start gap-2 rounded-lg border border-red-500/25 bg-red-500/10 px-3 py-2.5"
				>
					<AlertCircle
						className="mt-0.5 size-3.5 shrink-0 text-red-400"
						aria-hidden="true"
					/>
					<p className="text-xs text-red-300">{errorMessage}</p>
				</div>
			)}

			{/* Approve button */}
			<Button
				type="button"
				onClick={onApprove}
				disabled={isApproving}
				aria-busy={isApproving || undefined}
				className="w-full rounded-xl font-bold"
				data-testid="allowance-approve-btn"
			>
				<StableButtonContent
					isLoading={isApproving}
					loadingLabel="Approving…"
					spinner={
						<Loader2
							className="size-4 animate-spin"
							aria-hidden="true"
						/>
					}
				>
					<ShieldCheck className="size-4" aria-hidden="true" />
					Approve transfer
				</StableButtonContent>
			</Button>
		</div>
	);
};

export default AllowanceApprovalStep;
