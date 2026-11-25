import { formatDistanceToNow } from 'date-fns';
import {
	ArrowLeftRight,
	CircleArrowUp,
	CirclePause,
	CirclePlay,
	ExternalLink,
	SlidersHorizontal,
	UserCheck,
	UserX,
	type LucideIcon,
} from 'lucide-react';
import CopyValueButton from '@/components/governance/CopyValueButton';
import {
	buildStellarExpertTxUrl,
	type StellarNetwork,
} from '@/constants/stellar';
import type { GovernanceEvent, GovernanceEventType } from '@/types/governance';
import {
	GOVERNANCE_EVENT_LABELS,
	shortenValue,
} from '@/utils/governanceAudit.utils';

const EVENT_ICONS: Record<GovernanceEventType, LucideIcon> = {
	admin_transfer_proposed: ArrowLeftRight,
	admin_transfer_accepted: UserCheck,
	admin_transfer_cancelled: UserX,
	config_change: SlidersHorizontal,
	pause: CirclePause,
	unpause: CirclePlay,
	upgrade: CircleArrowUp,
};

const EVENT_ICON_TONES: Record<GovernanceEventType, string> = {
	admin_transfer_proposed: 'bg-amber-500/15 text-amber-300',
	admin_transfer_accepted: 'bg-emerald-500/15 text-emerald-300',
	admin_transfer_cancelled: 'bg-white/10 text-white/60',
	config_change: 'bg-sky-500/15 text-sky-300',
	pause: 'bg-red-500/15 text-red-300',
	unpause: 'bg-emerald-500/15 text-emerald-300',
	upgrade: 'bg-violet-500/15 text-violet-300',
};

interface GovernanceEventRowProps {
	event: GovernanceEvent;
	network: StellarNetwork;
}

function relativeTime(iso: string): string {
	const date = new Date(iso);
	if (!iso || Number.isNaN(date.getTime())) return 'Unknown time';
	return formatDistanceToNow(date, { addSuffix: true });
}

/** One privileged change in the governance audit feed (#1351). */
export default function GovernanceEventRow({
	event,
	network,
}: GovernanceEventRowProps) {
	const Icon = EVENT_ICONS[event.type];
	const label = GOVERNANCE_EVENT_LABELS[event.type];

	return (
		<li
			data-testid={`governance-event-${event.id}`}
			data-event-type={event.type}
			className="flex gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
		>
			<span
				className={`flex size-9 shrink-0 items-center justify-center rounded-full ${EVENT_ICON_TONES[event.type]}`}
				data-testid={`governance-event-icon-${event.type}`}
			>
				<Icon className="size-4" aria-hidden="true" />
			</span>

			<div className="min-w-0 flex-1">
				<div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
					<h3 className="font-jakarta text-sm font-semibold text-white">
						{label}
					</h3>
					{event.timestamp ? (
						<time
							dateTime={event.timestamp}
							title={new Date(event.timestamp).toLocaleString()}
							className="text-xs text-white/45"
						>
							{relativeTime(event.timestamp)}
						</time>
					) : (
						<span className="text-xs text-white/45">Unknown time</span>
					)}
				</div>

				{event.details && (
					<p className="mt-1 text-sm text-white/65">{event.details}</p>
				)}

				<dl className="mt-2 grid gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
					<div className="flex min-w-0 items-center gap-1">
						<dt className="text-white/40">Actor</dt>
						<dd className="flex min-w-0 items-center gap-0.5">
							<span
								className="truncate font-mono text-white/80"
								title={event.actor}
							>
								{event.actor ? shortenValue(event.actor) : 'Unknown'}
							</span>
							{event.actor && (
								<CopyValueButton
									value={event.actor}
									label="actor address"
								/>
							)}
						</dd>
					</div>
					{event.target && (
						<div className="flex min-w-0 items-center gap-1">
							<dt className="text-white/40">Target</dt>
							<dd className="flex min-w-0 items-center gap-0.5">
								<span
									className="truncate font-mono text-white/80"
									title={event.target}
								>
									{shortenValue(event.target)}
								</span>
								<CopyValueButton value={event.target} label="target" />
							</dd>
						</div>
					)}
				</dl>

				{event.txHash && (
					<div className="mt-2 flex items-center gap-1 text-xs">
						<a
							href={buildStellarExpertTxUrl(event.txHash, network)}
							target="_blank"
							rel="noopener noreferrer"
							className="inline-flex items-center gap-1 text-amber-300 hover:text-amber-200 hover:underline"
						>
							<span className="font-mono">
								{shortenValue(event.txHash, 6, 6)}
							</span>
							<ExternalLink className="size-3" aria-hidden="true" />
							<span className="sr-only">
								View {label.toLowerCase()} transaction on Stellar Expert
								(opens in a new tab)
							</span>
						</a>
						<CopyValueButton
							value={event.txHash}
							label="transaction hash"
						/>
					</div>
				)}
			</div>
		</li>
	);
}
