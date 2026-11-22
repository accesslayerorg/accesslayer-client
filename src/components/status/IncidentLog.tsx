import { useMemo } from 'react';
import { Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ServiceHealth, StatusIncident } from '@/services/status.service';
import {
	formatAbsoluteDateTime,
	formatRelativeTime,
} from '@/utils/time.utils';
import {
	getIncidentDurationLabel,
	getIncidentStateMeta,
	isIncidentOngoing,
	resolveServiceLabel,
	sortIncidentsByRecency,
} from '@/utils/status.utils';

function IncidentRow({
	incident,
	services,
}: {
	incident: StatusIncident;
	services: ServiceHealth[];
}) {
	const stateMeta = getIncidentStateMeta(incident.status);
	const ongoing = isIncidentOngoing(incident);
	const startedLabel = formatAbsoluteDateTime(incident.startedAt);
	const resolvedLabel = formatAbsoluteDateTime(incident.resolvedAt);

	return (
		<li
			data-testid={`incident-${incident.id}`}
			className="rounded-2xl border border-border bg-card p-5"
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<h3 className="font-jakarta text-sm font-semibold text-foreground">
						{incident.title}
					</h3>
					{incident.summary && (
						<p className="mt-1 text-xs leading-5 text-muted-foreground">
							{incident.summary}
						</p>
					)}
				</div>

				<span
					className={cn(
						'inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider',
						stateMeta.pillClass
					)}
				>
					{stateMeta.label}
				</span>
			</div>

			<div className="mt-4 flex flex-wrap items-center gap-1.5">
				<span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
					Affected
				</span>
				{incident.affectedServiceIds.length > 0 ? (
					incident.affectedServiceIds.map(id => (
						<span
							key={id}
							className="rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
						>
							{resolveServiceLabel(id, services)}
						</span>
					))
				) : (
					<span className="text-[10px] uppercase tracking-wider text-muted-foreground">
						Unspecified
					</span>
				)}
			</div>

			<dl className="mt-4 grid gap-3 border-t border-border pt-4 text-xs sm:grid-cols-3">
				<div>
					<dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
						Started
					</dt>
					<dd className="mt-1 text-foreground">
						{startedLabel ? (
							<time dateTime={incident.startedAt}>{startedLabel}</time>
						) : (
							'—'
						)}
					</dd>
				</div>

				<div>
					<dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
						Resolved
					</dt>
					<dd className="mt-1 text-foreground">
						{resolvedLabel ? (
							<time dateTime={incident.resolvedAt ?? undefined}>
								{resolvedLabel}
							</time>
						) : (
							<span className="text-amber-600 dark:text-amber-400">
								Ongoing
							</span>
						)}
					</dd>
				</div>

				<div>
					<dt className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
						Duration
					</dt>
					<dd className="mt-1 text-foreground">
						{getIncidentDurationLabel(incident)}
						{ongoing ? ' so far' : ''}
					</dd>
				</div>
			</dl>

			{incident.updates && incident.updates.length > 0 && (
				<ol className="mt-4 space-y-3 border-t border-border pt-4">
					{incident.updates.map((update, index) => (
						<li
							key={`${incident.id}-update-${index}`}
							className="flex gap-3"
						>
							<span
								className="mt-1.5 size-1.5 shrink-0 rounded-full bg-muted-foreground/60"
								aria-hidden="true"
							/>
							<div className="min-w-0">
								<p className="text-xs font-semibold text-foreground">
									{update.state
										? getIncidentStateMeta(update.state).label
										: 'Update'}
									<span className="font-normal text-muted-foreground">
										{' · '}
										{formatRelativeTime(update.createdAt)}
									</span>
								</p>
								<p className="mt-0.5 text-xs leading-5 text-muted-foreground">
									{update.message}
								</p>
							</div>
						</li>
					))}
				</ol>
			)}
		</li>
	);
}

interface IncidentLogProps {
	incidents: StatusIncident[];
	services: ServiceHealth[];
}

/**
 * Incident log (#1051): every published incident with its title, affected
 * services, start time, resolution time, and update timeline. Newest first.
 */
export default function IncidentLog({ incidents, services }: IncidentLogProps) {
	const ordered = useMemo(() => sortIncidentsByRecency(incidents), [incidents]);

	if (ordered.length === 0) {
		return (
			<div
				data-testid="incident-log-empty"
				className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border px-6 py-12 text-center"
			>
				<Clock3 className="size-5 text-muted-foreground" aria-hidden="true" />
				<p className="text-sm font-medium text-foreground">
					No incidents reported
				</p>
				<p className="max-w-sm text-xs leading-5 text-muted-foreground">
					Everything is quiet. New incidents, updates, and resolutions are
					published here as they happen.
				</p>
			</div>
		);
	}

	return (
		<ol data-testid="incident-log" className="space-y-4">
			{ordered.map(incident => (
				<IncidentRow
					key={incident.id}
					incident={incident}
					services={services}
				/>
			))}
		</ol>
	);
}
