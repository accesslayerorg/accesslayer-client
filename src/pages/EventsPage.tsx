import { Link } from 'react-router';
import { useAccount } from 'wagmi';
import { ArrowLeft, CalendarClock } from 'lucide-react';
import CreateEventForm from '@/components/events/CreateEventForm';
import EmptyState from '@/components/common/EmptyState';
import RedeemPassCard from '@/components/events/RedeemPassCard';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useEvents } from '@/hooks/useEvents';
import { useWalletHoldings } from '@/hooks/useWallet';
import { getEventStatus } from '@/services/events.service';

export default function EventsPage() {
	useDocumentTitle('Creator events — AccessLayer');
	const { address } = useAccount();
	const eventsQuery = useEvents();
	const holdingsQuery = useWalletHoldings(address ?? '');
	const events = eventsQuery.data ?? [];
	const heldKeyIds = (holdingsQuery.data ?? [])
		.filter(position => (position.quantity ?? 0) > 0)
		.map(position => position.creatorId);
	const active = events.filter(
		event => getEventStatus(event).status !== 'closed'
	);
	const closed = events.filter(
		event => getEventStatus(event).status === 'closed'
	);

	return (
		<main
			className="min-h-screen bg-[#06111f] px-4 py-8 text-white sm:px-6 lg:px-8"
			data-testid="events-page"
		>
			<div className="mx-auto max-w-5xl space-y-8">
				<Link
					to="/"
					className="inline-flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70"
				>
					<ArrowLeft className="size-4" aria-hidden="true" />
					Back to marketplace
				</Link>

				<header>
					<p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.22em] text-amber-400/80">
						<CalendarClock className="size-3.5" aria-hidden="true" />
						Creator events
					</p>
					<h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">
						Holder passes
					</h1>
					<p className="mt-2 max-w-xl text-sm text-white/50">
						Redeem passes while an event is open. Eligibility, remaining
						supply and per-wallet caps are enforced when you redeem.
					</p>
				</header>

				<CreateEventForm />

				<section className="space-y-4" data-testid="active-events">
					<h2 className="text-lg font-bold">Upcoming &amp; open</h2>
					{!eventsQuery.isLoading && active.length === 0 && (
						<EmptyState
							title="No active events"
							message="Check back soon — creators publish new holder events here."
							data-testid="events-empty"
						/>
					)}
					{active.map(event => (
						<RedeemPassCard
							key={event.id}
							event={event}
							heldKeyIds={heldKeyIds}
						/>
					))}
				</section>

				{closed.length > 0 && (
					<section className="space-y-4" data-testid="closed-events">
						<h2 className="text-lg font-bold text-white/55">Closed</h2>
						{closed.map(event => (
							<RedeemPassCard
								key={event.id}
								event={event}
								heldKeyIds={heldKeyIds}
							/>
						))}
					</section>
				)}
			</div>
		</main>
	);
}
