import React, { useMemo, useState } from 'react';
import { Send, Users } from 'lucide-react';
import { AsyncButton } from '@/components/ui/async-button';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import Skeleton from '@/components/ui/skeleton';
import { useKeyHolders } from '@/hooks/useKeyHolders';
import {
	useDistributeRevenueMutation,
	useRevenueDistributionHistory,
} from '@/hooks/useCreatorRevenue';
import {
	DISTRIBUTION_TOP_HOLDERS_COUNT,
	MIN_DISTRIBUTION_AMOUNT_XLM,
	computeDistributionPreview,
	getDistributionAmountError,
	getEligibleDistributionHolders,
	parseDistributionAmount,
} from '@/utils/creatorRevenue.utils';
import { formatPercent, formatXlmPrice } from '@/utils/numberFormat.utils';
import { formatRelativeTime } from '@/utils/time.utils';

const CARD_CLASS =
	'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8';

const INPUT_CLASS =
	'h-11 w-full rounded-lg border border-white/10 bg-black/20 px-3 font-mono text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/50 disabled:opacity-50';

export interface DistributeRevenuePanelProps {
	creatorId: string;
	wallet?: string;
	className?: string;
}

/**
 * Distributes creator revenue to key holders pro-rata.
 *
 * The creator enters an amount (validated inline against
 * {@link MIN_DISTRIBUTION_AMOUNT_XLM}), reviews the estimated pro-rata slice
 * for the top holders, then confirms a modal restating the total and the top
 * holder allocations before the `distribute_revenue` contract call is
 * submitted. Confirmed distributions are listed below the panel.
 */
export const DistributeRevenuePanel: React.FC<
	DistributeRevenuePanelProps
