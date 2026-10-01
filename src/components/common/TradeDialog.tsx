import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import {
	BottomSheet,
	BottomSheetContent,
	BottomSheetDescription,
	BottomSheetHandle,
	BottomSheetTitle,
} from '@/components/ui/bottom-sheet';
import { useIsMobile } from '@/hooks/useIsMobile';
import { cn } from '@/lib/utils';
import { formatNumber } from '@/utils/numberFormat.utils';
import {
	formatDisplayKeyPrice,
	estimateSellProceeds,
} from '@/utils/keyPriceDisplay.utils';
import PercentageBadge from '@/components/common/PercentageBadge';
import NetworkFeeHint from '@/components/common/NetworkFeeHint';
import AllowanceApprovalStep from '@/components/common/AllowanceApprovalStep';
import HoldingCapWarning from '@/components/common/HoldingCapWarning';
import BuyFeeBreakdown from '@/components/common/BuyFeeBreakdown';
import SellFeeBreakdown from '@/components/common/SellFeeBreakdown';
import LaunchPenaltyWarning from '@/components/common/LaunchPenaltyWarning';
import SlippageToleranceSelector from '@/components/common/SlippageToleranceSelector';
import PriceImpactWarning from '@/components/common/PriceImpactWarning';
import TradeConfirmationModal from '@/components/common/TradeConfirmationModal';
import {
	TRADE_FEE_ESTIMATE,
	FEE_BOUNDS,
	BUY_QUANTITY_BOUNDS,
} from '@/constants/fees';
import {
	fetchTradeNetworkFeeEstimate,
	formatTransactionFeeDisplay,
	type NetworkFeeDataProvider,
} from '@/utils/transactionFee.utils';
import { clampBuyQuantity } from '@/utils/buyQuantity';
import { normalizeCreatorDisplayName } from '@/utils/creatorDisplayName.utils';
import { calculateLaunchPenalty } from '@/utils/launchPenalty.utils';
import {
	fetchPricePreview,
	type FeeBreakdown,
} from '@/utils/pricePreview.utils';
import {
	buildDynamicFeeBreakdown,
	type ContractDynamicFeeRate,
	type DynamicFeeBreakdown as DynamicFeeBreakdownData,
} from '@/utils/dynamicFeeRate.utils';
import { courseService, type KeyConfig } from '@/services/course.service';
import SpreadIndicator from '@/components/common/SpreadIndicator';
import CircuitBreakerStatusIndicator from '@/components/common/CircuitBreakerStatusIndicator';
import { evaluateCircuitBreakerStatus } from '@/utils/circuitBreaker.utils';
import {
	calculateTradePriceImpact,
	PRICE_IMPACT_THRESHOLD_PERCENT,
} from '@/utils/priceImpact.utils';
import {
	DEFAULT_SLIPPAGE_TOLERANCE_PERCENT,
	computeSlippageBounds,
	type SlippageBounds,
} from '@/utils/slippageTolerance.utils';
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

/**
 * Merges contract-returned dynamic fee rates over the dialog's configured
 * defaults, keeping defaults wherever the contract omits a field (#994).
 */
function mergeFeeRates(
	base: ContractDynamicFeeRate,
	incoming: ContractDynamicFeeRate
): ContractDynamicFeeRate {
	return {
		baseFeeBps: incoming.baseFeeBps ?? base.baseFeeBps,
		volumeTierDiscountBps:
			incoming.volumeTierDiscountBps ?? base.volumeTierDiscountBps,
		protocolFeeBps: incoming.protocolFeeBps ?? base.protocolFeeBps,
		creatorRoyaltyBps: incoming.creatorRoyaltyBps ?? base.creatorRoyaltyBps,
	};
}

