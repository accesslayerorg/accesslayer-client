import toast from 'react-hot-toast';
import { Trophy, X } from 'lucide-react';


const MILESTONE_TOAST_DURATION_MS = 8_000;

/** Tracks which milestone events have already been toasted to prevent duplicates. */
const toastedMilestones = new Set<string>();

export interface MilestoneToastData {
	/** Unique event identifier for deduplication. */
	eventId: string;
	keyName: string;
	milestoneDuration: string;
	rewardAmount: string;
	/** Navigation target for the Claim Now CTA. */
	portfolioPath: string;
}

/**
 * #1176 — Show a celebration toast when a key holder reaches a loyalty milestone.
 * Persists for 8 seconds with manual dismiss. Prevents duplicate toasts per event.
 */
export function showLoyaltyMilestoneToast(data: MilestoneToastData): void {
	if (toastedMilestones.has(data.eventId)) return;
	toastedMilestones.add(data.eventId);

	toast.custom(
		(t) => (
			<div
				role="status"
				aria-live="polite"
				className={`${t.visible ? 'animate-enter' : 'animate-leave'} pointer-events-auto flex w-full max-w-sm rounded-xl border border-amber-500/20 bg-slate-900 shadow-xl shadow-amber-500/10`}
			>
				<div className="flex w-full p-4 flex-col gap-3">
					<div className="flex items-start justify-between">
						<div className="flex items-center gap-2">
							<div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10">
								<Trophy className="h-4 w-4 text-amber-500" />
							</div>
							<div>
								<p className="text-sm font-semibold text-white">Milestone Reached!</p>
								<p className="text-xs text-slate-400">{data.keyName}</p>
							</div>
						</div>
						<button
							onClick={() => toast.dismiss(t.id)}
							className="rounded p-1 text-slate-500 hover:bg-slate-800 hover:text-white"
							aria-label="Dismiss notification"
						>
							<X className="h-3.5 w-3.5" />
						</button>
					</div>
					<div className="space-y-1 text-xs text-slate-300">
						<p>
							<span className="text-slate-500">Duration:</span> {data.milestoneDuration}
						</p>
						<p>
							<span className="text-slate-500">Reward:</span>{' '}
							<span className="font-semibold text-amber-400">{data.rewardAmount}</span>
						</p>
					</div>
					<button
						onClick={() => {
							window.location.href = data.portfolioPath;
							toast.dismiss(t.id);
						}}
						className="rounded-lg bg-amber-500 px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-amber-400"
					>
						Claim Now
					</button>
				</div>
			</div>
		),
		{ duration: MILESTONE_TOAST_DURATION_MS },
	);
}

/** Reset the deduplication set (for testing). */
export function resetMilestoneToastDedup(): void {
	toastedMilestones.clear();
}
