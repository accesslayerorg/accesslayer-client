import toast from 'react-hot-toast';
import { Award, Sparkles, X } from 'lucide-react';
import { BADGE_CATALOG, type WalletBadgeType } from '@/utils/walletBadges.utils';
import { playAchievementConfetti } from '@/utils/confetti.utils';

/**
 * How long the badge achievement toast stays on screen (#1222).
 *
 * Long enough to read the badge name and tap through to the showcase.
 */
export const BADGE_TOAST_DURATION_MS = 10_000;

export interface BadgeEarnedToastData {
	/** Badge that was earned. */
	badgeType: WalletBadgeType;
	/** Path to the wallet's badge showcase, used by the "View Badges" CTA. */
	profilePath: string;
	/** Invoked when the user taps "View Badges". */
	onViewBadges?: (profilePath: string) => void;
}

/** Resolves the catalog entry for a badge, if the client knows it. */
function findBadgeDefinition(
	badgeType: WalletBadgeType
): (typeof BADGE_CATALOG)[number] | undefined {
	return BADGE_CATALOG.find(badge => badge.id === badgeType);
}

/**
 * #1222 — Celebrates a newly earned NFT badge.
 *
 * Shows the badge icon with a reveal animation, the badge name and the
 * criteria that were met, plus a "View Badges" CTA that deep-links to the
 * wallet's badge showcase. The toast persists for ten seconds and can be
 * dismissed manually.
 */
export function showBadgeEarnedToast(data: BadgeEarnedToastData): void {
	const definition = findBadgeDefinition(data.badgeType);
	const Icon = definition?.icon ?? Award;

	playAchievementConfetti();

	toast.custom(
		t => (
			<div
				role="status"
				aria-live="polite"
				data-testid="badge-earned-toast"
				className={`${
					t.visible ? 'animate-enter' : 'animate-leave'
				} pointer-events-auto flex w-full max-w-sm rounded-xl border border-amber-400/25 bg-slate-900 shadow-xl shadow-amber-500/10`}
			>
				<div className="flex w-full flex-col gap-3 p-4">
					<div className="flex items-start gap-3">
						<div
							className="badge-reveal flex size-11 shrink-0 items-center justify-center rounded-full border border-amber-300/30 bg-amber-400/10"
							data-testid="badge-earned-toast-icon"
						>
							<Icon className="size-6 text-amber-300" aria-hidden="true" />
						</div>

						<div className="min-w-0 flex-1">
							<p className="flex items-center gap-1.5 font-jakarta text-sm font-bold text-white">
								<Sparkles
									className="size-3.5 text-amber-300"
									aria-hidden="true"
								/>
								Badge earned
							</p>
							<p
								className="font-jakarta text-sm font-semibold text-amber-200"
								data-testid="badge-earned-toast-name"
							>
								{definition?.name ?? 'New badge'}
							</p>
							<p
								className="mt-0.5 text-xs text-white/60"
								data-testid="badge-earned-toast-criteria"
							>
								{definition
									? `Criteria met: ${definition.criteria}`
									: 'Achievement unlocked'}
							</p>
						</div>

						<button
							type="button"
							onClick={() => toast.dismiss(t.id)}
							className="rounded p-1 text-slate-500 transition-colors hover:bg-slate-800 hover:text-white"
							aria-label="Dismiss notification"
							data-testid="badge-earned-toast-dismiss"
						>
							<X className="size-3.5" aria-hidden="true" />
						</button>
					</div>

					<button
						type="button"
						onClick={() => {
							data.onViewBadges?.(data.profilePath);
							toast.dismiss(t.id);
						}}
						className="rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-bold text-slate-900 transition-colors hover:bg-amber-300"
						data-testid="badge-earned-toast-cta"
					>
						View Badges
					</button>
				</div>
			</div>
		),
		{ duration: BADGE_TOAST_DURATION_MS }
	);
}