export interface TradeDialogProps {
	open: boolean;
	side: TradeSide;
	creatorName: string;
	/** Creator / course ID — used to look up the holding cap. */
	creatorId?: string;
	availableHoldings: number;
	/** Per-key price in stroops, shown on the buy confirmation step. */
	keyPriceStroops?: number | null;
	/** Current key supply for estimating sell proceeds. */
	currentSupply?: number | null;
	/** Protocol fee in basis points for fee preview (defaults to FEE_BOUNDS.DEFAULT_FEE_BPS) */
	protocolFeeBps?: number;
	/** Creator fee in basis points for fee preview (defaults to FEE_BOUNDS.DEFAULT_FEE_BPS) */
	creatorFeeBps?: number;
	/** Ledger sequence the key was created at, from the key detail API. */
	createdAtLedger?: number | null;
	/** Current network ledger sequence, used to evaluate the 7-day launch window. */
	currentLedger?: number | null;
	/** Early-sell penalty in basis points, from the key detail API. */
	launchPenaltyBps?: number | null;
	/** Max buy quantity allowed per transaction; null means no limit. */
	maxBuyQuantity?: number | null;
	/** Live key trading config carrying the bid-ask spread (#951). */
	keyConfig?: KeyConfig | null;
	/** Whether the key config query is still loading. */
	isKeyConfigLoading?: boolean;
	/** Key-level circuit breaker threshold in percent (defaults to keyConfig or 15%) (#1034). */
	circuitBreakerThresholdPercent?: number | null;
	/** Key-level circuit breaker threshold in basis points (defaults to keyConfig or 1500) (#1034). */
	circuitBreakerThresholdBps?: number | null;
	/** Whether to display the confirmation modal step before submission (#919). Defaults to false. */
	requireConfirmation?: boolean;
	/** Optional XLM/USD spot rate for the confirmation fee USD equivalent (#994). */
	xlmUsdRate?: number | null;
	onOpenChange: (open: boolean) => void;
	onConfirm: (
		amount: number,
		pricePreview?: FeeBreakdown | null,
		slippage?: SlippageBounds | null
	) => Promise<void> | void;
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
	currentSupply,
	protocolFeeBps = FEE_BOUNDS.DEFAULT_FEE_BPS,
	creatorFeeBps = FEE_BOUNDS.DEFAULT_FEE_BPS,
	createdAtLedger,
	currentLedger,
	launchPenaltyBps,
	maxBuyQuantity = null,
	keyConfig,
	isKeyConfigLoading = false,
	circuitBreakerThresholdPercent,
	circuitBreakerThresholdBps,
	requireConfirmation = false,
	xlmUsdRate = null,
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
	const [pricePreview, setPricePreview] = useState<FeeBreakdown | null>(null);
	const [previewLoading, setPreviewLoading] = useState(false);
	const [previewError, setPreviewError] = useState<string | null>(null);
	const [slippageTolerancePercent, setSlippageTolerancePercent] = useState(
		DEFAULT_SLIPPAGE_TOLERANCE_PERCENT
	);
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	const amountInputRef = useRef<HTMLInputElement | null>(null);
	const pricePreviewFailureLogged = useRef(false);
	const previewAbortControllerRef = useRef<AbortController | null>(null);
	// Capture whatever had focus right before dialog opened; restore on close.
	const triggerElementRef = useRef<HTMLElement | null>(null);

