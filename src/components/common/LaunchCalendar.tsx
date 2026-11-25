import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import {
	getCalendarMonthDays,
	formatLaunchDate,
	type Launch,
} from '@/utils/launch.utils';

export interface LaunchCalendarProps {
	launches: Launch[];
	initialMonth?: Date;
	className?: string;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function LaunchCalendar({
	launches,
	initialMonth,
	className,
}: LaunchCalendarProps) {
	const [month, setMonth] = useState(
		() => new Date(initialMonth ?? Date.now())
	);
	const days = useMemo(
		() => getCalendarMonthDays(month, launches),
		[month, launches]
	);
	const monthLabel = format(month, 'MMMM yyyy');
	const monthLaunches = useMemo(
		() =>
			launches
				.filter(launch => {
					const date = new Date(launch.startMs);
					return (
						date.getFullYear() === month.getFullYear() &&
						date.getMonth() === month.getMonth()
					);
				})
				.sort((a, b) => a.startMs - b.startMs),
		[launches, month]
	);

	const shiftMonth = (offset: number) => {
		setMonth(current => new Date(current.getFullYear(), current.getMonth() + offset, 1));
	};

	return (
		<section
			aria-labelledby="launch-calendar-heading"
			data-testid="launch-calendar"
			className={cn(
				'rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md',
				className
			)}
		>
			<div className="mb-4 flex items-center justify-between gap-3">
				<h2
					id="launch-calendar-heading"
					className="font-grotesque text-xl font-bold text-white"
				>
					Launch calendar
				</h2>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => shiftMonth(-1)}
						aria-label="Previous month"
						data-testid="launch-calendar-previous"
						className="rounded-lg border border-white/15 p-1.5 text-white/70 hover:text-white"
					>
						<ChevronLeft className="size-4" aria-hidden="true" />
					</button>
					<span
						data-testid="launch-calendar-month"
						className="min-w-32 text-center font-jakarta text-sm font-bold text-white"
					>
						{monthLabel}
					</span>
					<button
						type="button"
						onClick={() => shiftMonth(1)}
						aria-label="Next month"
						data-testid="launch-calendar-next"
						className="rounded-lg border border-white/15 p-1.5 text-white/70 hover:text-white"
					>
						<ChevronRight className="size-4" aria-hidden="true" />
					</button>
				</div>
			</div>

			<div className="hidden md:block" data-testid="launch-calendar-grid">
				<div className="grid grid-cols-7 gap-1">
					{WEEKDAYS.map(day => (
						<div
							key={day}
							className="pb-2 text-center font-jakarta text-[0.7rem] font-bold uppercase text-white/40"
						>
							{day}
						</div>
					))}
					{days.map(day => (
						<div
							key={day.date.toISOString()}
							data-testid={`launch-calendar-day-${format(day.date, 'yyyy-MM-dd')}`}
							className={cn(
								'min-h-20 rounded-lg border border-white/5 p-1.5',
								day.inMonth ? 'bg-white/[0.03]' : 'bg-transparent opacity-40'
							)}
						>
							<span className="block font-mono text-xs text-white/60">
								{day.date.getDate()}
							</span>
							{day.launches.map(launch => (
								<Link
									key={launch.id}
									to={`/keys/${launch.keyId}`}
									data-testid={`launch-calendar-event-${launch.id}`}
									className="mt-1 block truncate rounded bg-amber-500/15 px-1 py-0.5 font-jakarta text-[0.65rem] font-bold text-amber-200 hover:underline"
									title={`${launch.title} — ${formatLaunchDate(launch.startMs)}`}
								>
									{launch.title}
								</Link>
							))}
						</div>
					))}
				</div>
			</div>

			<ul
				className="space-y-2 md:hidden"
				data-testid="launch-calendar-list"
			>
				{monthLaunches.length === 0 ? (
					<li className="font-jakarta text-sm text-white/50">
						No launches in this month.
					</li>
				) : (
					monthLaunches.map(launch => (
						<li
							key={launch.id}
							data-testid={`launch-calendar-list-item-${launch.id}`}
							className="rounded-lg border border-white/10 bg-white/[0.03] p-3"
						>
							<Link
								to={`/keys/${launch.keyId}`}
								className="font-jakarta text-sm font-bold text-white hover:text-amber-300"
							>
								{launch.title}
							</Link>
							<p className="font-jakarta text-xs text-white/50">
								{formatLaunchDate(launch.startMs)}
							</p>
						</li>
					))
				)}
			</ul>
		</section>
	);
}
