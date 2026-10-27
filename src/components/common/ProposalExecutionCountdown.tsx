import { useEffect, useRef, useState } from 'react';
import { Bell, BellOff, CheckCircle2, Clock3, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import showToast from '@/utils/toast.util';

export interface ProposalExecutionCountdownProps {
	proposalId: string;
	timelockExpiresAt: string;
	onExecute?: () => Promise<void>;
	isExecuting?: boolean;
}

function parseMs(isoOrMs: string): number {
	const asNumber = Number(isoOrMs);
	if (!Number.isNaN(asNumber)) return asNumber;
	const date = new Date(isoOrMs);
	return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

interface TimeLeft {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
	total: number;
}

function calcTimeLeft(expiresAtMs: number): TimeLeft {
	const total = Math.max(0, expiresAtMs - Date.now());
	const seconds = Math.floor((total / 1000) % 60);
	const minutes = Math.floor((total / 1000 / 60) % 60);
	const hours = Math.floor((total / 1000 / 60 / 60) % 24);
	const days = Math.floor(total / 1000 / 60 / 60 / 24);
	return { days, hours, minutes, seconds, total };
}

function pad(n: number): string {
	return String(n).padStart(2, '0');
}

const NOTIFY_KEY_PREFIX = 'proposal_notify_';

export default function ProposalExecutionCountdown({
	proposalId,
	timelockExpiresAt,
	onExecute,
	isExecuting = false,
}: ProposalExecutionCountdownProps) {
	const expiresAtMs = parseMs(timelockExpiresAt);
	const [timeLeft, setTimeLeft] = useState<TimeLeft>(() => calcTimeLeft(expiresAtMs));

	const notifyKey = `${NOTIFY_KEY_PREFIX}${proposalId}`;
	const [notifyEnabled, setNotifyEnabled] = useState<boolean>(() => {
		try {
			return localStorage.getItem(notifyKey) === 'true';
		} catch {
			return false;
		}
	});

	const toastFiredRef = useRef(false);

	useEffect(() => {
		const tick = () => {
			const tl = calcTimeLeft(expiresAtMs);
			setTimeLeft(tl);

			if (notifyEnabled && !toastFiredRef.current && tl.total > 0 && tl.total <= 3_600_000) {
				toastFiredRef.current = true;
				const mins = Math.ceil(tl.total / 60_000);
				showToast.message(`⏰ Proposal timelock expires in ${mins} minute${mins === 1 ? '' : 's'}.`);
			}
		};

		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [expiresAtMs, notifyEnabled]);

	const toggleNotify = () => {
		const next = !notifyEnabled;
		setNotifyEnabled(next);
		try {
			if (next) {
				localStorage.setItem(notifyKey, 'true');
			} else {
				localStorage.removeItem(notifyKey);
			}
		} catch {
			// localStorage may be blocked in private browsing
		}
	};

	const expired = timeLeft.total === 0;

	return (
		<section
			aria-labelledby="execution-countdown-heading"
			className="rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-5 sm:p-7"
		>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div className="flex items-center gap-2 text-amber-400">
					<Clock3 className="size-4" aria-hidden="true" />
					<h2
						id="execution-countdown-heading"
						className="text-sm font-bold uppercase tracking-[0.15em]"
					>
						Execution Pending
					</h2>
				</div>

				<button
					type="button"
					onClick={toggleNotify}
					aria-pressed={notifyEnabled}
					aria-label={notifyEnabled ? 'Disable reminder for this proposal' : 'Enable reminder for this proposal'}
					className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.05] px-3 py-1.5 text-xs font-semibold text-white/70 transition-colors hover:bg-white/[0.09] hover:text-white"
				>
					{notifyEnabled ? (
						<>
							<Bell className="size-3.5 text-amber-400" aria-hidden="true" />
							Notify Me
						</>
					) : (
						<>
							<BellOff className="size-3.5" aria-hidden="true" />
							Notify Me
						</>
					)}
				</button>
			</div>

			<p className="mt-2 text-sm text-white/55">
				{expired
					? 'The timelock has expired. This proposal is ready to execute.'
					: 'Time remaining before the parameter change can be executed on-chain.'}
			</p>

			{!expired && (
				<div
					className="mt-5 flex flex-wrap items-end gap-3 sm:gap-5"
					aria-live="polite"
					aria-label={`${timeLeft.days} days ${timeLeft.hours} hours ${timeLeft.minutes} minutes remaining`}
				>
					{[
						{ value: timeLeft.days, label: 'Days' },
						{ value: timeLeft.hours, label: 'Hours' },
						{ value: timeLeft.minutes, label: 'Min' },
						{ value: timeLeft.seconds, label: 'Sec' },
					].map(({ value, label }) => (
						<div key={label} className="text-center">
							<p className="font-mono text-3xl font-black tabular-nums text-amber-200 sm:text-4xl">
								{pad(value)}
							</p>
							<p className="mt-1 text-[10px] font-semibold uppercase tracking-widest text-white/40">
								{label}
							</p>
						</div>
					))}
				</div>
			)}

			{expired && (
				<div className="mt-4 flex items-center gap-2 text-emerald-400">
					<CheckCircle2 className="size-4" aria-hidden="true" />
					<span className="text-sm font-semibold">Timelock expired</span>
				</div>
			)}

			{onExecute && (
				<Button
					type="button"
					onClick={() => void onExecute()}
					disabled={!expired || isExecuting}
					className="mt-6"
					aria-disabled={!expired || isExecuting}
				>
					{isExecuting && <Loader2 className="animate-spin" aria-hidden="true" />}
					{isExecuting ? 'Executing…' : 'Execute Proposal'}
				</Button>
			)}
		</section>
	);
}
