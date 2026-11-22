import { Link, useSearchParams } from 'react-router';
import { ArrowLeft, Loader2 } from 'lucide-react';
import CurrentAdminCard from '@/components/governance/CurrentAdminCard';
import GovernanceEventRow from '@/components/governance/GovernanceEventRow';
import PendingAdminTransferNotice from '@/components/governance/PendingAdminTransferNotice';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';
import {
	useGovernanceAdmin,
	useGovernanceEvents,
} from '@/hooks/useGovernanceEvents';
import { useNowMs } from '@/hooks/useNowMs';
import { env } from '@/utils/env.utils';
import {
	GOVERNANCE_EVENT_LABELS,
	GOVERNANCE_EVENT_TYPES,
	isGovernanceEventType,
	type GovernanceEventFilter,
} from '@/utils/governanceAudit.utils';

const FILTER_OPTIONS: Array<{ value: GovernanceEventFilter; label: string }> = [
	{ value: 'all', label: 'All events' },
	...GOVERNANCE_EVENT_TYPES.map(type => ({
		value: type,
		label: GOVERNANCE_EVENT_LABELS[type],
	})),
];

/**
 * Public audit feed of admin transfers and privileged protocol changes (#1351).
 * Readable without a wallet connection: it uses only public API data.
 */
export default function GovernanceFeedPage() {
	useDocumentTitle('Governance Activity — AccessLayer');

	const [searchParams, setSearchParams] = useSearchParams();
	const rawType = searchParams.get('type');
	const filter: GovernanceEventFilter = isGovernanceEventType(rawType)
		? rawType
		: 'all';
	const activeType = filter === 'all' ? undefined : filter;

	const network = env.VITE_STELLAR_NETWORK;
	const nowMs = useNowMs();

	const adminQuery = useGovernanceAdmin();
	const eventsQuery = useGovernanceEvents(activeType);

	const { hasNextPage, isFetchingNextPage, fetchNextPage } = eventsQuery;
	const sentinelRef = useInfiniteScroll<HTMLDivElement>({
		enabled: !isFetchingNextPage,
		hasMore: Boolean(hasNextPage),
		onLoadMore: () => void fetchNextPage(),
	});

	const admin = adminQuery.data;
	const hasPendingTransfer = Boolean(admin?.pendingAdmin);

	// Guard against a backend that ignores the type param: the filter must
	// still limit the feed to the chosen type.
	const events = (eventsQuery.data?.pages ?? [])
		.flatMap(page => page.items)
		.filter(event => !activeType || event.type === activeType);

	const handleFilterChange = (next: GovernanceEventFilter) => {
		setSearchParams(
			params => {
				const updated = new URLSearchParams(params);
				if (next === 'all') updated.delete('type');
				else updated.set('type', next);
				return updated;
			},
			{ replace: true }
		);
	};

	return (
		<main className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-6 lg:px-8">
			<div className="mx-auto max-w-4xl space-y-6">
				<Link
					to="/governance"
					className="inline-flex items-center gap-1.5 text-sm text-white/40 transition-colors hover:text-white/70"
				>
					<ArrowLeft className="size-4" aria-hidden="true" />
					Back to governance
				</Link>

				<header>
					<h1 className="font-grotesque text-3xl font-black tracking-tight sm:text-4xl">
						Governance activity
					</h1>
					<p className="mt-2 max-w-2xl font-jakarta text-sm text-white/60">
						A public record of who controls the protocol and every
						privileged change: admin transfers, configuration updates,
						pauses and upgrades.
					</p>
				</header>

				{hasPendingTransfer && admin?.pendingAdmin && (
					<PendingAdminTransferNotice
						pendingAdmin={admin.pendingAdmin}
						expiresAt={admin.pendingExpiresAt}
						nowMs={nowMs}
					/>
				)}

				<CurrentAdminCard
					admin={admin}
					isLoading={adminQuery.isLoading}
					isError={adminQuery.isError}
					network={network}
					nowMs={nowMs}
				/>

				<section
					aria-labelledby="governance-feed-heading"
					className="space-y-4"
				>
					<div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						<h2
							id="governance-feed-heading"
							className="font-grotesque text-xl font-bold"
						>
							Event feed
						</h2>
						<label className="flex items-center gap-2 text-sm text-white/60">
							<span>Event type</span>
							<select
								value={filter}
								onChange={e =>
									handleFilterChange(
										e.target.value as GovernanceEventFilter
									)
								}
								className="rounded-md border border-white/15 bg-[#0b1a2e] px-3 py-1.5 text-sm text-white focus:border-amber-400/50 focus:outline-none focus:ring-1 focus:ring-amber-400/30"
							>
								{FILTER_OPTIONS.map(option => (
									<option key={option.value} value={option.value}>
										{option.label}
									</option>
								))}
							</select>
						</label>
					</div>

					{eventsQuery.isLoading && (
						<p
							className="flex items-center gap-2 text-sm text-white/50"
							aria-live="polite"
						>
							<Loader2
								className="size-4 animate-spin"
								aria-hidden="true"
							/>
							Loading events…
						</p>
					)}

					{eventsQuery.isError && !eventsQuery.isLoading && (
						<div
							role="alert"
							className="rounded-xl border border-red-500/30 bg-red-500/[0.06] p-4 text-sm text-red-200"
						>
							<p>Could not load governance events.</p>
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="mt-3"
								onClick={() => void eventsQuery.refetch()}
							>
								Try again
							</Button>
						</div>
					)}

					{!eventsQuery.isLoading &&
						!eventsQuery.isError &&
						events.length === 0 && (
							<p
								className="rounded-xl border border-white/10 bg-white/[0.02] p-6 text-center text-sm text-white/50"
								data-testid="governance-feed-empty"
							>
								{activeType
									? `No ${GOVERNANCE_EVENT_LABELS[activeType].toLowerCase()} events yet.`
									: 'No governance events yet.'}
							</p>
						)}

					{events.length > 0 && (
						<ul
							className="space-y-3"
							data-testid="governance-feed-list"
							aria-label="Governance events"
						>
							{events.map(event => (
								<GovernanceEventRow
									key={event.id}
									event={event}
									network={network}
								/>
							))}
						</ul>
					)}

					{eventsQuery.hasNextPage && (
						<div ref={sentinelRef} className="flex justify-center">
							<Button
								type="button"
								variant="outline"
								onClick={() => void eventsQuery.fetchNextPage()}
								disabled={eventsQuery.isFetchingNextPage}
								aria-busy={eventsQuery.isFetchingNextPage}
							>
								{eventsQuery.isFetchingNextPage && (
									<Loader2
										className="animate-spin"
										aria-hidden="true"
									/>
								)}
								{eventsQuery.isFetchingNextPage
									? 'Loading…'
									: 'Load more'}
							</Button>
						</div>
					)}
				</section>
			</div>
		</main>
	);
}
