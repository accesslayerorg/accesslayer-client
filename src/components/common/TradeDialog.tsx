import { useEffect, useMemo, useRef, useState } from 'react';
import { useAccount } from 'wagmi';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import PercentageBadge from '@/components/common/PercentageBadge';
import NetworkFeeHint from '@/components/common/NetworkFeeHint';
import AllowanceApprovalStep from '@/components/common/AllowanceApprovalStep';
import HoldingCapWarning from '@/components/common/HoldingCapWarning';
import { TRADE_FEE_ESTIMATE, BUY_QUANTITY_BOUNDS } from '@/constants/fees';
import { clampBuyQuantity } from '@/utils/buyQuantity';
import {
	fetchTradeNetworkFeeEstimate,
	formatTransactionFeeDisplay,
	type NetworkFeeDataProvider,
} from '@/utils/transactionFee.utils';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';
import {
	useAllowanceStore,
	selectNeedsApproval,
} from '@/hooks/useAllowanceStore';
import {
	useHoldingCapStore,
	isAtHoldingCap,
	remainingCapacity,
} from '@/hooks/useHoldingCapStore';
import {
	useContractPausedStore,
	selectIsPaused,
} from '@/hooks/useContractPausedStore';
import { useShallow } from 'zustand/react/shallow';

export type TradeSide = 'buy' | 'sell' | 'stake' | 'transfer';

export interface TradeDialogProps {
	open: boolean;
	side: TradeSide;
	creatorName: string;
	/** Creator / course ID — used to look up the holding cap. */
	creatorId?: string;
	availableHoldings: number;
	/** Per-key price in stroops, shown on the buy confirmation step. */
	keyPriceStroops?: number | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: (amount: number) => Promise<void> | void;
	isSubmitting?: boolean;
	networkFeeEstimateProvider?: NetworkFeeDataProvider;
	/** Optional wallet address override (otherwise uses wagmi account). */
	walletAddress?: string;
}

type NetworkFeeEstimateState =
	| { status: 'idle' | 'loading' | 'error'; fee: null }
	| { status: 'success'; fee: number };

