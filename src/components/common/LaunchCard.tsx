import { Bell, BellRing, CalendarClock, ExternalLink, Timer } from 'lucide-react';
import { Link } from 'react-router';
import { useLaunchReminder } from '@/hooks/useLaunchReminder';
import { cn } from '@/lib/utils';
import {
	formatLaunchDate,
	getLaunchCountdownState,
	getLaunchTabLabel,
	type Launch,
} from '@/utils/launch.utils';

export interface LaunchCardProps {
	launch: Launch;
	nowMs: number;
	className?: string;
}

const PHASE_LABELS: Record<Launch['phase'], string> = {
	upcoming: 'Scheduled',
	live: 'Live now',
	recent: 'Recently launched',
};

export default function LaunchCard({
	launch,
	nowMs,
	className,
}: LaunchCardProps) {
	const { hasReminder, toggleReminder } = useLaunchReminder(
		launch.keyId,
		launch.startMs
	);
	const countdown = getLaunchCountdownState(launch.startMs, nowMs);
	const phase =
		launch.phase === 'upcoming' && countdown.isLive ? 'live' : launch.phase;
	const keyHref = `/keys/${launch.keyId}`;
	const phaseLabel =
		phase === 'upcoming' && launch.hasAuction
			? 'Pre-launch auction'
			: PHASE_LABELS[phase];

	return (
		<article
			data-testid={`launch-card-${launch.keyId}`}
			aria-label={`${launch.title} launch`}
			className={cn(
				'flex flex-col gap-4 rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md',
				className
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<div className="min-w-0">
					<Link
						to={keyHref}
						className="font-grotesque text-lg font-bold text-white hover:text-amber-300"
					>
						{launch.title}
					</Link>
					<p className="truncate font-jakarta text-xs text-white/60">
						by {launch.creator}
					</p>
				</div>
				<span
					data-testid="launch-phase"
					className={cn(
						'shrink-0 rounded-full border px-2.5 py-1 text-[0.7rem] font-bold',
						phase === 'live'
							? 'border-emerald-400/30 bg-emerald-500/10 text-emerald-200'
							: 'border-amber-400/30 bg-amber-500/10 text-amber-200'
					)}
				>
					{phaseLabel}
				</span>
			</div>

			<div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-jakarta text-xs text-white/60">
				<span className="inline-flex items-center gap-1.5" data-testid="launch-start-time">
					<CalendarClock className="size-3.5" aria-hidden="true" />
					<time dateTime={new Date(launch.startMs).toISOString()}>
						{formatLaunchDate(launch.startMs)}
					</time>
				</span>
				<span data-testid="launch-tab-state">
					{getLaunchTabLabel(phase)}
				</span>
			</div>

			{phase === 'upcoming' && (
				<p
					role="status"
					aria-live="polite"
					aria-label={countdown.label ? `Launches in ${countdown.label}` : 'Launch is live'}
					data-testid="launch-countdown"
					className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-500/10 px-3 py-1.5 font-mono text-xs font-bold text-amber-200"
				>
					<Timer className="size-3.5" aria-hidden="true" />
					{countdown.label ? `Launches in ${countdown.label}` : 'Launch is live'}
				</p>
			)}

			<div className="flex flex-wrap items-center gap-3 border-t border-white/10 pt-3 font-jakarta text-sm">
				<Link
					to={keyHref}
					data-testid="launch-key-link"
					className="inline-flex items-center gap-1 font-bold text-white hover:text-amber-300"
				>
					View key <ExternalLink className="size-3.5" aria-hidden="true" />
				</Link>
				{launch.commitReveal && (
					<Link
						to={`${keyHref}#commit-reveal`}
						data-testid="launch-commit-reveal-link"
						className="inline-flex items-center gap-1 font-bold text-amber-300 hover:underline"
					>
						Commit-reveal panel
					</Link>
				)}
				<button
					type="button"
					onClick={() => void toggleReminder()}
					data-testid="launch-remind-button"
					aria-pressed={hasReminder}
					className={cn(
						'ml-auto inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors',
						hasReminder
							? 'border-amber-400/40 bg-amber-500/15 text-amber-200'
							: 'border-white/15 bg-white/5 text-white/80 hover:border-amber-400/40'
					)}
				>
					{hasReminder ? (
						<BellRing className="size-3.5" aria-hidden="true" />
					) : (
						<Bell className="size-3.5" aria-hidden="true" />
					)}
					{hasReminder ? 'Reminder set' : 'Remind me'}
				</button>
			</div>
		</article>
	);
}
