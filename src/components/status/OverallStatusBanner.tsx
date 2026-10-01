import {
	AlertTriangle,
	CheckCircle2,
	RefreshCw,
	XCircle,
	type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceStatus } from '@/services/status.service';
import { formatRelativeTime } from '@/utils/time.utils';
import { getServiceStatusMeta } from '@/utils/status.utils';

const STATUS_ICONS: Record<ServiceStatus, LucideIcon> = {
	operational: CheckCircle2,
	degraded: AlertTriangle,
	down: XCircle,
};

const STATUS_SURFACE: Record<ServiceStatus, string> = {
	operational: 'border-emerald-500/30 bg-emerald-500/5',
	degraded: 'border-amber-500/30 bg-amber-500/5',
	down: 'border-red-500/30 bg-red-500/5',
};

interface OverallStatusBannerProps {
	/** Worst status across the monitored services. */
	status: ServiceStatus;
	/** ISO timestamp of the snapshot currently on screen. */
	updatedAt: string;
	/** Incidents that have not been resolved yet. */
	activeIncidents: number;
	isRefreshing: boolean;
	onRefresh: () => void;
}

/**
 * Headline of the platform status page: the aggregated state of every
 * monitored service plus when the snapshot was last refreshed.
 */
export default function OverallStatusBanner({
	status,
	updatedAt,
	activeIncidents,
	isRefreshing,
	onRefresh,
}: OverallStatusBannerProps) {
	const meta = getServiceStatusMeta(status);
	const Icon = STATUS_ICONS[status];

	const incidentLabel =
		activeIncidents === 0
			? 'No active incidents'
			: `${activeIncidents} active incident${activeIncidents === 1 ? '' : 's'}`;

	return (
		<section
			aria-label="Overall platform status"
			className={cn(
				'flex flex-wrap items-center justify-between gap-6 rounded-2xl border px-6 py-6',
				STATUS_SURFACE[status]
			)}
		>
			<div className="flex min-w-0 items-center gap-4">
				<span
					className={cn(
						'inline-flex size-12 shrink-0 items-center justify-center rounded-full border',
						meta.pillClass
					)}
				>
					<Icon className="size-6" aria-hidden="true" />
				</span>

				<div className="min-w-0">
					<p
						role="status"
						aria-live="polite"
						className="font-grotesque text-xl font-black tracking-tight text-foreground sm:text-2xl"
					>
						{meta.summary}
					</p>
					<p className="mt-1 text-xs text-muted-foreground">
						{incidentLabel}
						<span aria-hidden="true"> · </span>
						<span>Updated {formatRelativeTime(updatedAt)}</span>
					</p>
				</div>
			</div>

			<button
				type="button"
				onClick={onRefresh}
				disabled={isRefreshing}
				aria-busy={isRefreshing || undefined}
				className="inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
			>
				<RefreshCw
					className={cn(
						'size-3.5',
						isRefreshing && 'animate-spin motion-reduce:animate-none'
					)}
					aria-hidden="true"
				/>
				{isRefreshing ? 'Refreshing…' : 'Refresh now'}
			</button>
		</section>
	);
}
