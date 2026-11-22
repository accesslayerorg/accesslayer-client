import React from 'react';
import { cn } from '@/lib/utils';
import type {
	PaymentInstalment,
	PaymentSchedule,
	PaymentInstalmentStatus,
} from '@/services/paymentSchedule.service';

const STATUS_STYLES: Record<PaymentInstalmentStatus, string> = {
	paid: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
	pending: 'border-white/15 bg-white/[0.06] text-white/70',
	overdue: 'border-rose-400/35 bg-rose-400/10 text-rose-300',
};

const STATUS_LABELS: Record<PaymentInstalmentStatus, string> = {
	paid: 'Paid',
	pending: 'Pending',
	overdue: 'Overdue',
};

function formatDate(value: string): string {
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime())
		? value
		: parsed.toLocaleDateString(undefined, {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			});
}

function formatAmount(value: number): string {
	return `${value.toLocaleString(undefined, {
		maximumFractionDigits: 2,
	})} XLM`;
}

function formatCountdown(dueDate: string): string | null {
	const diffMs = new Date(dueDate).getTime() - Date.now();
	if (!Number.isFinite(diffMs) || diffMs <= 0) return null;
	const days = Math.ceil(diffMs / 86_400_000);
	if (days > 1) return `in ${days} days`;
	const hours = Math.max(1, Math.ceil(diffMs / 3_600_000));
	return `in ${hours}h`;
}

export interface PaymentScheduleTimelineProps {
	schedule?: PaymentSchedule | null;
	isLoading?: boolean;
	className?: string;
}

/**
 * Instalment payment schedule timeline (#1235).
 *
 * Lists every scheduled instalment with due date, amount and status chip,
 * a cumulative repayment progress bar, and a countdown on the next due
 * instalment. Renders nothing when the key has no payment schedule.
 */
export const PaymentScheduleTimeline: React.FC<PaymentScheduleTimelineProps> = ({
	schedule,
	isLoading = false,
	className,
}) => {
	if (isLoading || !schedule || schedule.instalments.length === 0) return null;

	const now = Date.now();
	const upcoming = schedule.instalments.find(
		item => item.status !== 'paid' && new Date(item.dueDate).getTime() >= now
	);
	const nextDueNumber = upcoming?.number ?? null;
	const progressPercent =
		schedule.totalAmount > 0
			? Math.min(100, Math.round((schedule.paidAmount / schedule.totalAmount) * 100))
			: 0;

	return (
		<section
			className={cn(
				'rounded-4xl border border-white/10 bg-white/2 p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
			aria-labelledby="payment-schedule-heading"
			data-testid="payment-schedule-timeline"
		>
			<h2
				id="payment-schedule-heading"
				className="font-grotesque text-xl font-black tracking-tight text-white"
			>
				Payment schedule
			</h2>

			<div className="mt-4" data-testid="payment-schedule-progress">
				<div className="flex items-center justify-between text-xs text-white/55">
					<span>Repaid</span>
					<span className="font-mono tabular-nums">
						{formatAmount(schedule.paidAmount)} / {formatAmount(schedule.totalAmount)}{' '}
						({progressPercent}%)
					</span>
				</div>
				<div
					className="mt-2 h-2 overflow-hidden rounded-full bg-white/10"
					role="progressbar"
					aria-valuenow={progressPercent}
					aria-valuemin={0}
					aria-valuemax={100}
					aria-label="Cumulative repayment progress"
				>
					<div
						className="h-full rounded-full bg-emerald-400 transition-all"
						style={{ width: `${progressPercent}%` }}
					/>
				</div>
			</div>

			<ol className="mt-6 space-y-3">
				{schedule.instalments.map((item: PaymentInstalment) => {
					const isNextDue = item.number === nextDueNumber;
					const countdown = isNextDue ? formatCountdown(item.dueDate) : null;

					return (
						<li
							key={item.number}
							className={cn(
								'flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 sm:flex-row sm:items-center sm:justify-between',
								isNextDue && 'border-emerald-400/40 bg-emerald-400/[0.06]'
							)}
							data-testid="payment-schedule-item"
							data-instalment-number={item.number}
							data-status={item.status}
						>
							<div className="min-w-0">
								<p className="text-xs font-semibold uppercase tracking-wider text-white/55">
									Instalment {item.number}
									{isNextDue && (
										<span
											className="ml-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2 py-0.5 text-[10px] font-bold text-emerald-300"
											data-testid="payment-schedule-next-due"
										>
											Next due{countdown ? ` · ${countdown}` : ''}
										</span>
									)}
								</p>
								<p className="mt-0.5 text-sm text-white/80">
									<time dateTime={item.dueDate}>{formatDate(item.dueDate)}</time>
									<span aria-hidden="true" className="mx-2 text-white/25">
										·
									</span>
									<span className="font-mono tabular-nums">
										{formatAmount(item.amount)}
									</span>
								</p>
							</div>
							<span
								className={cn(
									'inline-flex w-fit items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em]',
									STATUS_STYLES[item.status] ?? STATUS_STYLES.pending
								)}
								data-testid="payment-schedule-status"
							>
								{STATUS_LABELS[item.status] ?? STATUS_LABELS.pending}
							</span>
						</li>
					);
				})}
			</ol>
		</section>
	);
};

export default PaymentScheduleTimeline;