const TradeDialog: React.FC<TradeDialogProps> = ({
	open,
	side,
	creatorName,
	creatorId,
	availableHoldings,
	keyPriceStroops,
	onOpenChange,
	onConfirm,
	isSubmitting = false,
	networkFeeEstimateProvider,
	walletAddress,
}) => {
	const { address } = useAccount();
	const activeAddress = walletAddress ?? address;

	// ── Contract pause state (#953) ───────────────────────────────────────
	const isPaused = useContractPausedStore(selectIsPaused);

	// ── Allowance (#955) ──────────────────────────────────────────────────
	const {
		status: allowanceStatus,
		checkAllowance,
		submitApproval,
	} = useAllowanceStore(
		useShallow(s => ({
			status: s.status,
			checkAllowance: s.checkAllowance,
			submitApproval: s.submitApproval,
		}))
	);
	const needsApproval = useAllowanceStore(selectNeedsApproval);
	const isApproving = allowanceStatus === 'approving';
	const approvalError =
		allowanceStatus === 'error'
			? (useAllowanceStore.getState().errorMessage ?? null)
			: null;

	// ── Holding cap (#961) ────────────────────────────────────────────────
	const { caps, fetchCap, incrementHolding } = useHoldingCapStore(
		useShallow(s => ({
			caps: s.caps,
			fetchCap: s.fetchCap,
			incrementHolding: s.incrementHolding,
		}))
	);
	const capData = creatorId ? caps[creatorId] : undefined;
	const atCap = capData ? isAtHoldingCap(capData) : false;
	const maxBuyable = capData ? remainingCapacity(capData) : null;

	// ── Local state ───────────────────────────────────────────────────────
	const [amountText, setAmountText] = useState('1');
	const [touched, setTouched] = useState(false);
	const [adjustmentNote, setAdjustmentNote] = useState<string | null>(null);
	const [networkFeeEstimate, setNetworkFeeEstimate] =
		useState<NetworkFeeEstimateState>({ status: 'idle', fee: null });
	const amountInputRef = useRef<HTMLInputElement | null>(null);

	// On open: reset amount + kick off allowance check + cap fetch.
	useEffect(() => {
		if (!open) return;
		setAmountText('1');
		setTouched(false);
		setAdjustmentNote(null);
		if (side === 'stake' && activeAddress) {
			checkAllowance(activeAddress);
		}
		if (side === 'buy' && creatorId && activeAddress) {
			fetchCap(creatorId, activeAddress);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, side, activeAddress, creatorId]);

	const handleBlur = () => {
		setTouched(true);
		if (side !== 'buy') return;

		const trimmed = amountText.trim();
		// Effective max clamp considering holding cap if present
		const maxClamp =
			maxBuyable !== null
				? Math.min(BUY_QUANTITY_BOUNDS.MAX_QTY, maxBuyable)
				: BUY_QUANTITY_BOUNDS.MAX_QTY;

		const res = clampBuyQuantity(trimmed, BUY_QUANTITY_BOUNDS.MIN_QTY, maxClamp);

		if (res.adjusted) {
			setAmountText(res.value.toString());
			if (res.reason === 'below_min') {
				setAdjustmentNote(
					`Quantity adjusted to the minimum of ${res.value}.`
				);
			} else if (res.reason === 'above_max') {
				setAdjustmentNote(
					`Quantity adjusted to the maximum of ${res.value}.`
				);
			} else {
				setAdjustmentNote(`Quantity rounded to ${res.value}.`);
			}
		} else {
			setAdjustmentNote(null);
		}
	};

	const parsedAmount = useMemo(() => {
		const normalized = amountText.trim();
		if (!normalized) return NaN;
		return Number(normalized);
	}, [amountText]);

	const validationError = useMemo((): string | null => {
		const normalized = amountText.trim();
		if (!normalized) return 'Please enter an amount.';
		if (!Number.isFinite(parsedAmount)) return 'Amount must be a valid number.';
		if (parsedAmount <= 0) return 'Amount must be greater than zero.';
		if (isPaused) return 'Trading is currently suspended because the contract is paused.';
		if (side === 'buy' && atCap)
			return 'You have reached the maximum holding cap for this creator.';
		if (
			side === 'buy' &&
			maxBuyable !== null &&
			parsedAmount > maxBuyable
		)
			return `You can only buy up to ${formatNumber(maxBuyable)} more key${maxBuyable !== 1 ? 's' : ''} (holding cap).`;
		if (
			(side === 'sell' || side === 'stake' || side === 'transfer') &&
			parsedAmount > availableHoldings
		)
			return `You can't ${side} more than your holdings (${formatNumber(availableHoldings)} keys).`;
		return null;
	}, [amountText, parsedAmount, side, availableHoldings, atCap, maxBuyable, isPaused]);

	const amountValid = validationError === null;
	const showError = touched && validationError !== null;

	const isAllowanceChecking =
		side === 'stake' && allowanceStatus === 'checking';
	const requiresAllowanceApproval =
		side === 'stake' && needsApproval;
	const confirmDisabled =
		!amountValid ||
		isSubmitting ||
		isApproving ||
		isAllowanceChecking ||
		atCap ||
		isPaused ||
		requiresAllowanceApproval;

	const displayCreatorName =
		normalizeCreatorDisplayName(creatorName) || 'Unnamed creator';

	const title =
		side === 'buy'
			? 'Buy keys'
			: side === 'sell'
				? 'Sell keys'
				: side === 'stake'
					? 'Stake keys'
					: 'Transfer keys';

	const confirmLabel =
		side === 'buy'
			? atCap
				? 'Cap reached'
				: isPaused
					? 'Contract paused'
					: 'Confirm buy'
			: isPaused
				? 'Contract paused'
				: side === 'sell'
					? 'Confirm sell'
					: side === 'stake'
						? 'Confirm stake'
						: 'Confirm transfer';

	const estimatedNetworkFee = formatTransactionFeeDisplay(
		networkFeeEstimate.status === 'success'
			? networkFeeEstimate.fee
			: TRADE_FEE_ESTIMATE.DEFAULT_NETWORK_FEE,
		{ unit: TRADE_FEE_ESTIMATE.UNIT }
	);

	const networkFeeCopy =
		networkFeeEstimate.status === 'loading'
			? 'Estimating...'
			: networkFeeEstimate.status === 'error'
				? 'Cannot estimate network fee'
				: estimatedNetworkFee;

	const isBusy = isSubmitting || isApproving;

	useEffect(() => {
		if (!open) {
			setNetworkFeeEstimate({ status: 'idle', fee: null });
			return;
		}

		if (!amountValid || !networkFeeEstimateProvider) {
			setNetworkFeeEstimate({ status: 'error', fee: null });
			return;
		}

		let cancelled = false;
		setNetworkFeeEstimate({ status: 'loading', fee: null });

		const feeSide = side === 'buy' || side === 'sell' ? side : 'buy';
		fetchTradeNetworkFeeEstimate(networkFeeEstimateProvider, {
			side: feeSide,
			amount: parsedAmount,
		})
			.then(fee => {
				if (cancelled) return;
				setNetworkFeeEstimate(
					fee == null
						? { status: 'error', fee: null }
						: { status: 'success', fee }
				);
			})
			.catch(() => {
				if (!cancelled) {
					setNetworkFeeEstimate({ status: 'error', fee: null });
				}
			});

		return () => {
			cancelled = true;
		};
	}, [amountValid, networkFeeEstimateProvider, open, parsedAmount, side]);

	const handleConfirm = async () => {
		if (confirmDisabled) return;
		await onConfirm(parsedAmount);
		// Update holding cap store on successful buy (#961)
		if (side === 'buy' && creatorId) {
			incrementHolding(creatorId, parsedAmount);
		}
	};

	return (
		<Dialog
			open={open}
			onOpenChange={next => !isBusy && onOpenChange(next)}
		>
			<DialogContent
				className="max-w-md"
				showCloseButton={!isBusy}
				showEscapeHint={!isBusy}
				onOpenAutoFocus={event => {
					event.preventDefault();
					amountInputRef.current?.focus();
				}}
				onEscapeKeyDown={event => {
					if (isBusy) event.preventDefault();
				}}
				onInteractOutside={event => {
					if (isBusy) event.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle>{title}</DialogTitle>
					<DialogDescription>
						{side === 'buy'
							? `Purchase creator keys for ${displayCreatorName}.`
							: side === 'sell'
								? `Sell creator keys for ${displayCreatorName}.`
								: side === 'stake'
									? `Stake creator keys for ${displayCreatorName}.`
									: `Transfer creator keys for ${displayCreatorName}.`}
					</DialogDescription>
				</DialogHeader>

				{/* Contract paused alert (#953) */}
				{isPaused && (
					<div
						role="alert"
						data-testid="trade-dialog-paused-alert"
						className="flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200"
					>
						<ShieldAlert
							className="mt-0.5 size-4 shrink-0 text-red-400"
							aria-hidden="true"
						/>
						<div>
							<p className="font-semibold text-red-300">
								Trading suspended — contract paused
							</p>
							<p className="mt-0.5 text-red-200/80">
								Actions are disabled until the emergency pause is lifted by
								the admin.
							</p>
						</div>
					</div>
				)}

				{side === 'buy' && keyPriceStroops != null && (
					<p className="text-sm text-white/60">
						Unit price:{' '}
						<span className="font-semibold text-amber-300/90 tabular-nums">
							{formatDisplayKeyPrice(keyPriceStroops)}
						</span>
					</p>
				)}

				{/* Holding cap warning (#961) — buy side only */}
				{side === 'buy' && capData && (
					<HoldingCapWarning data={capData} />
				)}

				<div className="space-y-2">
					<div className="text-sm text-white/70">Amount</div>
					<input
						ref={amountInputRef}
						inputMode="decimal"
						value={amountText}
						onChange={event => {
							setAmountText(event.target.value);
							setTouched(true);
							setAdjustmentNote(null);
						}}
						onBlur={handleBlur}
						disabled={isSubmitting || atCap || isPaused}
						className={cn(
							'w-full rounded-xl border bg-white/[0.04] px-3 py-2 text-white outline-none transition-colors',
							'border-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15',
							showError || (!amountValid && amountText.trim())
								? 'border-red-500/60'
								: '',
							atCap || isPaused ? 'opacity-40 cursor-not-allowed' : ''
						)}
						aria-label="Trade amount"
						aria-describedby={showError ? 'trade-amount-error' : undefined}
						aria-invalid={showError || undefined}
						data-focus-order="1"
						data-testid="trade-dialog-amount"
					/>

					{/* Adjustment note on blur */}
					{side === 'buy' && adjustmentNote && (
						<div
							className="text-xs text-amber-400 font-medium animate-in fade-in duration-200"
							data-testid="buy-qty-adjustment-note"
						>
							{adjustmentNote}
						</div>
					)}

					{showError && (
						<p
							id="trade-amount-error"
							role="alert"
							className="text-xs text-red-300"
							data-testid="trade-dialog-amount-error"
						>
							{validationError}
						</p>
					)}

					{side === 'buy' && maxBuyable !== null && !atCap && (
						<p className="text-xs text-white/40">
							Max you can buy:{' '}
							<span className="font-semibold text-white/60">
								{formatNumber(maxBuyable)} key{maxBuyable !== 1 ? 's' : ''}
							</span>
						</p>
					)}

					<div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
						<span
							aria-label={`Current wallet holdings: ${formatNumber(availableHoldings)} keys`}
						>
							Holdings: {formatNumber(availableHoldings)} keys
						</span>
						{(side === 'sell' || side === 'stake' || side === 'transfer') &&
							availableHoldings > 0 &&
							Number.isFinite(parsedAmount) &&
							parsedAmount > 0 && (
								<PercentageBadge
									label="of holdings"
									value={(parsedAmount / availableHoldings) * 100}
									tone={
										parsedAmount > availableHoldings
											? 'negative'
											: 'neutral'
									}
								/>
							)}
					</div>

					<NetworkFeeHint
						variant="text"
						label="Approx. network fee"
						fee={networkFeeCopy}
						className="text-white/45"
					/>
				</div>

				{/* Allowance approval step (#955) — shown when approval is needed */}
				{requiresAllowanceApproval && (
					<AllowanceApprovalStep
						isApproving={isApproving}
						errorMessage={approvalError}
						onApprove={() => activeAddress && submitApproval(activeAddress)}
					/>
				)}

				{/*
				 * Focus order is intentional: amount input → Cancel → Confirm.
				 * That matches the visual left-to-right reading order in the
				 * footer (`sm:justify-between` puts Cancel on the left, Confirm
				 * on the right) and keeps the destructive action one Tab away
				 * from the primary action so users always pass through Cancel
				 * before reaching Confirm. The covering test in
				 * `__tests__/TradeDialog.focusOrder.test.tsx` guards this.
				 */}
				<DialogFooter className="sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						onClick={() => onOpenChange(false)}
						disabled={isBusy}
						data-focus-order="2"
						data-testid="trade-dialog-cancel"
					>
						Cancel
					</Button>
					<Button
						type="button"
						onClick={handleConfirm}
						disabled={confirmDisabled}
						aria-busy={isSubmitting || undefined}
						title={
							isPaused
								? 'Trading suspended: contract is paused'
								: undefined
						}
						data-focus-order="3"
						data-testid="trade-dialog-confirm"
					>
						<StableButtonContent
							isLoading={isSubmitting}
							loadingLabel="Submitting…"
						>
							{confirmLabel}
						</StableButtonContent>
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};

export default TradeDialog;