	// On open: reset state, kick off allowance check + cap fetch.
	useEffect(() => {
		if (open) {
			triggerElementRef.current =
				document.activeElement as HTMLElement | null;
			setAmountText('1');
			setTouched(false);
			setAdjustmentNote(null);
			setPricePreview(null);
			setPreviewLoading(false);
			setPreviewError(null);
			setSlippageTolerancePercent(DEFAULT_SLIPPAGE_TOLERANCE_PERCENT);
			pricePreviewFailureLogged.current = false;
		}
		if (open && side === 'stake' && activeAddress) {
			checkAllowance(activeAddress);
		}
		if (open && side === 'buy' && creatorId && activeAddress) {
			fetchCap(creatorId, activeAddress);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [open, side, activeAddress, creatorId]);

	// Keyboard shortcuts for amount adjustment.
	useEffect(() => {
		if (!open || isSubmitting) return;

		const handleAmountKey = (event: KeyboardEvent) => {
			if (event.defaultPrevented || event.repeat) return;
			const activeEl = document.activeElement;
			if (
				!(activeEl instanceof HTMLInputElement) ||
				activeEl.getAttribute('data-testid') !== 'trade-dialog-amount'
			) {
				return;
			}
			if (event.ctrlKey || event.metaKey || event.altKey) return;
			const key = event.key;
			const presets: Record<string, number> = {
				'1': 1,
				'2': 2,
				'3': 3,
				'4': 5,
				'5': 10,
			};
			if (!event.shiftKey && presets[key] !== undefined) {
				event.preventDefault();
				setAmountText(
					clampBuyQuantity(presets[key].toString()).value.toString()
				);
				setTouched(true);
				return;
			}
			if (key === '!' && event.shiftKey) {
				event.preventDefault();
				setAmountText(clampBuyQuantity('10').value.toString());
				setTouched(true);
				return;
			}
			if (key === '+' || (key === '=' && event.shiftKey)) {
				event.preventDefault();
				const next = Math.max(1, (Number(amountText) || 0) + 1);
				setAmountText(clampBuyQuantity(next.toString()).value.toString());
				setTouched(true);
				return;
			}
			if (key === '-') {
				event.preventDefault();
				const next = Math.max(1, (Number(amountText) || 0) - 1);
				setAmountText(clampBuyQuantity(next.toString()).value.toString());
				setTouched(true);
			}
		};
		window.addEventListener('keydown', handleAmountKey);
		return () => window.removeEventListener('keydown', handleAmountKey);
	}, [open, isSubmitting, amountText]);

	const handleBlur = useCallback(() => {
		setTouched(true);
		if (side !== 'buy') return;
		const maxClamp =
			maxBuyable !== null
				? Math.min(BUY_QUANTITY_BOUNDS.MAX_QTY, maxBuyable)
				: BUY_QUANTITY_BOUNDS.MAX_QTY;
		const res = clampBuyQuantity(
			amountText.trim(),
			BUY_QUANTITY_BOUNDS.MIN_QTY,
			maxClamp
		);
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
	}, [amountText, maxBuyable, side]);

	const parsedAmount = useMemo(() => {
		const normalized = amountText.trim();
		if (!normalized) return NaN;
		return Number(normalized);
	}, [amountText]);

	const validationError = useMemo((): string | null => {
		const normalized = amountText.trim();
		if (!normalized) return 'Please enter an amount.';
		if (!Number.isFinite(parsedAmount))
			return 'Amount must be a valid number.';
		if (parsedAmount <= 0) return 'Amount must be greater than zero.';
		if (isPaused)
			return 'Trading is currently suspended because the contract is paused.';
		if (side === 'buy' && atCap)
			return 'You have reached the maximum holding cap for this creator.';
		if (side === 'buy' && maxBuyable !== null && parsedAmount > maxBuyable)
			return `You can only buy up to ${formatNumber(maxBuyable)} more key${maxBuyable !== 1 ? 's' : ''} (holding cap).`;
		if (
			side === 'buy' &&
			maxBuyQuantity != null &&
			parsedAmount > maxBuyQuantity
		)
			return `Maximum ${formatNumber(maxBuyQuantity)} keys per transaction for this key`;
		if (
			(side === 'sell' || side === 'stake' || side === 'transfer') &&
			parsedAmount > availableHoldings
		)
			return `You can't ${side} more than your holdings (${formatNumber(availableHoldings)} keys).`;
		return null;
	}, [
		amountText,
		parsedAmount,
		side,
		availableHoldings,
		atCap,
		maxBuyable,
		maxBuyQuantity,
		isPaused,
	]);

	const amountValid = validationError === null;
	const showError = touched && validationError !== null;

	const priceImpactPercent = useMemo(() => {
		if (
			!amountValid ||
			!Number.isFinite(parsedAmount) ||
			(side !== 'buy' && side !== 'sell')
		)
			return 0;
		return calculateTradePriceImpact({
			side,
			quantity: parsedAmount,
			currentSupply: currentSupply ?? 0,
		});
	}, [amountValid, parsedAmount, side, currentSupply]);

	const effectiveCircuitBreakerThresholdPercent =
		circuitBreakerThresholdPercent ??
		keyConfig?.circuitBreakerThresholdPercent ??
		null;
	const effectiveCircuitBreakerThresholdBps =
		circuitBreakerThresholdBps ??
		keyConfig?.circuitBreakerThresholdBps ??
		null;

	const circuitBreakerStatus = useMemo(() => {
		if (side !== 'buy' || !amountValid) return null;
		return evaluateCircuitBreakerStatus({
			impactPercent: priceImpactPercent,
			thresholdPercent: effectiveCircuitBreakerThresholdPercent,
			thresholdBps: effectiveCircuitBreakerThresholdBps,
		});
	}, [
		side,
		amountValid,
		priceImpactPercent,
		effectiveCircuitBreakerThresholdPercent,
		effectiveCircuitBreakerThresholdBps,
	]);

	const isCircuitBreakerBreached = Boolean(
		side === 'buy' && circuitBreakerStatus?.isBreached
	);

	const isAllowanceChecking =
		side === 'stake' && allowanceStatus === 'checking';
	const requiresAllowanceApproval = side === 'stake' && needsApproval;
	const confirmDisabled =
		!amountValid ||
		isSubmitting ||
		isApproving ||
		isAllowanceChecking ||
		isCircuitBreakerBreached ||
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
			? isCircuitBreakerBreached
				? 'Circuit Breaker Tripped'
				: atCap
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

	// Network fee estimation effect.
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
				if (!cancelled)
					setNetworkFeeEstimate({ status: 'error', fee: null });
			});
		return () => {
			cancelled = true;
		};
	}, [amountValid, networkFeeEstimateProvider, open, parsedAmount, side]);

	const estimatedProceedsStroops = useMemo(() => {
		if (
			side !== 'sell' ||
			!Number.isFinite(parsedAmount) ||
			parsedAmount <= 0
		)
			return null;
		return estimateSellProceeds(keyPriceStroops, currentSupply, parsedAmount);
	}, [side, keyPriceStroops, currentSupply, parsedAmount]);

	const launchPenalty = useMemo(
		() =>
			calculateLaunchPenalty(
				estimatedProceedsStroops,
				createdAtLedger,
				currentLedger,
				launchPenaltyBps
			),
		[
			estimatedProceedsStroops,
			createdAtLedger,
			currentLedger,
			launchPenaltyBps,
		]
	);

	const estimatedTotalStroops = useMemo(() => {
		if (
			side !== 'buy' ||
			!Number.isFinite(parsedAmount) ||
			parsedAmount <= 0 ||
			keyPriceStroops == null
		)
			return null;
		return keyPriceStroops * parsedAmount;
	}, [side, keyPriceStroops, parsedAmount]);

	const slippageReferencePriceStroops = useMemo(() => {
		if (side === 'buy')
			return pricePreview?.totalCostStroops ?? estimatedTotalStroops ?? null;
		return estimatedProceedsStroops;
	}, [side, pricePreview, estimatedTotalStroops, estimatedProceedsStroops]);

	const slippageBounds = useMemo<SlippageBounds | null>(() => {
		if (
			slippageReferencePriceStroops == null ||
			(side !== 'buy' && side !== 'sell')
		)
			return null;
		return computeSlippageBounds(
			side,
			slippageReferencePriceStroops,
			slippageTolerancePercent
		);
	}, [side, slippageReferencePriceStroops, slippageTolerancePercent]);

	const handleMaxClick = () => {
		setTouched(true);
		if (side === 'sell') {
			setAmountText(String(Math.max(0, availableHoldings)));
		} else {
			const maxVal =
				maxBuyQuantity != null
					? maxBuyQuantity
					: BUY_QUANTITY_BOUNDS.MAX_QTY;
			setAmountText(String(maxVal));
		}
	};

	// Price preview fetch (buy only).
	useEffect(() => {
		if (side !== 'buy' || keyPriceStroops == null) {
			setPricePreview(null);
			setPreviewLoading(false);
			return;
		}
		if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
			setPricePreview(null);
			setPreviewLoading(false);
			setPreviewError(null);
			return;
		}
		const timeoutId = window.setTimeout(async () => {
			if (previewAbortControllerRef.current)
				previewAbortControllerRef.current.abort();
			setPreviewLoading(true);
			setPreviewError(null);
			try {
				const preview = await fetchPricePreview({
					quantity: parsedAmount,
					keyPriceStroops,
					currentSupply: currentSupply ?? 0,
					protocolFeeBps,
					creatorFeeBps,
				});
				setPricePreview(preview);
			} catch (error) {
				if (error instanceof Error && error.name === 'AbortError') return;
				setPreviewError(
					error instanceof Error
						? error.message
						: 'Failed to fetch price preview'
				);
				setPricePreview(null);
			} finally {
				setPreviewLoading(false);
			}
		}, 200);
		return () => clearTimeout(timeoutId);
	}, [
		side,
		parsedAmount,
		keyPriceStroops,
		currentSupply,
		protocolFeeBps,
		creatorFeeBps,
	]);

	// Price preview failure logging.
	useEffect(() => {
		if (
			process.env.NODE_ENV === 'test' ||
			!open ||
			pricePreviewFailureLogged.current
		)
			return;
		if (side === 'buy' && keyPriceStroops == null) {
			console.debug('[price-preview-failure]', {
				creator_name: creatorName,
				quantity: Number.isFinite(parsedAmount) ? parsedAmount : null,
				side: 'buy',
				reason: 'key_price_missing',
				timestamp: new Date().toISOString(),
			});
			pricePreviewFailureLogged.current = true;
		}
	}, [open, side, keyPriceStroops, creatorName, parsedAmount]);
	useEffect(() => {
		if (
			process.env.NODE_ENV === 'test' ||
			!open ||
			pricePreviewFailureLogged.current
		)
			return;
		if (side === 'sell' && estimatedProceedsStroops == null) {
			console.debug('[price-preview-failure]', {
				creator_name: creatorName,
				quantity: Number.isFinite(parsedAmount) ? parsedAmount : null,
				side: 'sell',
				reason: 'estimate_unavailable',
				timestamp: new Date().toISOString(),
			});
			pricePreviewFailureLogged.current = true;
		}
	}, [open, side, estimatedProceedsStroops, creatorName, parsedAmount]);

	const handleConfirm = async () => {
		if (confirmDisabled) return;
		if (requireConfirmation) {
			setConfirmationOpen(true);
			return;
		}
		await onConfirm(parsedAmount, pricePreview, slippageBounds);
		if (side === 'buy' && creatorId)
			incrementHolding(creatorId, parsedAmount);
	};

	const isMobile = useIsMobile();

	// Live dynamic fee rate from the contract (#994). Mirrors the debounced
	// price-preview effect above: fetched while the dialog is open (with a
	// small debounce) and re-fetched whenever the trade amount changes, so
	// the confirmation screen quotes the rate the contract will actually
	// charge. The breakdown is derived from the live rates and the current
	// trade notional, so it refreshes whenever the amount changes.
	const [dynamicFeeRates, setDynamicFeeRates] =
		useState<ContractDynamicFeeRate>({
			protocolFeeBps,
			creatorRoyaltyBps: creatorFeeBps,
		});
	const [isFeeRateLoading, setFeeRateLoading] = useState(false);
	const [feeRateError, setFeeRateError] = useState<string | null>(null);
	const feeRateAbortRef = useRef<AbortController | null>(null);

	useEffect(() => {
		if (!open) {
			setDynamicFeeRates({
				protocolFeeBps,
				creatorRoyaltyBps: creatorFeeBps,
			});
			setFeeRateLoading(false);
			setFeeRateError(null);
			return;
		}

		// Debounce to avoid hammering the contract while the user types.
		const timeoutId = window.setTimeout(() => {
			feeRateAbortRef.current?.abort();
			const controller = new AbortController();
			feeRateAbortRef.current = controller;

			setFeeRateLoading(true);
			setFeeRateError(null);

			courseService
				.getDynamicFeeRate(creatorId ?? creatorName, {
					signal: controller.signal,
				})
				.then(rates => {
					if (controller.signal.aborted) return;
					// Merge over the dialog's configured rates so a partial
					// contract payload never blanks a fee row.
					setDynamicFeeRates(
						mergeFeeRates(
							{ protocolFeeBps, creatorRoyaltyBps: creatorFeeBps },
							rates
						)
					);
					setFeeRateLoading(false);
				})
				.catch((error: unknown) => {
					if (
						controller.signal.aborted ||
						(error instanceof Error && error.name === 'CanceledError')
					) {
						return;
					}
					if (
						error instanceof DOMException &&
						error.name === 'AbortError'
					) {
						return;
					}
					// Keep the last known good rates; just surface the error.
					setFeeRateError(
						error instanceof Error
							? error.message
							: 'Failed to fetch the dynamic fee rate'
					);
					setFeeRateLoading(false);
				});
		}, 200);

		return () => clearTimeout(timeoutId);
	}, [open, creatorId, creatorName, protocolFeeBps, creatorFeeBps]);

	const handleFeeRateRetry = useCallback(() => {
		setFeeRateError(null);
		setFeeRateLoading(true);
		courseService
			.getDynamicFeeRate(creatorId ?? creatorName)
			.then(rates => {
				setDynamicFeeRates(
					mergeFeeRates(
						{ protocolFeeBps, creatorRoyaltyBps: creatorFeeBps },
						rates
					)
				);
				setFeeRateLoading(false);
			})
			.catch((error: unknown) => {
				setFeeRateError(
					error instanceof Error
						? error.message
						: 'Failed to fetch the dynamic fee rate'
				);
				setFeeRateLoading(false);
			});
	}, [creatorId, creatorName, protocolFeeBps, creatorFeeBps]);

	const dynamicFeeBreakdown = useMemo<DynamicFeeBreakdownData | null>(() => {
		if (side === 'buy') {
			if (
				!amountValid ||
				parsedAmount <= 0 ||
				estimatedTotalStroops == null ||
				estimatedTotalStroops <= 0
			) {
				return null;
			}
		} else if (
			!amountValid ||
			parsedAmount <= 0 ||
			estimatedProceedsStroops == null ||
			estimatedProceedsStroops <= 0
		) {
			return null;
		}

		return buildDynamicFeeBreakdown({
			// Fees are computed on the gross key cost / gross proceeds — never
			// on the fee-inclusive total — so components never compound.
			notionalStroops:
				side === 'buy' ? estimatedTotalStroops : estimatedProceedsStroops,
			rates: dynamicFeeRates,
			isSell: side === 'sell',
			xlmUsdRate,
		});
	}, [
		side,
		amountValid,
		parsedAmount,
		estimatedTotalStroops,
		estimatedProceedsStroops,
		dynamicFeeRates,
		xlmUsdRate,
	]);

	const bodyContent = (
		<>
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

			{/* Configurable bid-ask spread between buy and sell price (#951) */}
			<SpreadIndicator
				buyPriceStroops={keyConfig?.buyPriceStroops}
				sellPriceStroops={keyConfig?.sellPriceStroops}
				spreadStroops={keyConfig?.spreadStroops}
				spreadBps={keyConfig?.spreadBps}
				isLoading={isKeyConfigLoading}
			/>

			{side === 'sell' && (
				<LaunchPenaltyWarning
					visible={launchPenalty.applies}
					penaltyBps={launchPenalty.penaltyBps}
				/>
			)}

			{/* Holding cap warning (#961) — buy side only */}
			{side === 'buy' && capData && <HoldingCapWarning data={capData} />}

			<div className="space-y-2">
				<div className="text-sm text-white/70">Amount</div>
				<div className="relative flex items-center">
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
							'w-full rounded-xl border bg-white/[0.04] px-3 py-2 pr-16 text-white outline-none transition-colors',
							'border-white/10 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15',
							showError ? 'border-red-500/60' : '',
							atCap || isPaused ? 'opacity-40 cursor-not-allowed' : ''
						)}
						aria-label="Trade amount"
						aria-describedby={
							showError ? 'trade-amount-error' : undefined
						}
						aria-invalid={showError || undefined}
						data-focus-order="1"
						data-testid="trade-dialog-amount"
					/>
					<button
						type="button"
						data-testid="trade-dialog-max-button"
						onClick={handleMaxClick}
						disabled={
							isSubmitting || (side === 'sell' && availableHoldings <= 0)
						}
						className="absolute right-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-xs font-bold text-amber-300 transition-colors hover:bg-amber-400/20 active:scale-95 disabled:pointer-events-none disabled:opacity-40"
					>
						MAX
					</button>
				</div>

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

				{side === 'buy' && (
					<CircuitBreakerStatusIndicator
						impactPercent={priceImpactPercent}
						thresholdPercent={effectiveCircuitBreakerThresholdPercent}
						thresholdBps={effectiveCircuitBreakerThresholdBps}
						isValid={amountValid}
					/>
				)}

				<NetworkFeeHint
					variant="text"
					label="Approx. network fee"
					fee={networkFeeCopy}
					className="text-white/45"
				/>

				{side === 'buy' && amountValid && (
					<BuyFeeBreakdown
						breakdown={pricePreview}
						isLoading={previewLoading}
						error={previewError}
						onRetry={() => {
							setPreviewError(null);
							setPreviewLoading(true);
						}}
					/>
				)}
				{side === 'buy' && estimatedTotalStroops != null && (
					<div className="text-xs text-white/45 mt-2">
						Estimated total (approximate):{' '}
						<span className="font-semibold text-amber-300/90 tabular-nums">
							{formatDisplayKeyPrice(estimatedTotalStroops)}
						</span>
					</div>
				)}
				{side === 'sell' && (
					<SellFeeBreakdown
						grossProceedsStroops={estimatedProceedsStroops}
						launchPenalty={launchPenalty}
					/>
				)}

				{amountValid && (
					<div className="mt-3 border-t border-white/10 pt-3">
						<SlippageToleranceSelector
							value={slippageTolerancePercent}
							onChange={setSlippageTolerancePercent}
							disabled={isSubmitting}
						/>
						{slippageBounds && (
							<p
								className="mt-2 text-[0.7rem] text-white/45"
								data-testid="trade-dialog-slippage-bound"
							>
								{side === 'buy'
									? slippageBounds.maxPriceStroops != null && (
											<>
												Max price:{' '}
												<span className="font-semibold text-white/70 tabular-nums">
													{formatDisplayKeyPrice(
														slippageBounds.maxPriceStroops
													)}
												</span>
											</>
										)
									: slippageBounds.minPriceStroops != null && (
											<>
												Min price:{' '}
												<span className="font-semibold text-white/70 tabular-nums">
													{formatDisplayKeyPrice(
														slippageBounds.minPriceStroops
													)}
												</span>
											</>
										)}
							</p>
						)}
						<PriceImpactWarning
							impactPercent={priceImpactPercent}
							threshold={PRICE_IMPACT_THRESHOLD_PERCENT}
							className="mt-2"
						/>
					</div>
				)}
			</div>

			{/* Allowance approval step (#955) — shown when approval is needed for staking */}
			{requiresAllowanceApproval && (
				<AllowanceApprovalStep
					isApproving={isApproving}
					errorMessage={approvalError}
					onApprove={() => activeAddress && submitApproval(activeAddress)}
				/>
			)}
		</>
	);

	const actionButtons = (
		<>
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
					isPaused ? 'Trading suspended: contract is paused' : undefined
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
		</>
	);

	const confirmationModal =
		side === 'buy' || side === 'sell' ? (
			<TradeConfirmationModal
				open={confirmationOpen}
				onOpenChange={setConfirmationOpen}
				side={side}
				creatorName={creatorName}
				amount={parsedAmount}
				unitPriceStroops={keyPriceStroops}
				totalStroops={slippageReferencePriceStroops}
				feeBreakdown={dynamicFeeBreakdown}
				feeIsLoading={isFeeRateLoading}
				feeError={feeRateError}
				onFeeRetry={handleFeeRateRetry}
				slippageTolerancePercent={slippageTolerancePercent}
				maxPriceStroops={slippageBounds?.maxPriceStroops ?? null}
				minPriceStroops={slippageBounds?.minPriceStroops ?? null}
				priceImpactPercent={priceImpactPercent}
				onConfirm={async () => {
					if (isCircuitBreakerBreached) return;
					await onConfirm(parsedAmount, pricePreview, slippageBounds);
					if (side === 'buy' && creatorId)
						incrementHolding(creatorId, parsedAmount);
					setConfirmationOpen(false);
				}}
				onCancel={() => setConfirmationOpen(false)}
				isSubmitting={isSubmitting}
			/>
		) : null;

	if (isMobile) {
		return (
			<>
				<BottomSheet
					open={open}
					onOpenChange={next => !isBusy && onOpenChange(next)}
				>
					<BottomSheetContent
						className="max-h-[calc(100vh-80px)] overflow-y-auto"
						enableDrag={!isBusy}
						hideCloseButton={isBusy}
						onOpenAutoFocus={event => {
							event.preventDefault();
							amountInputRef.current?.focus();
						}}
						onCloseAutoFocus={event => {
							event.preventDefault();
							triggerElementRef.current?.focus();
						}}
						onEscapeKeyDown={event => {
							if (isBusy) event.preventDefault();
						}}
						onInteractOutside={event => {
							if (isBusy) event.preventDefault();
						}}
					>
						<BottomSheetHandle />
						<div className="flex flex-col gap-2 text-center sm:text-left mb-4">
							<BottomSheetTitle className="text-lg leading-none font-semibold">
								{title}
							</BottomSheetTitle>
							<BottomSheetDescription className="text-muted-foreground text-sm">
								{side === 'buy'
									? `Purchase creator keys for ${displayCreatorName}.`
									: side === 'sell'
										? `Sell creator keys for ${displayCreatorName}.`
										: side === 'stake'
											? `Stake creator keys for ${displayCreatorName}.`
											: `Transfer creator keys for ${displayCreatorName}.`}
							</BottomSheetDescription>
						</div>
						{bodyContent}
						<div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
							{actionButtons}
						</div>
					</BottomSheetContent>
				</BottomSheet>
				{confirmationModal}
			</>
		);
	}

	return (
		<>
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
					onCloseAutoFocus={event => {
						event.preventDefault();
						triggerElementRef.current?.focus();
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

					{bodyContent}

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
						{actionButtons}
					</DialogFooter>

					<div
						className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-white/5 pt-3 text-[11px] text-white/30"
						aria-hidden="true"
						data-testid="trade-dialog-shortcut-hint"
					>
						<span className="flex items-center gap-1">
							<kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 font-mono text-[10px]">
								Enter
							</kbd>
							confirm
						</span>
						<span className="flex items-center gap-1">
							<kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 font-mono text-[10px]">
								Esc
							</kbd>
							close
						</span>
						<span className="flex items-center gap-1">
							<kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 font-mono text-[10px]">
								+
							</kbd>
							<kbd className="rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 font-mono text-[10px]">
								-
							</kbd>
							adjust
						</span>
					</div>
				</DialogContent>
			</Dialog>
			{confirmationModal}
		</>
	);
};

export default TradeDialog;
