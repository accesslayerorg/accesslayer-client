import { LifeBuoy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useMySupportTickets } from '@/hooks/useSupportTickets';
import {
	SUPPORT_TICKET_ISSUE_TYPE_LABELS,
	type SupportTicketStatus,
} from '@/services/supportTicket.service';
import { formatTimestampTooltip } from '@/utils/time.utils';

export interface MyTicketsSectionProps {
	className?: string;
}

const STATUS_CLASSNAME: Record<SupportTicketStatus, string> = {
	open: 'border-amber-400/30 bg-amber-400/15 text-amber-300',
	in_review: 'border-sky-400/30 bg-sky-400/15 text-sky-300',
	resolved: 'border-emerald-400/30 bg-emerald-400/15 text-emerald-300',
	closed: 'border-white/10 bg-white/5 text-white/40',
};

const STATUS_LABELS: Record<SupportTicketStatus, string> = {
	open: 'Open',
	in_review: 'In review',
	resolved: 'Resolved',
	closed: 'Closed',
};

/**
 * Lists the support tickets the signed-in user has submitted (#1250),
 * newest first, in the account settings surface.
 */
export default function MyTicketsSection({ className }: MyTicketsSectionProps) {
	const { data: tickets, isLoading, isError } = useMySupportTickets();

	return (
		<section
			className={cn(
				'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
			data-testid="my-tickets-section"
		>
			<header className="mb-6 flex items-start gap-3">
				<LifeBuoy className="mt-0.5 size-6 text-amber-300" aria-hidden="true" />
				<div>
					<h2 className="font-grotesque text-xl font-black tracking-tight text-white">
						My tickets
					</h2>
					<p className="mt-1 text-sm text-white/50">
						Issues you've reported about your keys, and their status.
					</p>
				</div>
			</header>

			{isLoading && (
				<div data-testid="my-tickets-loading" className="space-y-3">
					{Array.from({ length: 2 }).map((_, index) => (
						<div
							key={index}
							className="h-16 w-full animate-pulse rounded-xl bg-white/5"
						/>
					))}
				</div>
			)}

			{!isLoading && isError && (
				<div
					role="alert"
					data-testid="my-tickets-error"
					className="rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-200"
				>
					We couldn't load your support tickets. Please refresh and try
					again.
				</div>
			)}

			{!isLoading && !isError && (tickets?.length ?? 0) === 0 && (
				<div
					data-testid="my-tickets-empty"
					className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 py-16 text-center"
				>
					<div className="flex size-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/50">
						<LifeBuoy className="size-6" aria-hidden="true" />
					</div>
					<p className="text-sm text-white/50">
						You haven't reported any issues
					</p>
				</div>
			)}

			{!isLoading && !isError && tickets && tickets.length > 0 && (
				<ul
					data-testid="my-tickets-list"
					className="divide-y divide-white/10 rounded-xl border border-white/10"
				>
					{tickets.map(ticket => {
						const { display, title } = formatTimestampTooltip(
							ticket.createdAt
						);
						return (
							<li
								key={ticket.id}
								data-testid={`ticket-row-${ticket.id}`}
								className="flex flex-wrap items-center gap-4 px-4 py-4"
							>
								<div className="min-w-0 flex-1">
									<div className="flex flex-wrap items-center gap-2">
										<p className="truncate font-jakarta text-sm font-semibold text-white">
											{SUPPORT_TICKET_ISSUE_TYPE_LABELS[ticket.issueType]}
											{ticket.keyName ? ` · ${ticket.keyName}` : ''}
										</p>
										<span
											data-testid={`ticket-status-${ticket.id}`}
											className={cn(
												'rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wider',
												STATUS_CLASSNAME[ticket.status]
											)}
										>
											{STATUS_LABELS[ticket.status]}
										</span>
									</div>
									<p
										className="mt-1 truncate text-xs text-white/50"
										title={title ?? undefined}
									>
										{ticket.description}
									</p>
									<p className="mt-1 text-xs text-white/30">
										Submitted {display}
									</p>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
