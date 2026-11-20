import { useState, type FormEvent } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import Skeleton from '@/components/ui/skeleton';
import type {
	PerformanceBond,
	PerformanceBondSlashEvent,
} from '@/services/course.service';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import { cn } from '@/lib/utils';

export interface PerformanceBondCardProps {
	bond?: PerformanceBond | null;
	isLoading?: boolean;
	isError?: boolean;
	isTopUpPending?: boolean;
	onRetry: () => void;
	onTopUp: (amountXlm: number) => Promise<void>;
	className?: string;
}

type BondStatus = 'active' | 'slashed' | 'released';

function getBondStatus(bond: PerformanceBond): string {
	const status = (bond.status ?? bond.state).toLowerCase();
	if (status === 'slashed' || status === 'forfeited') return 'slashed';
	if (status === 'released') return 'released';
	if (status === 'active' || status === 'staked') return 'active';
	return status;
}

function isBondStatus(status: string): status is BondStatus {
	return status === 'active' || status === 'slashed' || status === 'released';
}

function formatAmount(
	amountStroops?: number | null,
	amountXlm?: number | null
) {
	if (amountStroops != null && Number.isFinite(amountStroops)) {
		return formatDisplayKeyPrice(amountStroops);
	}
	if (amountXlm != null && Number.isFinite(amountXlm)) {
		return `${formatNumber(amountXlm)} XLM`;
	}
	return '—';
}

function formatSlashAmount(event: PerformanceBondSlashEvent) {
	if (event.amountStroops != null) {
		return formatAmount(event.amountStroops);
	}
	if (event.amountXlm != null) {
		return formatAmount(null, event.amountXlm);
	}
	if (event.amount == null) return '—';
	const amount = Number(event.amount);
	return Number.isFinite(amount) ? formatAmount(null, amount) : '—';
}

function getLedgerSortValue(timestamp: string | number): number {
	if (typeof timestamp === 'number') return timestamp;
	const numericTimestamp = Number(timestamp);
	if (timestamp.trim() !== '' && Number.isFinite(numericTimestamp)) {
		return numericTimestamp;
	}
	const dateTimestamp = Date.parse(timestamp);
	return Number.isFinite(dateTimestamp) ? dateTimestamp : 0;
}

function formatLedgerTimestamp(timestamp: string | number): string {
	if (typeof timestamp === 'number')
		return `Ledger ${formatNumber(timestamp)}`;
	const numericTimestamp = Number(timestamp);
	if (timestamp.trim() !== '' && Number.isFinite(numericTimestamp)) {
		return `Ledger ${formatNumber(numericTimestamp)}`;
	}
	const parsedTimestamp = Date.parse(timestamp);
	return Number.isFinite(parsedTimestamp)
		? new Date(parsedTimestamp).toLocaleString()
		: timestamp;
}

function formatReleaseDate(releaseDate?: string | null): string {
	if (!releaseDate) return '—';
	const timestamp = Date.parse(releaseDate);
	return Number.isFinite(timestamp)
		? new Date(timestamp).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'short',
				day: 'numeric',
			})
		: releaseDate;
}

