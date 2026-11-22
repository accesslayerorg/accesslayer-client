import { AlertTriangle, Snowflake } from 'lucide-react';
import type { KeyFreezeStatus } from '@/hooks/useKeyFreeze';
import { cn } from '@/lib/utils';

/**
 * Freeze status banner for creator keys (issue #1121).
 *
 * Rendered directly below the key header whenever a key carries an active
 * admin freeze. Surfaces the three facts a holder needs — why the key is
 * frozen, when the freeze lifts (or that it is indefinite), and where to
 * contact an admin — while the page disables every buy/sell control for
 * the duration of the freeze.
 */

interface KeyFreezeStatusBannerProps {
	freeze: KeyFreezeStatus;
	className?: string;
}

/** Admin contact link shown in the banner when a freeze needs escalation. */
export const FREEZE_SUPPORT_URL =
	'https://github.com/accesslayerorg/accesslayer-client/issues';

function formatExpiry(iso: string, expiresAtMs: number | null): string {
	if (expiresAtMs === null) return iso;
	return new Date(expiresAtMs).toLocaleString(undefined, {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
}

export default function KeyFreezeStatusBanner({
	freeze,
	className,
}: KeyFreezeStatusBannerProps) {
	const { reason, expiresAt, expiresAtMs } = freeze;

	return (
		<div
			role="alert"
			data-testid="key-freeze-banner"
			className={cn(
				'flex items-start gap-3 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-3.5',
				className
			)}
		>
			<Snowflake
				className="mt-0.5 size-5 shrink-0 text-orange-400"
				aria-hidden="true"
			/>
			<div className="min-w-0 flex-1">
				<p
					className="font-grotesque text-sm font-bold uppercase tracking-wide text-orange-300"
					data-testid="key-freeze-banner-title"
				>
					<AlertTriangle
						className="mr-1.5 inline size-4 align-[-0.15em]"
						aria-hidden="true"
					/>
					This key is frozen
				</p>
				<p
					className="mt-1 text-sm text-white/80"
					data-testid="key-freeze-reason"
				>
					{reason}
				</p>
				<p className="mt-1 text-sm text-white/70">
					{expiresAt ? (
						<>
							Freeze expires:{' '}
							<time dateTime={expiresAt} data-testid="key-freeze-expiry">
								{formatExpiry(expiresAt, expiresAtMs)}
							</time>
						</>
					) : (
						<span data-testid="key-freeze-expiry">
							Freeze expires: indefinite
						</span>
					)}
				</p>
				<p className="mt-1 text-sm text-white/70">
					Buying and selling are disabled until the freeze is lifted.{' '}
					<a
						href={FREEZE_SUPPORT_URL}
						target="_blank"
						rel="noreferrer"
						data-testid="key-freeze-contact-link"
						className="font-semibold text-orange-300 underline underline-offset-2 transition-colors hover:text-orange-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-300"
					>
						Contact support
					</a>
				</p>
			</div>
		</div>
	);
}
