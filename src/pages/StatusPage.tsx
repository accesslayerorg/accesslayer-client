import { AlertTriangle, ArrowLeft, RefreshCw } from 'lucide-react';
import { Link } from 'react-router';
import IncidentLog from '@/components/status/IncidentLog';
import OverallStatusBanner from '@/components/status/OverallStatusBanner';
import ServiceHealthGrid from '@/components/status/ServiceHealthGrid';
import StatusPageSkeleton from '@/components/status/StatusPageSkeleton';
import StatusSubscribeForm from '@/components/status/StatusSubscribeForm';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import {
	STATUS_REFETCH_INTERVAL_MS,
	usePlatformStatus,
} from '@/hooks/usePlatformStatus';
import { ApiError } from '@/services/api.service';
import {
	getActiveIncidents,
	summarizeServiceStatuses,
} from '@/utils/status.utils';

interface StatusFeedUnavailableProps {
	error: unknown;
	isRetrying: boolean;
	onRetry: () => void;
}

function StatusFeedUnavailable({
	error,
	isRetrying,
	onRetry,
}: StatusFeedUnavailableProps) {
	const message =
		error instanceof ApiError && error.message
			? error.message
			: 'The status feed could not be reached.';

	return (
		<section
			role="alert"
			data-testid="status-feed-unavailable"
			className="rounded-2xl border border-amber-500/30 bg-amber-500/5 px-6 py-6"
		>
			<div className="flex items-start gap-4">
				<span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-300">
					<AlertTriangle className="size-6" aria-hidden="true" />
				</span>
				<div className="min-w-0">
					<h2 className="font-jakarta text-base font-semibold text-foreground">
						Live status is unavailable
					</h2>
					<p className="mt-1 text-sm text-muted-foreground">{message}</p>
					<p className="mt-1 text-xs leading-5 text-muted-foreground">
						The health grid and incident log come back as soon as the status
						feed responds. This page keeps retrying every{' '}
						{Math.round(STATUS_REFETCH_INTERVAL_MS / 1000)} seconds.
					</p>
					<button
						type="button"
						onClick={onRetry}
						disabled={isRetrying}
						aria-busy={isRetrying || undefined}
						className="mt-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-4 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60"
					>
						<RefreshCw
							className={
								isRetrying
									? 'size-3.5 animate-spin motion-reduce:animate-none'
									: 'size-3.5'
							}
							aria-hidden="true"
						/>
						{isRetrying ? 'Retrying…' : 'Retry now'}
					</button>
				</div>
			</div>
		</section>
	);
}

/**
 * Public platform status page (#1051).
 *
 * Shows the health of the core services (contract RPC, indexer, API, IPFS),
 * 30 days of uptime history, the published incident log, and an email
 * subscribe form. The snapshot is polled every 60 seconds.
 */
export default function StatusPage() {
	useDocumentTitle('Platform status — AccessLayer');
	useNavigationTiming('status');

	const { data, isLoading, isFetching, error, refetch } = usePlatformStatus();

	const services = data?.services ?? [];
	const incidents = data?.incidents ?? [];
	const activeIncidents = getActiveIncidents(incidents).length;
	const pollLabel = `Refreshes every ${Math.round(
		STATUS_REFETCH_INTERVAL_MS / 1000
	)}s`;

	return (
		<main className="mx-auto max-w-5xl px-6 py-16">
			<Link
				to="/"
				className="mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-3.5" aria-hidden="true" />
				Back to marketplace
			</Link>

			<header className="mb-8 flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="font-mono text-[10px] uppercase tracking-[0.28em] text-muted-foreground">
						Access Layer
					</p>
					<h1 className="mt-2 font-grotesque text-3xl font-black tracking-tight text-foreground sm:text-4xl">
						Platform status
					</h1>
					<p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
						Live health for the services that power creator keys, with 30 days
						of uptime history and every incident we have published.
					</p>
				</div>

				<span
					role="status"
					aria-live="polite"
					aria-busy={isFetching || undefined}
					data-testid="status-refresh-badge"
					className="inline-flex items-center gap-2 rounded-full border border-border bg-muted/40 px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
				>
					{isFetching ? (
						<RefreshCw
							className="size-3 animate-spin motion-reduce:animate-none"
							aria-hidden="true"
						/>
					) : (
						<span
							className="size-1.5 animate-pulse rounded-full bg-emerald-400 motion-reduce:animate-none"
							aria-hidden="true"
						/>
					)}
					{isFetching ? 'Refreshing…' : pollLabel}
				</span>
			</header>

			{isLoading ? (
				<StatusPageSkeleton />
			) : data ? (
				<>
					<OverallStatusBanner
						status={summarizeServiceStatuses(services)}
						updatedAt={data.updatedAt}
						activeIncidents={activeIncidents}
						isRefreshing={isFetching}
						onRefresh={() => {
							void refetch();
						}}
					/>

					<section
						aria-labelledby="status-services-heading"
						className="mt-10"
					>
						<div className="mb-4 flex flex-wrap items-end justify-between gap-2">
							<h2
								id="status-services-heading"
								className="font-jakarta text-lg font-semibold text-foreground"
							>
								Core services
							</h2>
							<p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
								{services.length} monitored
							</p>
						</div>

						<ServiceHealthGrid services={services} />

						<p className="mt-4 text-xs leading-5 text-muted-foreground">
							Each bar is one day of uptime. Green is at or above 99.5%, amber
							at or above 95%, red below 95%, and grey means no data was
							reported.
						</p>
					</section>

					<section
						aria-labelledby="status-incidents-heading"
						className="mt-12"
					>
						<div className="mb-4 flex flex-wrap items-end justify-between gap-2">
							<h2
								id="status-incidents-heading"
								className="font-jakarta text-lg font-semibold text-foreground"
							>
								Incident log
							</h2>
							<p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
								{incidents.length} incident
								{incidents.length === 1 ? '' : 's'} · {activeIncidents} active
							</p>
						</div>

						<IncidentLog incidents={incidents} services={services} />
					</section>
				</>
			) : (
				<StatusFeedUnavailable
					error={error}
					isRetrying={isFetching}
					onRetry={() => {
						void refetch();
					}}
				/>
			)}

			<div className="mt-12">
				<StatusSubscribeForm />
			</div>
		</main>
	);
}
