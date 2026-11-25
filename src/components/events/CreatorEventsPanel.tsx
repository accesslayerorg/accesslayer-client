import { useAccount } from 'wagmi';
import { TicketX } from 'lucide-react';
import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import CreateEventForm from '@/components/events/CreateEventForm';
import { Button } from '@/components/ui/button';
import { useCloseEvent, useEvents } from '@/hooks/useEvents';
import { useNowMs } from '@/hooks/useNowMs';
import { getEventStatus } from '@/services/events.service';

export interface CreatorEventsPanelProps {
	creatorId: string;
}

export default function CreatorEventsPanel({
	creatorId,
}: CreatorEventsPanelProps) {
	const { address } = useAccount();
	const nowMs = useNowMs(5000);
	const eventsQuery = useEvents(address);
	const closeEvent = useCloseEvent();

	const events = (eventsQuery.data ?? []).filter(
		event => event.keyId === creatorId
	);

	return (
		<section className="space-y-5" data-testid="creator-events-panel">
			<CreateEventForm />

			<div className="space-y-3">
				<h3 className="text-sm font-bold text-white/80">Your events</h3>
				{!address && (
					<div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3">
						<p className="flex-1 text-xs text-amber-100/80">
							Connect your creator wallet to manage events.
						</p>
						<ConnectWalletButton />
					</div>
				)}
				{address && events.length === 0 && (
					<p className="rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/40">
						No events created for this key yet.
					</p>
				)}
				{events.map(event => {
					const status = getEventStatus(event, nowMs);
					return (
						<div
							key={event.id}
							className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-4"
							data-testid={`creator-event-${event.id}`}
						>
							<div className="min-w-0">
								<p className="text-sm font-semibold text-white/85">
									{event.title}
								</p>
								<p className="text-xs text-white/40">
									{event.redeemed}/{event.passSupply} passes redeemed ·{' '}
									{status.status}
								</p>
							</div>
							{status.status !== 'closed' && address && (
								<Button
									size="sm"
									variant="outline"
									disabled={closeEvent.isPending}
									onClick={() =>
										closeEvent.mutate({
											eventId: event.id,
											creator: address,
										})
									}
									className="border-rose-500/30 text-rose-200 hover:bg-rose-500/10"
									data-testid={`close-event-${event.id}`}
								>
									<TicketX
										className="mr-1 size-3.5"
										aria-hidden="true"
									/>
									Close event
								</Button>
							)}
						</div>
					);
				})}
			</div>
		</section>
	);
}
