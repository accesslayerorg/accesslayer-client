import React, { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/utils/numberFormat.utils';
import {
	formatDisplayKeyPrice,
	estimateSellProceeds,
} from '@/utils/keyPriceDisplay.utils';
import SlippageToleranceSelector from '@/components/common/SlippageToleranceSelector';
import PriceImpactWarning from '@/components/common/PriceImpactWarning';
import PriceImpactOverrideCheckbox from '@/components/common/PriceImpactOverrideCheckbox';
import TradeConfirmationModal from '@/components/common/TradeConfirmationModal';
import LaunchPenaltyWarning from '@/components/common/LaunchPenaltyWarning';
import {
	computeSlippageBounds,
	type SlippageBounds,
} from '@/utils/slippageTolerance.utils';
import {
	calculateTradePriceImpact,
	isHighPriceImpact,
} from '@/utils/priceImpact.utils';
import CircuitBreakerStatusIndicator from '@/components/common/CircuitBreakerStatusIndicator';
import { evaluateCircuitBreakerStatus } from '@/utils/circuitBreaker.utils';
import { calculateLaunchPenalty } from '@/utils/launchPenalty.utils';
import {
	calculateFeeBreakdown,
	type FeeBreakdown,
} from '@/utils/pricePreview.utils';
import { BUY_QUANTITY_BOUNDS, FEE_BOUNDS } from '@/constants/fees';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import type { KeyConfig } from '@/services/course.service';
import SpreadIndicator from '@/components/common/SpreadIndicator';
import HoldingCapIndicator from '@/components/common/HoldingCapIndicator';
import { cn } from '@/lib/utils';
import { ArrowRight } from 'lucide-react';
import { useSlippageTolerancePreference } from '@/hooks/useSlippageTolerancePreference';
import { useGlobalPause } from '@/hooks/useGlobalPause';
import { useKeyTradeLimits } from '@/hooks/useKeyTradeLimits';
import {
	clampTradeAmountInput,
	formatTradeLimit,
	hasTradeLimit,
	isTradeLimitReached,
} from '@/utils/tradeLimit.utils';
import { UnavailableAction } from '@/components/ui/unavailable-action';
import PaymentAssetSelect from '@/components/common/PaymentAssetSelect';
import type { PaymentAsset } from '@/types/paymentAsset.types';
export interface BuySellTradeParams {
	creatorId?: string;
	side: 'buy' | 'sell';
	amount: number;
	priceStroops?: number | null;
	maxPriceStroops?: number | null;
	minPriceStroops?: number | null;
	slippageTolerancePercent: number;
	pricePreview?: FeeBreakdown | null;
	paymentAsset?: string;
	maxPay?: number;
	convertedQuote?: number;
}

export interface BuySellKeyFlowProps {
	creatorId?: string;
	creatorName: string;
	initialSide?: 'buy' | 'sell';
	availableHoldings?: number;
	keyPriceStroops?: number | null;
	currentSupply?: number | null;
	maxBuyQuantity?: number | null;
	/** Maximum holding cap per wallet configured by creator (#1015); null means no limit. */
	holdingCap?: number | null;
	maxHoldingCap?: number | null;
	protocolFeeBps?: number;
	creatorFeeBps?: number;
	launchPenaltyBps?: number | null;
	createdAtLedger?: number | null;
	currentLedger?: number | null;
	/** Live key trading config carrying the bid-ask spread (#951). */
	keyConfig?: KeyConfig | null;
	/** Whether the key config query is still loading. */
	isKeyConfigLoading?: boolean;
	/** Key-level circuit breaker threshold in percent (defaults to keyConfig or 15%) (#1034). */
	circuitBreakerThresholdPercent?: number | null;
	/** Key-level circuit breaker threshold in basis points (defaults to keyConfig or 1500) (#1034). */
	circuitBreakerThresholdBps?: number | null;
	onSubmitTrade?: (params: BuySellTradeParams) => Promise<void> | void;
	onSuccess?: (params: BuySellTradeParams) => void;
	onError?: (error: unknown) => void;
	isSubmitting?: boolean;
	/** True when an admin has paused trading for this specific key (#777). */
	tradingPaused?: boolean;
	/** Configured price floor in stroops (#1152). */
	priceFloorStroops?: number | null;
	/** Whether the price floor is active (spot <= floor) (#1152). */
	priceFloorActive?: boolean;
	className?: string;
}

/**
 * Complete Buy & Sell Key Flow with slippage protection controls (#919).
 * Includes:
 * - Buy/sell input panel with amount field and max button
 * - Slippage tolerance selector (0.5%, 1%, 2%, custom)
 * - Price impact warning when impact exceeds threshold (5%)
 * - Confirmation modal showing max_price/min_price before submission
 * - Transaction status feedback (toasts for loading, success, error)
 */
export const BuySellKeyFlow: React.FC<BuySellKeyFlowProps> = ({
	creatorId = '1',
	creatorName,
	initialSide = 'buy',
	availableHoldings = 0,
	keyPriceStroops,
	currentSupply = 0,
	maxBuyQuantity = null,
	holdingCap = null,
	maxHoldingCap = null,
	protocolFeeBps = FEE_BOUNDS.DEFAULT_FEE_BPS,
	creatorFeeBps = FEE_BOUNDS.DEFAULT_FEE_BPS,
	launchPenaltyBps,
	createdAtLedger,
	currentLedger,
	keyConfig,
	isKeyConfigLoading = false,
	circuitBreakerThresholdPercent,
	circuitBreakerThresholdBps,
	onSubmitTrade,
	onSuccess,
	onError,
	isSubmitting: externalIsSubmitting = false,
	tradingPaused = false,
	priceFloorStroops = null,
	priceFloorActive,
	className,
}) => {
	const effectiveHoldingCap = useMemo(
		() =>
			holdingCap ??
			maxHoldingCap ??
			keyConfig?.holdingCap ??
			keyConfig?.maxHoldingCap ??
			null,
		[holdingCap, maxHoldingCap, keyConfig?.holdingCap, keyConfig?.maxHoldingCap]
	);
	const [side, setSide] = useState<'buy' | 'sell'>(initialSide);
	const [amountText, setAmountText] = useState('1');
	const [touched, setTouched] = useState(false);
	const [slippageTolerancePercent, setSlippageTolerancePercent] =
		useSlippageTolerancePreference();
	const [acknowledgedImpactKey, setAcknowledgedImpactKey] = useState<
		string | null
	>(null);
	const [confirmationOpen, setConfirmationOpen] = useState(false);
	const [internalSubmitting, setInternalSubmitting] = useState(false);
	const [paymentAssetInfo, setPaymentAssetInfo] = useState<{
		asset?: PaymentAsset;
		maxPay?: number;
		convertedQuote?: number;
		hasSufficientBalance?: boolean;
	}>({});
	const { paused: globalPaused } = useGlobalPause();
	// Trading is blocked by a platform-wide pause OR a pause on this key (#777).
	const paused = globalPaused || tradingPaused;
	// Price floor active (#1152) blocks sell trades when spot price <= floor price.
	const isFloorActive =
		priceFloorActive ??
		(keyPriceStroops != null &&
		priceFloorStroops != null &&
		priceFloorStroops > 0
			? keyPriceStroops <= priceFloorStroops
			: false);

	const isSubmitting = externalIsSubmitting || internalSubmitting;

	// Per-swap size limits for this key; only the active side's limit applies (#1160).
	const { limits: tradeLimits } = useKeyTradeLimits(creatorId);
	const activeTradeLimit = side === 'buy' ? tradeLimits.maxBuy : tradeLimits.maxSell;

	const parsedAmount = useMemo(() => {
		const trimmed = amountText.trim();
		if (!trimmed) return Number.NaN;
		return Number(trimmed);
	}, [amountText]);

	const validationError = useMemo((): string | null => {
		const trimmed = amountText.trim();
		if (!trimmed) return 'Please enter an amount.';
		if (!Number.isFinite(parsedAmount))
			return 'Amount must be a valid number.';
		if (parsedAmount <= 0) return 'Amount must be greater than zero.';
		if (!Number.isInteger(parsedAmount))
			return 'Amount must be a whole number.';
		if (side === 'sell' && isFloorActive)
			return 'PriceFloorActive: Selling is disabled while current price is at or below the floor price.';

		if (
			side === 'buy' &&
			maxBuyQuantity != null &&
			parsedAmount > maxBuyQuantity
		) {
			return `Maximum ${formatNumber(maxBuyQuantity)} keys per transaction for this key`;
		}
		if (
			side === 'buy' &&
			effectiveHoldingCap != null &&
			Number.isFinite(effectiveHoldingCap) &&
			effectiveHoldingCap > 0
		) {
			if (availableHoldings >= effectiveHoldingCap) {
				return `Holding cap reached (${formatNumber(effectiveHoldingCap)} keys max per wallet).`;
			}
			if (
				Number.isFinite(parsedAmount) &&
				parsedAmount > 0 &&
				availableHoldings + parsedAmount > effectiveHoldingCap
			) {
				return `Purchase would exceed the holding cap of ${formatNumber(effectiveHoldingCap)} keys (you hold ${formatNumber(availableHoldings)}).`;
			}
		}
		if (side === 'sell' && parsedAmount > availableHoldings) {
			return `You can't sell more than your holdings (${formatNumber(
				availableHoldings
			)} keys).`;
		}
		return null;
	}, [
		amountText,
		parsedAmount,
		side,
		maxBuyQuantity,
		availableHoldings,
		effectiveHoldingCap,
		isFloorActive,
	]);

	const isCapLimitReached = useMemo(
		() =>
			side === 'buy' &&
			effectiveHoldingCap != null &&
			Number.isFinite(effectiveHoldingCap) &&
			effectiveHoldingCap > 0 &&
			availableHoldings >= effectiveHoldingCap,
		[side, effectiveHoldingCap, availableHoldings]
	);

	const isCapBreached = useMemo(
		() =>
			side === 'buy' &&
			effectiveHoldingCap != null &&
			Number.isFinite(effectiveHoldingCap) &&
			effectiveHoldingCap > 0 &&
			Number.isFinite(parsedAmount) &&
			parsedAmount > 0 &&
			availableHoldings + parsedAmount > effectiveHoldingCap,
		[side, effectiveHoldingCap, availableHoldings, parsedAmount]
	);

	const isValid = validationError === null;
	const showError = touched && validationError !== null;

	// Calculate Max value
	const handleMaxClick = () => {
		setTouched(true);
		if (side === 'sell') {
			setAmountText(String(Math.max(0, availableHoldings)));
		} else {
			let maxVal = maxBuyQuantity ?? BUY_QUANTITY_BOUNDS.MAX_QTY;
			if (
				effectiveHoldingCap != null &&
				Number.isFinite(effectiveHoldingCap) &&
				effectiveHoldingCap > 0
			) {
				const remainingCap = Math.max(0, effectiveHoldingCap - availableHoldings);
				maxVal = Math.min(maxVal, remainingCap);
			}
			setAmountText(String(maxVal));
		}
	};

	// Price calculations
	const pricePreview = useMemo<FeeBreakdown | null>(() => {
		if (side !== 'buy' || keyPriceStroops == null || !isValid) return null;
		return calculateFeeBreakdown({
			quantity: parsedAmount,
			keyPriceStroops,
			currentSupply: currentSupply ?? 0,
			protocolFeeBps,
			creatorFeeBps,
		});
	}, [
		side,
		keyPriceStroops,
		isValid,
		parsedAmount,
		currentSupply,
		protocolFeeBps,
		creatorFeeBps,
	]);

	const estimatedProceedsStroops = useMemo(() => {
		if (side !== 'sell' || !isValid) return null;
		return estimateSellProceeds(keyPriceStroops, currentSupply, parsedAmount);
	}, [side, isValid, keyPriceStroops, currentSupply, parsedAmount]);

	const totalStroops = useMemo(() => {
		if (side === 'buy') {
			return (
				pricePreview?.totalCostStroops ??
				(keyPriceStroops != null
					? keyPriceStroops * (parsedAmount || 0)
					: null)
			);
		}
		return estimatedProceedsStroops;
	}, [
		side,
		pricePreview,
		keyPriceStroops,
		parsedAmount,
		estimatedProceedsStroops,
	]);

	// Slippage bounds computation
	const slippageBounds = useMemo<SlippageBounds | null>(() => {
		if (totalStroops == null) return null;
		return computeSlippageBounds(
			side,
			totalStroops,
			slippageTolerancePercent
		);
	}, [side, totalStroops, slippageTolerancePercent]);

	// Price impact calculation
	const priceImpactPercent = useMemo(() => {
		if (!isValid || !Number.isFinite(parsedAmount)) return 0;
		return calculateTradePriceImpact({
			side,
			quantity: parsedAmount,
			currentSupply: currentSupply ?? 0,
		});
	}, [isValid, parsedAmount, side, currentSupply]);

	const effectiveCircuitBreakerThresholdPercent =
		circuitBreakerThresholdPercent ??
		keyConfig?.circuitBreakerThresholdPercent ??
		null;
	const effectiveCircuitBreakerThresholdBps =
		circuitBreakerThresholdBps ??
		keyConfig?.circuitBreakerThresholdBps ??
		null;

	const circuitBreakerStatus = useMemo(() => {
		if (side !== 'buy' || !isValid) return null;
		return evaluateCircuitBreakerStatus({
			impactPercent: priceImpactPercent,
			thresholdPercent: effectiveCircuitBreakerThresholdPercent,
			thresholdBps: effectiveCircuitBreakerThresholdBps,
		});
	}, [
		side,
		isValid,
		priceImpactPercent,
		effectiveCircuitBreakerThresholdPercent,
		effectiveCircuitBreakerThresholdBps,
	]);
}
