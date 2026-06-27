import { formatEther } from 'ethers';
import { TRADE_FEE_ESTIMATE } from '@/constants/fees';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface FormatTransactionFeeOptions {
	unit?: string;
	maximumFractionDigits?: number;
	prefix?: string;
}

export interface NetworkFeeDataProvider {
	getFeeData: () => Promise<{
		gasPrice?: bigint | null;
		maxFeePerGas?: bigint | null;
	}>;
}

export type TradeFeeEstimateSide = 'buy' | 'sell';

export interface TradeNetworkFeeEstimateRequest {
	side: TradeFeeEstimateSide;
	amount: number;
}

/**
 * Formats a transaction fee for confirmation UIs.
 *
 * Keeps the raw value untouched and only normalizes the display with a unit
 * suffix and fee-style prefix so tiny network fees stay readable.
 */
export function formatTransactionFeeDisplay(
	fee: number | null | undefined,
	{
		unit = 'ETH',
		maximumFractionDigits = 6,
		prefix = '~',
	}: FormatTransactionFeeOptions = {}
): string {
	if (fee == null || !Number.isFinite(fee)) {
		return '—';
	}

	return `${prefix}${formatNumber(fee, {
		maximumFractionDigits,
		minimumFractionDigits: 0,
	})} ${unit}`;
}

export function getTradeFeeGasLimit(side: TradeFeeEstimateSide): bigint {
	return side === 'buy'
		? TRADE_FEE_ESTIMATE.BUY_GAS_LIMIT
		: TRADE_FEE_ESTIMATE.SELL_GAS_LIMIT;
}

export async function fetchTradeNetworkFeeEstimate(
	provider: NetworkFeeDataProvider,
	request: TradeNetworkFeeEstimateRequest
): Promise<number | null> {
	if (!Number.isFinite(request.amount) || request.amount <= 0) {
		return null;
	}

	const feeData = await provider.getFeeData();
	const gasPrice = feeData.maxFeePerGas ?? feeData.gasPrice;

	if (gasPrice == null) {
		return null;
	}

	const estimatedFeeWei = gasPrice * getTradeFeeGasLimit(request.side);
	return Number(formatEther(estimatedFeeWei));
}
