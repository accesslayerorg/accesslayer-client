import { useAccount } from 'wagmi';
import { Clock3, Ticket, Users } from 'lucide-react';
import ConnectWalletButton from '@/components/common/ConnectWalletButton';
import { Button } from '@/components/ui/button';
import { useEventRedemption, useRedeemPass } from '@/hooks/useEvents';
import { useNowMs } from '@/hooks/useNowMs';
import { getEventStatus, type CreatorEvent } from '@/services/events.service';
import { formatCountdownDuration } from '@/utils/mergeProposal.utils';
import { cn } from '@/lib/utils';

export interface RedeemPassCardProps {
	event: CreatorEvent;
	heldKeyIds: string[];
}

export default function RedeemPassCard({
	event,
	heldKeyIds,
}: RedeemPassCardProps) {
	const { address } = useAccount();
	const nowMs = useNowMs();
	const redemption = useEventRedemption(event.id, address, heldKeyIds);
	const redeem = useRedeemPass();
	const status = getEventStatus(event, nowMs);
	const eligibility = redemption.eligibility;

	const countdown =
		status.status === 'upcoming'
			? `Starts in ${formatCountdownDuration(
					new Date(event.startsAt).getTime() - nowMs
				)}`
			: status.status === 'open'
				? `Closes in ${formatCountdownDuration(
						new Date(event.endsAt).getTime() - nowMs
					)}`
				: status.closeReason === 'exhausted'
					? 'Closed — all passes redeemed'
					: 'Closed';

	return (
		<article
			className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 shadow-xl backdrop-blur-md"
			data-testid={`event-card-${event.id}`}
		>
			<div className="flex flex-wrap items-start justify-between gap-3">
				<div className="min-w-0">
					<p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400/80">
						{event.keyName}
					</p>
					<h3 className="mt-1 text-lg font-bold">{event.title}</h3>
					<p className="mt-1 text-sm text-white/45">{event.description}</p>
				</div>
				<span
					className={cn(
						'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider',
						status.status === 'open'
							? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
							: status.status === 'upcoming'
								? 'border-sky-500/30 bg-sky-500/10 text-sky-300'
								: 'border-white/15 bg-white/5 text-white/45'
					)}
					data-testid={`event-status-${event.id}`}
				>
					{status.status === 'open' && (
						<Clock3 className="size-3" aria-hidden="true" />
					)}
					{status.status}
				</span>
			</div>

			<div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-white/50">
				<span className="flex items-center gap-1.5">
					<Ticket className="size-3.5 text-amber-300" aria-hidden="true" />
					{status.remaining} of {event.passSupply} passes left
				</span>
				<span className="flex items-center gap-1.5">
					<Users className="size-3.5 text-sky-300" aria-hidden="true" />
					Max {event.perWalletCap} per wallet
				</span>
				<span data-testid={`event-countdown-${event.id}`}>{countdown}</span>
			</div>

			<div className="mt-4 flex flex-wrap items-center gap-3 border-t border-white/5 pt-4">
				{!address ? (
					<ConnectWalletButton />
				) : (
					<Button
						size="sm"
						disabled={!eligibility.eligible || redeem.isPending}
						onClick={() =>
							redeem.mutate({
								eventId: event.id,
								wallet: address,
								heldKeyIds,
							})
						}
						className="bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300"
						data-testid={`redeem-${event.id}`}
					>
						{redeem.isPending ? 'Redeeming…' : 'Redeem pass'}
					</Button>
				)}
				{eligibility.redeemedByWallet > 0 && (
					<p
						className="text-xs text-emerald-300/75"
						data-testid={`redeemed-count-${event.id}`}
					>
						You have redeemed {eligibility.redeemedByWallet} pass
						{eligibility.redeemedByWallet === 1 ? '' : 'es'}.
					</p>
				)}
				{address && !eligibility.eligible && eligibility.reason && (
					<p
						className="text-xs text-white/40"
						data-testid={`redeem-reason-${event.id}`}
					>
						{eligibility.reason}
					</p>
				)}
			</div>
		</article>
	);
}