export function PerformanceBondCard({
	bond,
	isLoading = false,
	isError = false,
	isTopUpPending = false,
	onRetry,
	onTopUp,
	className,
}: PerformanceBondCardProps) {
	const [isTopUpOpen, setIsTopUpOpen] = useState(false);
	const [amount, setAmount] = useState('');
	const [amountError, setAmountError] = useState('');
	const [submissionError, setSubmissionError] = useState('');

	const submitTopUp = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const amountXlm = Number(amount);
		if (!Number.isFinite(amountXlm) || amountXlm <= 0) {
			setAmountError('Enter an amount greater than zero.');
			return;
		}

		setAmountError('');
		setSubmissionError('');
		try {
			await onTopUp(amountXlm);
			setIsTopUpOpen(false);
			setAmount('');
		} catch (error) {
			setSubmissionError(
				error instanceof Error
					? error.message
					: 'The bond top-up could not be submitted. Please try again.'
			);
		}
	};

	if (isLoading && !bond) {
		return (
			<section
				className={cn(
					'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8',
					className
				)}
				aria-busy="true"
				data-testid="performance-bond-card-loading"
			>
				<div className="mb-6 flex items-center justify-between">
					<Skeleton className="h-6 w-44" />
					<Skeleton className="h-6 w-24 rounded-full" />
				</div>
				<div className="grid gap-4 sm:grid-cols-2">
					<Skeleton className="h-20 w-full rounded-2xl" />
					<Skeleton className="h-20 w-full rounded-2xl" />
				</div>
				<span className="sr-only" role="status">
					Loading performance bond
				</span>
			</section>
		);
	}

	if (isError && !bond) {
		return (
			<section
				className={cn(
					'rounded-[2rem] border border-rose-500/20 bg-rose-500/[0.04] p-6 md:p-8',
					className
				)}
				data-testid="performance-bond-card-error"
			>
				<div className="flex items-start gap-3">
					<AlertTriangle
						className="mt-0.5 size-5 shrink-0 text-rose-400"
						aria-hidden="true"
					/>
					<div>
						<h2 className="font-grotesque text-lg font-bold">
							Performance bond unavailable
						</h2>
						<p className="mt-1 text-sm text-white/60">
							We couldn&apos;t load the performance bond. Please try
							again.
						</p>
						<button
							type="button"
							onClick={onRetry}
							className="mt-4 rounded-lg border border-white/15 px-3 py-2 text-sm font-semibold hover:bg-white/10"
						>
							Retry
						</button>
					</div>
				</div>
			</section>
		);
	}

	if (!bond) {
		return (
			<section
				className={cn(
					'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8',
					className
				)}
				data-testid="performance-bond-card-empty"
			>
				<div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
					<div>
						<div className="flex items-center gap-2">
							<ShieldCheck
								className="size-5 text-amber-400"
								aria-hidden="true"
							/>
							<h2 className="font-grotesque text-xl font-black tracking-tight">
								Performance Bond
							</h2>
						</div>
						<p className="mt-2 max-w-xl text-sm text-white/60">
							No bond has been posted for this key yet. Post a bond to
							protect your commitments to holders.
						</p>
					</div>
					<button
						type="button"
						onClick={() => setIsTopUpOpen(true)}
						className="shrink-0 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-amber-300"
					>
						Post a bond
					</button>
				</div>
				<TopUpDialog
					open={isTopUpOpen}
					onOpenChange={setIsTopUpOpen}
					amount={amount}
					setAmount={value => {
						setAmount(value);
						setAmountError('');
						setSubmissionError('');
					}}
					amountError={amountError}
					submissionError={submissionError}
					isPending={isTopUpPending}
					onSubmit={submitTopUp}
				/>
			</section>
		);
	}

	const status = getBondStatus(bond);
	const releaseDate = formatReleaseDate(bond.releaseDate ?? bond.releasedAt);
	const slashEvents = [...(bond.slashEvents ?? [])].sort(
		(a, b) =>
			getLedgerSortValue(b.ledgerTimestamp) -
			getLedgerSortValue(a.ledgerTimestamp)
	);
	const statusStyles: Record<BondStatus, string> = {
		active: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300',
		slashed: 'border-rose-500/30 bg-rose-500/10 text-rose-300',
		released: 'border-sky-500/30 bg-sky-500/10 text-sky-300',
	};
	const statusStyle = isBondStatus(status)
		? statusStyles[status]
		: 'border-white/20 bg-white/10 text-white/80';

	return (
		<section
			className={cn(
				'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8',
				className
			)}
			data-testid="performance-bond-card"
		>
			<div className="mb-6 flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<ShieldCheck
						className="size-5 text-amber-400"
						aria-hidden="true"
					/>
					<h2 className="font-grotesque text-xl font-black tracking-tight">
						Performance Bond
					</h2>
				</div>
				<span
					className={cn(
						'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider',
						statusStyle
					)}
					data-testid="performance-bond-status"
				>
					{status === 'active' && <CheckCircle2 className="size-3.5" />}
					{status === 'slashed' && <AlertTriangle className="size-3.5" />}
					{status === 'released' && <Clock3 className="size-3.5" />}
					{status}
				</span>
			</div>

			<dl className="grid gap-4 sm:grid-cols-2">
				<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Bonded Amount
					</dt>
					<dd
						className="mt-2 text-lg font-bold tabular-nums"
						data-testid="performance-bond-amount"
					>
						{formatAmount(bond.amountStroops, bond.amountXlm)}
					</dd>
				</div>
				<div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
					<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">
						Release Date
					</dt>
					<dd
						className="mt-2 text-lg font-bold"
						data-testid="performance-bond-release-date"
					>
						{releaseDate}
					</dd>
				</div>
			</dl>

			<div className="mt-5 flex flex-wrap items-center justify-between gap-3">
				<details
					className="group"
					data-testid="performance-bond-slash-history"
				>
					<summary className="cursor-pointer text-sm font-semibold text-white/70 hover:text-white">
						Slash history ({slashEvents.length})
					</summary>
					{slashEvents.length > 0 ? (
						<div className="mt-3 overflow-x-auto rounded-xl border border-white/10">
							<table className="w-full min-w-[32rem] text-left text-sm">
								<thead className="bg-white/[0.04] text-xs uppercase text-white/50">
									<tr>
										<th className="px-4 py-3">Amount</th>
										<th className="px-4 py-3">Reason</th>
										<th className="px-4 py-3">Ledger timestamp</th>
									</tr>
								</thead>
								<tbody>
									{slashEvents.map((event, index) => (
										<tr
											key={`${event.ledgerTimestamp}-${index}`}
											className="border-t border-white/10"
											data-testid="performance-bond-slash-event"
										>
											<td className="px-4 py-3 font-semibold tabular-nums">
												{formatSlashAmount(event)}
											</td>
											<td className="px-4 py-3 text-white/70">
												{event.reason}
											</td>
											<td className="px-4 py-3 text-white/60">
												{formatLedgerTimestamp(
													event.ledgerTimestamp
												)}
											</td>
										</tr>
									))}
								</tbody>
							</table>
						</div>
					) : (
						<p className="mt-3 text-sm text-white/50">
							No slash events have been recorded.
						</p>
					)}
				</details>
				<button
					type="button"
					onClick={() => setIsTopUpOpen(true)}
					className="rounded-xl border border-amber-400/30 px-4 py-2 text-sm font-bold text-amber-300 transition hover:bg-amber-400/10"
				>
					Top up bond
				</button>
			</div>

			<TopUpDialog
				open={isTopUpOpen}
				onOpenChange={setIsTopUpOpen}
				amount={amount}
				setAmount={value => {
					setAmount(value);
					setAmountError('');
					setSubmissionError('');
				}}
				amountError={amountError}
				submissionError={submissionError}
				isPending={isTopUpPending}
				onSubmit={submitTopUp}
			/>
		</section>
	);
}

