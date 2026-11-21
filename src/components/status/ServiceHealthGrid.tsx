import {
	AlertTriangle,
	CheckCircle2,
	XCircle,
	type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceHealth, ServiceStatus } from '@/services/status.service';
import {
	UPTIME_DEGRADED_THRESHOLD,
	UPTIME_WINDOW_DAYS,
	buildUptimeSeries,
	formatUptimePercentage,
	getServiceStatusMeta,
	getUptimeBarClass,
	resolveUptimePercentage,
	type UptimeSeriesPoint,
} from '@/utils/status.utils';

const STATUS_ICONS: Record<ServiceStatus, LucideIcon> = {
	operational: CheckCircle2,
	degraded: AlertTriangle,
	down: XCircle,
};

function formatDayLabel(date: string): string {
	const parsed = new Date(`${date}T00:00:00`);
	if (Number.isNaN(parsed.getTime())) return date;

	return parsed.toLocaleDateString(undefined, {
		month: 'short',
		day: 'numeric',
	});
}

function UptimeStrip({
	series,
	serviceName,
}: {
	series: UptimeSeriesPoint[];
	serviceName: string;
}) {
	const reported = series.filter(point => point.uptimePercentage != null).length;
	const healthy = series.filter(
		point =>
			point.uptimePercentage != null &&
			point.uptimePercentage >= UPTIME_DEGRADED_THRESHOLD
	).length;

	const description =
		reported === 0
			? `No uptime history reported for ${serviceName} yet.`
			: `${serviceName} daily uptime for the last ${series.length} days: ${healthy} of ${reported} reported days at or above ${UPTIME_DEGRADED_THRESHOLD}% uptime.`;

	return (
		<div>
			<div className="flex items-end gap-[3px]" role="img" aria-label={description}>
				{series.map(point => (
					<span
						key={point.date}
						// Fixed bar height keeps the strip from shifting as it refreshes.
						className={cn(
							'h-8 min-w-0 flex-1 rounded-sm',
							getUptimeBarClass(point.uptimePercentage)
						)}
						title={
							point.uptimePercentage == null
								? `${formatDayLabel(point.date)} — no data reported`
								: `${formatDayLabel(point.date)} — ${formatUptimePercentage(point.uptimePercentage)} uptime`
						}
						aria-hidden="true"
					/>
				))}
			</div>
			<div className="mt-2 flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
				<span>{series.length} days ago</span>
				<span>Today</span>
			</div>
		</div>
	);
}

interface ServiceHealthGridProps {
	services: ServiceHealth[];
}

/**
 * Service health grid (#1051): one card per monitored service with its
 * current state, 30-day uptime percentage, and day-by-day uptime strip.
 */
export default function ServiceHealthGrid({ services }: ServiceHealthGridProps) {
	if (services.length === 0) {
		return (
			<div className="rounded-2xl border border-dashed border-border px-6 py-12 text-center">
				<p className="text-sm text-muted-foreground">
					No services are being monitored yet.
				</p>
			</div>
		);
	}

	return (
		<div className="grid gap-4 sm:grid-cols-2">
			{services.map(service => {
				const meta = getServiceStatusMeta(service.status);
				const Icon = STATUS_ICONS[service.status];
				const uptime = resolveUptimePercentage(service);
				const series = buildUptimeSeries(service.dailyUptime);

				return (
					<article
						key={service.id}
						className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-5 transition-colors hover:border-foreground/20"
					>
						<header className="flex items-start justify-between gap-3">
							<div className="min-w-0">
								<h3 className="font-jakarta text-sm font-semibold text-foreground">
									{service.name}
								</h3>
								{service.description && (
									<p className="mt-1 text-xs leading-5 text-muted-foreground">
										{service.description}
									</p>
								)}
							</div>

							<span
								data-testid={`service-status-${service.id}`}
								className={cn(
									'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
									meta.pillClass
								)}
							>
								<Icon className="size-3.5" aria-hidden="true" />
								{meta.label}
							</span>
						</header>

						<div className="flex items-end justify-between gap-4">
							<div>
								<p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
									{UPTIME_WINDOW_DAYS}-day uptime
								</p>
								<p
									data-testid={`service-uptime-${service.id}`}
									className="mt-1 font-grotesque text-2xl font-black tabular-nums text-foreground"
								>
									{formatUptimePercentage(uptime)}
								</p>
							</div>

							{service.responseTimeMs != null && (
								<p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
									{Math.round(service.responseTimeMs)} ms
								</p>
							)}
						</div>

						<UptimeStrip series={series} serviceName={service.name} />
					</article>
				);
			})}
		</div>
	);
}
