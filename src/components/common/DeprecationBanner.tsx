import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router';

/**
 * Deprecation banner for creator keys (issue #996).
 *
 * Rendered on the key detail page (and reusable on portfolio surfaces)
 * whenever a key carries a deprecation record. The banner surfaces the three
 * facts a holder needs — when the key was deprecated, why, and which key
 * succeeds it — and routes the Migrate now CTA to the successor key's buy
 * flow. Dismissible per visit; dismissal is not persisted so holders keep
 * seeing the notice on later visits (a deprecation is not a promo).
 */

export interface KeyDeprecation {
	/** ISO 8601 date the key was (or will be) deprecated. */
	deprecatedAt: string;
	/** Human-readable reason the key was deprecated. */
	reason: string;
	/** Successor key's creator id, when one has been designated. */
	successorId?: string;
	/** Display name of the successor key, for the CTA label. */
	successorName?: string;
}

interface DeprecationBannerProps {
	deprecation: KeyDeprecation;
	/** Called when the user dismisses the banner (controls visibility upstream). */
	onDismiss?: () => void;
}

function formatDeprecatedDate(iso: string): string {
	const parsed = new Date(iso);
	if (Number.isNaN(parsed.getTime())) return iso;
	return parsed.toLocaleDateString(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
	});
}

export default function DeprecationBanner({
	deprecation,
	onDismiss,
}: DeprecationBannerProps) {
	const { deprecatedAt, reason, successorId, successorName } = deprecation;

	return (
		<div
			data-testid="deprecation-banner"
			role="status"
			aria-live="polite"
			className="rounded-[1.25rem] border border-amber-400/30 bg-amber-400/10 px-5 py-4 md:px-6"
		>
			<div className="flex items-start gap-3">
				<AlertTriangle
					className="mt-0.5 size-5 shrink-0 text-amber-400"
					aria-hidden="true"
				/>
				<div className="min-w-0 flex-1">
					<p className="font-grotesque text-sm font-bold uppercase tracking-wide text-amber-300">
						This key is deprecated
					</p>
					<p
						className="mt-1 text-sm text-white/80"
						data-testid="deprecation-details"
					>
						Deprecated {formatDeprecatedDate(deprecatedAt)} &middot;{' '}
						{reason}
						{successorId && (
							<>
								{' '}
								&middot; Successor key:{' '}
								<span className="font-semibold text-white">
									{successorName ?? successorId}
								</span>
							</>
						)}
					</p>
					{successorId && (
						<Link
							to={`/creator/${successorId}`}
							data-testid="migrate-now-cta"
							className="mt-3 inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-bold text-[#06111f] transition-colors hover:bg-amber-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
						>
							Migrate now
							<ArrowRight className="size-4" aria-hidden="true" />
						</Link>
					)}
				</div>
				{onDismiss && (
					<button
						type="button"
						onClick={onDismiss}
						data-testid="deprecation-banner-dismiss"
						aria-label="Dismiss deprecation notice"
						className="shrink-0 rounded-full p-1 text-white/60 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-300"
					>
						<X className="size-4" aria-hidden="true" />
					</button>
				)}
			</div>
		</div>
	);
}