> = ({ creatorId, wallet, className }) => {
	const [amountInput, setAmountInput] = useState('');
	const [showValidation, setShowValidation] = useState(false);
	const [confirmOpen, setConfirmOpen] = useState(false);

	const { holders, isLoading: areHoldersLoading } = useKeyHolders(creatorId);
	const { data: history = [] } = useRevenueDistributionHistory(creatorId);
	const distributeMutation = useDistributeRevenueMutation(
		creatorId,
		wallet
	);

	const eligibleHolders = useMemo(
		() => getEligibleDistributionHolders(holders),
		[holders]
	);

	const parsedAmount = parseDistributionAmount(amountInput);
	const amountError =
		showValidation || amountInput.trim() !== ''
			? getDistributionAmountError(amountInput)
			: null;
	const hasAmountError = amountError !== null;

	const preview = useMemo(
		() => computeDistributionPreview(holders, parsedAmount ?? 0),
		[holders, parsedAmount]
	);

	const canOpenConfirm =
		!hasAmountError && !areHoldersLoading && eligibleHolders.length > 0;

	const handleOpenConfirm = () => {
		setShowValidation(true);
		if (getDistributionAmountError(amountInput) !== null) return;
		if (parsedAmount === null) return;
		if (eligibleHolders.length === 0) return;
		setConfirmOpen(true);
	};

	const handleConfirm = () => {
		if (parsedAmount === null) return;
		if (getDistributionAmountError(amountInput) !== null) return;

		distributeMutation.mutate(
			{ amount: parsedAmount, holderCount: eligibleHolders.length },
			{
				onSuccess: () => {
					setConfirmOpen(false);
					setAmountInput('');
					setShowValidation(false);
				},
			}
		);
	};

	return (
		<div
			className={`space-y-8 ${className ?? ''}`}
			data-testid="distribute-revenue-panel"
		>
			<section className={CARD_CLASS} data-testid="distribute-section">
				<div className="flex items-center gap-3">
					<span className="flex size-9 items-center justify-center rounded-xl border border-amber-400/20 bg-amber-400/10 text-amber-400">
						<Send className="size-5" aria-hidden="true" />
					</span>
					<div>
						<span className="text-[0.68rem] font-bold uppercase tracking-[0.2em] text-white/50">
							Distribute Revenue
						</span>
						<h2 className="mt-0.5 font-grotesque text-xl font-black tracking-tight text-white">
							Pay key holders pro-rata
						</h2>
					</div>
				</div>

				<p className="mt-3 text-sm text-white/55">
					Share revenue with everyone holding your key. Each holder receives a
					pro-rata slice based on the keys they hold.
				</p>

				<form
					className="mt-6 space-y-5"
					noValidate
					onSubmit={event => {
						event.preventDefault();
						handleOpenConfirm();
					}}
				>
					<div>
						<label
							htmlFor="distribute-amount-input"
							className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-white/70"
						>
							Amount (XLM)
						</label>
						<input
							id="distribute-amount-input"
							type="number"
							inputMode="decimal"
							min={MIN_DISTRIBUTION_AMOUNT_XLM}
							step="0.01"
							placeholder={`Minimum ${MIN_DISTRIBUTION_AMOUNT_XLM} XLM`}
							value={amountInput}
							onChange={event => setAmountInput(event.target.value)}
							aria-invalid={hasAmountError}
							aria-describedby={
								hasAmountError ? 'distribute-amount-error' : undefined
							}
							className={INPUT_CLASS}
							data-testid="distribute-amount-input"
						/>
						{hasAmountError && (
							<p
								id="distribute-amount-error"
								role="alert"
								className="mt-1.5 text-xs text-red-400"
								data-testid="distribute-amount-error"
							>
								{amountError}
							</p>
						)}
					</div>

					<div
						className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
						data-testid="distribute-preview"
					>
						<div className="mb-3 flex flex-wrap items-center justify-between gap-3">
							<span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white/40">
								Estimated pro-rata preview · top{' '}
								{DISTRIBUTION_TOP_HOLDERS_COUNT} holders
							</span>
							<span className="text-xs text-white/50">
								{eligibleHolders.length} eligible holder
								{eligibleHolders.length === 1 ? '' : 's'}
							</span>
						</div>

						{areHoldersLoading ? (
							<div
								className="space-y-2"
								data-testid="distribute-preview-loading"
							>
								<Skeleton className="h-9 w-full rounded-lg" />
								<Skeleton className="h-9 w-full rounded-lg" />
							</div>
						) : preview.length === 0 ? (
							<p
								className="py-3 text-sm text-white/50"
								data-testid="distribute-preview-empty"
							>
								{eligibleHolders.length === 0
									? 'No key holders to distribute to yet.'
									: 'Enter an amount to preview each holder’s estimated share.'}
							</p>
						) : (
							<ul
								className="divide-y divide-white/5"
								data-testid="distribute-preview-list"
							>
								{preview.map(entry => (
									<li
										key={entry.walletAddress}
										className="flex items-center justify-between gap-3 py-2.5"
										data-testid={`distribute-preview-row-${entry.walletAddress}`}
									>
										<div className="min-w-0">
											<span className="block truncate text-sm font-medium text-white/85">
												{entry.displayName || entry.walletAddress}
											</span>
											<span className="block truncate font-mono text-[0.7rem] text-white/40">
												{entry.keyCount} key{entry.keyCount === 1 ? '' : 's'} ·{' '}
												{formatPercent(entry.share * 100, {
													maximumFractionDigits: 2,
												})}
											</span>
										</div>
										<span
											className="shrink-0 font-mono text-sm font-bold text-amber-300"
											data-testid={`distribute-preview-amount-${entry.walletAddress}`}
										>
											{formatXlmPrice(entry.estimatedAmount)}
										</span>
									</li>
								))}
							</ul>
						)}
					</div>

					<Button
						type="button"
						onClick={handleOpenConfirm}
						disabled={!canOpenConfirm || distributeMutation.isPending}
						className="rounded-xl bg-amber-400 px-5 py-2.5 font-bold text-slate-950 shadow-lg shadow-amber-500/20 hover:bg-amber-300"
						data-testid="distribute-open-confirm-button"
					>
						<Users className="mr-2 size-4" aria-hidden="true" />
						Distribute revenue
					</Button>
				</form>
			</section>

			<section className={CARD_CLASS} data-testid="distribute-history-section">
				<div className="mb-4 flex items-center justify-between gap-3">
					<div>
						<h3 className="font-grotesque text-xl font-black tracking-tight text-white">
							Distribution History
						</h3>
						<p className="mt-1 text-xs text-white/50">
							Confirmed revenue distributions to key holders
						</p>
					</div>
					{history.length > 0 && (
						<span
							className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-xs text-white/60"
							data-testid="distribute-history-count"
						>
							{history.length} distribution{history.length === 1 ? '' : 's'}
						</span>
					)}
				</div>

				{history.length === 0 ? (
					<div
						className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 p-8 text-center"
						data-testid="distribute-history-empty"
					>
						<p className="font-semibold text-white/80">
							No distributions yet
						</p>
						<p className="mt-1 max-w-sm text-xs text-white/45">
							When you distribute revenue, the date, amount, and number of
							paying holders will appear here.
						</p>
					</div>
				) : (
					<ul
						className="divide-y divide-white/[0.05]"
						data-testid="distribute-history-list"
					>
						{history.map(record => (
							<li
								key={record.id}
								className="flex flex-wrap items-center justify-between gap-3 py-3.5"
								data-testid="distribute-history-row"
							>
								<span
									className="text-sm font-medium text-white/90"
									data-testid="distribute-history-date"
									title={new Date(record.timestamp).toLocaleString()}
								>
									{formatRelativeTime(record.timestamp)}
								</span>
								<span
									className="font-mono text-sm font-bold text-emerald-400"
									data-testid="distribute-history-amount"
								>
									{formatXlmPrice(record.amount)}
								</span>
								<span
									className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/60"
									data-testid="distribute-history-holders"
								>
									{record.holderCount} holder
									{record.holderCount === 1 ? '' : 's'}
								</span>
							</li>
						))}
					</ul>
				)}
			</section>

			<Dialog
				open={confirmOpen}
				onOpenChange={open =>
					!distributeMutation.isPending && setConfirmOpen(open)
				}
			>
				<DialogContent
					className="border-white/10 bg-[#0a1929] text-white sm:max-w-lg"
					data-testid="distribute-confirm-modal"
				>
					<DialogHeader>
						<DialogTitle className="font-grotesque text-xl font-black text-white">
							Confirm distribution
						</DialogTitle>
						<DialogDescription className="text-sm text-white/55">
							This submits the distribute_revenue contract call. Each eligible
							holder receives a pro-rata share of the total.
						</DialogDescription>
					</DialogHeader>

					<div className="space-y-4">
						<div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-4">
							<span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-emerald-200/70">
								Total distributed
							</span>
							<div
								className="mt-1 font-mono text-2xl font-black text-emerald-300"
								data-testid="distribute-confirm-total"
							>
								{parsedAmount !== null ? formatXlmPrice(parsedAmount) : '—'}
							</div>
							<p
								className="mt-1 text-xs text-white/55"
								data-testid="distribute-confirm-holder-count"
							>
								Split across {eligibleHolders.length} eligible holder
								{eligibleHolders.length === 1 ? '' : 's'}
							</p>
						</div>

						<div>
							<span className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-white/40">
								Top {DISTRIBUTION_TOP_HOLDERS_COUNT} holder allocations
							</span>
							<ul
								className="mt-2 divide-y divide-white/5"
								data-testid="distribute-confirm-list"
							>
								{preview.map(entry => (
									<li
										key={entry.walletAddress}
										className="flex items-center justify-between gap-3 py-2"
										data-testid={`distribute-confirm-row-${entry.walletAddress}`}
									>
										<div className="min-w-0">
											<span className="block truncate text-sm text-white/85">
												{entry.displayName || entry.walletAddress}
											</span>
											<span className="block truncate font-mono text-[0.7rem] text-white/40">
												{formatPercent(entry.share * 100, {
													maximumFractionDigits: 2,
												})}
											</span>
										</div>
										<span
											className="shrink-0 font-mono text-sm font-semibold text-amber-300"
											data-testid={`distribute-confirm-amount-${entry.walletAddress}`}
										>
											{formatXlmPrice(entry.estimatedAmount)}
										</span>
									</li>
								))}
							</ul>
						</div>
					</div>

					<DialogFooter className="mt-2 flex justify-end gap-3">
						<Button
							type="button"
							variant="outline"
							disabled={distributeMutation.isPending}
							onClick={() => setConfirmOpen(false)}
							className="border-white/10 text-white/80 hover:bg-white/10 hover:text-white"
							data-testid="distribute-cancel-button"
						>
							Cancel
						</Button>
						<AsyncButton
							type="button"
							isPending={distributeMutation.isPending}
							pendingText="Submitting…"
							onClick={handleConfirm}
							className="rounded-xl bg-amber-400 px-5 py-2.5 font-bold text-slate-950 hover:bg-amber-300"
							data-testid="distribute-confirm-button"
						>
							Confirm distribution
						</AsyncButton>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
};

export default DistributeRevenuePanel;
