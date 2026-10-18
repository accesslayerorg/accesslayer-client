import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatAbsoluteDateTime } from '@/utils/time.utils';

export interface KeyFreezeBannerProps {
	isFrozen?: boolean;
	reason?: string | null;
	expiry?: string | number | null;
	adminContactUrl?: string;
	onExpiryReached?: () => void;
	className?: string;
}

export function formatFreezeExpiry(expiry?: string | number | null): string {
	if (!expiry) return 'indefinite';

	const timestamp = typeof expiry === 'number' ? expiry : Date.parse(expiry);
	if (isNaN(timestamp)) return 'indefinite';

	const iso = new Date(timestamp).toISOString();
	return formatAbsoluteDateTime(iso) ?? new Date(timestamp).toLocaleString();
}

/**
 * Orange warning banner displayed below key header when a key freeze is active (#1121).
 * Displays freeze reason, expiry timestamp (or 'indefinite'), and admin contact link.
 * Automatically dismisses when expiry time is reached.
 */
export default function KeyFreezeBanner({
	isFrozen = false,
	reason,
	expiry,
	adminContactUrl = 'mailto:admin@accesslayer.org',
	onExpiryReached,
	className,
}: KeyFreezeBannerProps) {
	const [dismissed, setDismissed] = useState(false);

	const expiryTimestamp = useMemo(() => {
		if (!expiry) return null;
		const ts = typeof expiry === 'number' ? expiry : Date.parse(expiry);
		return isNaN(ts) ? null : ts;
	}, [expiry]);

	const formattedExpiry = useMemo(
		() => formatFreezeExpiry(expiry),
		[expiry]
	);

	useEffect(() => {
		if (!isFrozen || !expiryTimestamp) return;

		const remainingMs = expiryTimestamp - Date.now();
		if (remainingMs <= 0) {
			setDismissed(true);
			onExpiryReached?.();
			return;
		}

		const timer = setTimeout(() => {
			setDismissed(true);
			onExpiryReached?.();
		}, remainingMs);

		return () => clearTimeout(timer);
	}, [isFrozen, expiryTimestamp, onExpiryReached]);

	if (!isFrozen || dismissed) {
		return null;
	}

	return (
		<aside
			role="alert"
			data-testid="key-freeze-banner"
			className={cn(
				'flex flex-col gap-3 rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 p-4 text-amber-200 shadow-xl backdrop-blur-md sm:flex-row sm:items-center sm:justify-between',
				className
			)}
		>
			<div className="flex items-start gap-3">
				<div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/20 text-amber-300">
					<AlertTriangle className="size-5" aria-hidden="true" />
				</div>
				<div className="space-y-1">
					<div className="flex flex-wrap items-center gap-2">
						<span className="font-grotesque text-base font-bold text-amber-100">
							Key Trading Frozen
						</span>
						<span className="text-white/30" aria-hidden="true">
							•
						</span>
						<span className="text-xs text-amber-300/80">
							Expiry:{' '}
							<strong
								data-testid="freeze-expiry"
								className="font-mono font-semibold text-amber-200"
							>
								{formattedExpiry}
							</strong>
						</span>
					</div>
					<p
						data-testid="freeze-reason"
						className="text-sm text-amber-200/90"
					>
						{reason ||
							'Trading has been temporarily frozen by an administrator.'}
					</p>
				</div>
			</div>

			<a
				href={adminContactUrl}
				data-testid="freeze-admin-contact"
				className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl border border-amber-400/30 bg-amber-400/20 px-3.5 py-2 text-xs font-bold text-amber-100 transition-colors hover:bg-amber-400/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
			>
				Contact Admin
				<ExternalLink className="size-3.5" aria-hidden="true" />
			</a>
		</aside>
	);
}
