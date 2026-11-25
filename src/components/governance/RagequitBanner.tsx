import React, { useState } from 'react';
import { Link } from 'react-router';
import {
	Clock,
	Flame,
	ShieldAlert,
	CheckCircle,
	ArrowRight,
	AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { RagequitModal } from '@/components/governance/RagequitModal';
import { useRagequit } from '@/hooks/useRagequit';
import { cn } from '@/lib/utils';

export interface RagequitBannerProps {
	proposalId: string;
	className?: string;
}

export const RagequitBanner: React.FC<RagequitBannerProps> = ({
	proposalId,
	className,
}) => {
	const {
		isWindowOpen,
		countdownText,
		cumulativeExits,
		exitCap,
		exitCapPercent,
		isEligible,
		ineligibilityReason,
		userKeys,
		estimatedPayoutXlm,
		payoutPerKeyXlm,
		isExecuted,
		executedProposalId,
		executeRagequit,
		isMutating,
	} = useRagequit(proposalId);

	const [isModalOpen, setIsModalOpen] = useState(false);

	// When the window ends and is not executed / no results: banner disappears (#acceptance criteria)
	if (!isWindowOpen && !isExecuted) {
		return null;
	}

	// After the window closes and proposal executed: show final result and link to executed proposal
	if (!isWindowOpen && isExecuted) {
		return (
			<section
				className={cn(
					'rounded-2xl border border-blue-500/30 bg-blue-500/10 p-5 text-white space-y-3',
					className
				)}
				data-testid="ragequit-closed-banner"
			>
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div className="flex items-center gap-2.5">
						<CheckCircle className="size-5 text-blue-400" />
						<div>
							<h3 className="font-jakarta font-bold text-base text-blue-200">
								Ragequit Window Closed & Proposal Executed
							</h3>
							<p className="text-xs text-blue-200/80 mt-0.5">
								The grace period ended. Total {cumulativeExits.toLocaleString()} keys exited before execution.
							</p>
						</div>
					</div>

					{executedProposalId && (
						<Link
							to={`/governance/${executedProposalId}`}
							className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-300 hover:text-blue-100 underline"
							data-testid="executed-proposal-link"
						>
							View Executed Proposal #{executedProposalId}
							<ArrowRight className="size-3.5" />
						</Link>
					)}
				</div>
			</section>
		);
	}

	return (
		<section
			className={cn(
				'rounded-2xl border border-red-500/30 bg-gradient-to-r from-red-950/40 via-red-900/20 to-[#0c182b] p-5 sm:p-6 text-white space-y-4 shadow-xl',
				className
			)}
			data-testid="ragequit-banner"
		>
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div className="space-y-1">
					<div className="flex items-center gap-2">
						<span className="inline-flex items-center gap-1 rounded-full border border-red-500/40 bg-red-500/20 px-2.5 py-0.5 text-xs font-bold text-red-300 uppercase tracking-wider">
							<ShieldAlert className="size-3.5" />
							Ragequit Window Active
						</span>
					</div>
					<h3 className="text-lg sm:text-xl font-bold font-jakarta text-white">
						Exit Grace Window: Leave with Reserve Share
					</h3>
					<p className="text-xs sm:text-sm text-white/70 max-w-xl leading-relaxed">
						Holders opposing this passed proposal can burn their keys and exit
						with their fair share of the reserve before execution.
					</p>
				</div>

				{/* Countdown clock (#acceptance criteria) */}
				<div className="rounded-xl border border-red-500/30 bg-black/40 px-4 py-2.5 text-right sm:min-w-[170px]">
					<span className="text-[11px] text-red-300/80 font-medium flex items-center justify-end gap-1">
						<Clock className="size-3" />
						Window Closes In
					</span>
					<span
						className="font-mono text-lg font-bold text-red-400 tabular-nums block mt-0.5"
						data-testid="ragequit-countdown"
					>
						{countdownText}
					</span>
				</div>
			</div>

			{/* Cumulative exits against the cap progress bar (#acceptance criteria) */}
			<div className="space-y-1.5 rounded-xl bg-black/30 p-3.5 border border-white/5">
				<div className="flex items-center justify-between text-xs">
					<span className="text-white/60">Cumulative Exits Progress</span>
					<span
						className="font-mono text-white/90 font-medium tabular-nums"
						data-testid="ragequit-exits-progress-text"
					>
						{cumulativeExits.toLocaleString()} / {exitCap.toLocaleString()} keys ({exitCapPercent.toFixed(1)}% of cap)
					</span>
				</div>
				<div
					className="h-2 w-full overflow-hidden rounded-full bg-white/10"
					role="progressbar"
					aria-valuenow={cumulativeExits}
					aria-valuemin={0}
					aria-valuemax={exitCap}
					aria-label="Cumulative exits against cap"
				>
					<div
						className="h-full bg-gradient-to-r from-amber-500 to-red-500 transition-all rounded-full"
						style={{ width: `${exitCapPercent}%` }}
						data-testid="ragequit-exits-bar"
					/>
				</div>
			</div>

			{/* Bottom section: Eligible vs Ineligible */}
			<div className="flex flex-wrap items-center justify-between gap-4 pt-1">
				{isEligible ? (
					<>
						<div className="text-xs space-y-0.5">
							<span className="text-white/60 block">Your Estimated Reserve Payout:</span>
							<span
								className="text-base font-bold font-mono text-emerald-400 tabular-nums"
								data-testid="ragequit-payout-estimate"
							>
								{estimatedPayoutXlm.toLocaleString(undefined, {
									minimumFractionDigits: 2,
									maximumFractionDigits: 2,
								})}{' '}
								XLM{' '}
								<span className="text-xs text-white/50 font-normal">
									({userKeys.toLocaleString()} keys @ {payoutPerKeyXlm.toFixed(2)} XLM/key)
								</span>
							</span>
						</div>

						<Button
							type="button"
							onClick={() => setIsModalOpen(true)}
							className="bg-red-500 hover:bg-red-600 text-white font-semibold gap-1.5 shadow-lg shadow-red-950/50"
							data-testid="ragequit-exit-button"
						>
							<Flame className="size-4" />
							Ragequit & Exit
						</Button>
					</>
				) : (
					/* Ineligible holders see reason and NO exit button (#acceptance criteria) */
					<div
						className="w-full flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/80"
						data-testid="ragequit-ineligible-notice"
					>
						<AlertCircle className="size-4 text-amber-400 shrink-0" />
						<span>
							Ineligible to ragequit:{' '}
							<strong className="text-white">
								{ineligibilityReason || 'You are not eligible for reserve exit.'}
							</strong>
						</span>
					</div>
				)}
			</div>

			{isEligible && (
				<RagequitModal
					isOpen={isModalOpen}
					onClose={() => setIsModalOpen(false)}
					proposalId={proposalId}
					maxKeys={userKeys}
					payoutPerKeyXlm={payoutPerKeyXlm}
					onConfirm={keys => executeRagequit(keys)}
					isPending={isMutating}
				/>
			)}
		</section>
	);
};

export default RagequitBanner;