interface TopUpDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	amount: string;
	setAmount: (amount: string) => void;
	amountError: string;
	submissionError: string;
	isPending: boolean;
	onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function TopUpDialog({
	open,
	onOpenChange,
	amount,
	setAmount,
	amountError,
	submissionError,
	isPending,
	onSubmit,
}: TopUpDialogProps) {
	return (
		<Dialog
			open={open}
			onOpenChange={next => !isPending && onOpenChange(next)}
		>
			<DialogContent
				className="max-w-md border-white/10 bg-[#0a1526]/95 text-white backdrop-blur-xl"
				showCloseButton={!isPending}
				showEscapeHint={!isPending}
				onEscapeKeyDown={event => {
					if (isPending) event.preventDefault();
				}}
				onInteractOutside={event => {
					if (isPending) event.preventDefault();
				}}
			>
				<form onSubmit={onSubmit} noValidate>
					<DialogHeader>
						<DialogTitle className="font-grotesque text-xl font-bold">
							Top up performance bond
						</DialogTitle>
						<DialogDescription className="text-white/60">
							Enter the amount of XLM to deposit into this key&apos;s
							bond.
						</DialogDescription>
					</DialogHeader>
					<label
						className="mt-5 block text-sm font-semibold"
						htmlFor="performance-bond-top-up-amount"
					>
						Amount (XLM)
					</label>
					<div className="mt-2 flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3">
						<input
							id="performance-bond-top-up-amount"
							type="number"
							min="0"
							step="any"
							inputMode="decimal"
							value={amount}
							onChange={event => setAmount(event.target.value)}
							disabled={isPending}
							aria-invalid={Boolean(amountError)}
							aria-describedby={
								amountError
									? 'performance-bond-amount-error'
									: undefined
							}
							className="w-full bg-transparent py-3 text-white outline-none"
							placeholder="0.00"
						/>
						<span className="text-sm text-white/50">XLM</span>
					</div>
					{amountError && (
						<p
							id="performance-bond-amount-error"
							className="mt-2 text-sm text-rose-300"
							role="alert"
						>
							{amountError}
						</p>
					)}
					{submissionError && (
						<p className="mt-2 text-sm text-rose-300" role="alert">
							{submissionError}
						</p>
					)}
					<DialogFooter className="mt-6">
						<button
							type="button"
							onClick={() => onOpenChange(false)}
							disabled={isPending}
							className="rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-white/70 hover:bg-white/10 disabled:opacity-50"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={isPending}
							className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-slate-950 hover:bg-amber-300 disabled:cursor-wait disabled:opacity-60"
							data-testid="performance-bond-top-up-submit"
						>
							{isPending ? 'Submitting…' : 'Submit deposit'}
						</button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}

export default PerformanceBondCard;
