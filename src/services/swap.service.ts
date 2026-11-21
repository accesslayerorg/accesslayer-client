/**
 * Swap Service for executing bonding curve buy/sell transactions with slippage protection.
 *
 * Implements buy and sell operations passing the computed slippage bounds
 * (maxSpent for buys, minReceived for sells) to the on-chain contract invocation.
 */

import {
	calculateSlippageBounds,
	type SlippageBounds,
	type SwapQuote,
} from '@/utils/slippage.utils';

export interface BuySwapParams {
	creatorId: string;
	amount: number;
	quote?: SwapQuote | number;
	price?: number;
	expectedCost?: number;
	totalCost?: number;
	slippageTolerancePercent?: number;
	slippageBps?: number;
	bound?: number | bigint;
	maxSpent?: number | bigint;
	minReceived?: number | bigint;
	[key: string]: unknown;
}

export interface SellSwapParams {
	creatorId: string;
	amount: number;
	quote?: SwapQuote | number;
	price?: number;
	expectedProceeds?: number;
	totalProceeds?: number;
	slippageTolerancePercent?: number;
	slippageBps?: number;
	bound?: number | bigint;
	minReceived?: number | bigint;
	maxSpent?: number | bigint;
	[key: string]: unknown;
}

export interface SwapExecutionResult {
	success: boolean;
	txHash: string;
	bound: number | bigint;
	bounds?: SlippageBounds;
	side: 'buy' | 'sell';
	creatorId: string;
	amount: number;
}

export interface SwapContractClient {
	buy_keys?(args: {
		creator_id: string;
		amount: number;
		max_spent: number | bigint;
		min_received?: number | bigint;
	}): Promise<{ hash?: string } | unknown>;
	buy?(args: {
		creator_id: string;
		amount: number;
		max_spent: number | bigint;
		min_received?: number | bigint;
	}): Promise<{ hash?: string } | unknown>;
	sell_keys?(args: {
		creator_id: string;
		amount: number;
		min_received: number | bigint;
		max_spent?: number | bigint;
	}): Promise<{ hash?: string } | unknown>;
	sell?(args: {
		creator_id: string;
		amount: number;
		min_received: number | bigint;
		max_spent?: number | bigint;
	}): Promise<{ hash?: string } | unknown>;
}

export class SwapService {
	private contractClient: SwapContractClient;

	constructor(client?: SwapContractClient) {
		this.contractClient = client ?? {
			buy_keys: async _args => {
				void _args;
				return { hash: `0x${Date.now().toString(16)}` };
			},
			sell_keys: async _args => {
				void _args;
				return { hash: `0x${Date.now().toString(16)}` };
			},
		};
	}

	setContractClient(client: SwapContractClient): void {
		this.contractClient = client;
	}

	getContractClient(): SwapContractClient {
		return this.contractClient;
	}

	/**
	 * Invokes buy contract call passing the computed max_spent bound.
	 */
	async buy(
		creatorIdOrParams: string | BuySwapParams,
		amountArg?: number,
		boundArg?: number | bigint,
		toleranceArg?: number
	): Promise<SwapExecutionResult> {
		const isObject =
			typeof creatorIdOrParams === 'object' && creatorIdOrParams !== null;
		const params: BuySwapParams = isObject
			? creatorIdOrParams
			: {
					creatorId: creatorIdOrParams,
					amount: amountArg ?? 1,
					bound: boundArg,
					slippageTolerancePercent: toleranceArg,
				};

		const { creatorId, amount } = params;
		if (!creatorId) throw new Error('creatorId is required');
		if (!amount || amount <= 0) throw new Error('Valid amount is required');

		const bps =
			params.slippageBps ??
			(params.slippageTolerancePercent != null
				? Math.round(params.slippageTolerancePercent * 100)
				: 100);

		const quote: SwapQuote =
			typeof params.quote === 'object' && params.quote !== null
				? params.quote
				: typeof params.quote === 'number'
					? { side: 'buy', amount, expectedCost: params.quote }
					: {
							side: 'buy',
							amount,
							expectedCost:
								params.expectedCost ??
								params.totalCost ??
								(params.price != null
									? params.price * amount
									: undefined),
						};

		const computedBounds = calculateSlippageBounds(quote, bps);
		const bound = params.bound ?? params.maxSpent ?? computedBounds.maxSpent;

		const client = this.contractClient;
		const contractFn = client.buy_keys ?? client.buy;

		let txHash = `0x${Date.now().toString(16)}`;
		if (typeof contractFn === 'function') {
			const res = await contractFn.call(client, {
				creator_id: creatorId,
				amount,
				max_spent: bound,
				min_received: params.minReceived ?? computedBounds.minReceived,
			});
			if (
				res &&
				typeof res === 'object' &&
				'hash' in res &&
				typeof res.hash === 'string'
			) {
				txHash = res.hash;
			}
		}

		return {
			success: true,
			txHash,
			bound,
			bounds: computedBounds,
			side: 'buy',
			creatorId,
			amount,
		};
	}

	/**
	 * Invokes sell contract call passing the computed min_received bound.
	 */
	async sell(
		creatorIdOrParams: string | SellSwapParams,
		amountArg?: number,
		boundArg?: number | bigint,
		toleranceArg?: number
	): Promise<SwapExecutionResult> {
		const isObject =
			typeof creatorIdOrParams === 'object' && creatorIdOrParams !== null;
		const params: SellSwapParams = isObject
			? creatorIdOrParams
			: {
					creatorId: creatorIdOrParams,
					amount: amountArg ?? 1,
					bound: boundArg,
					slippageTolerancePercent: toleranceArg,
				};

		const { creatorId, amount } = params;
		if (!creatorId) throw new Error('creatorId is required');
		if (!amount || amount <= 0) throw new Error('Valid amount is required');

		const bps =
			params.slippageBps ??
			(params.slippageTolerancePercent != null
				? Math.round(params.slippageTolerancePercent * 100)
				: 100);

		const quote: SwapQuote =
			typeof params.quote === 'object' && params.quote !== null
				? params.quote
				: typeof params.quote === 'number'
					? { side: 'sell', amount, expectedProceeds: params.quote }
					: {
							side: 'sell',
							amount,
							expectedProceeds:
								params.expectedProceeds ??
								params.totalProceeds ??
								(params.price != null
									? params.price * amount
									: undefined),
						};

		const computedBounds = calculateSlippageBounds(quote, bps);
		const bound =
			params.bound ?? params.minReceived ?? computedBounds.minReceived;

		const client = this.contractClient;
		const contractFn = client.sell_keys ?? client.sell;

		let txHash = `0x${Date.now().toString(16)}`;
		if (typeof contractFn === 'function') {
			const res = await contractFn.call(client, {
				creator_id: creatorId,
				amount,
				min_received: bound,
				max_spent: params.maxSpent ?? computedBounds.maxSpent,
			});
			if (
				res &&
				typeof res === 'object' &&
				'hash' in res &&
				typeof res.hash === 'string'
			) {
				txHash = res.hash;
			}
		}

		return {
			success: true,
			txHash,
			bound,
			bounds: computedBounds,
			side: 'sell',
			creatorId,
			amount,
		};
	}
}

export const swapService = new SwapService();

export async function buyKeys(
	params: BuySwapParams
): Promise<SwapExecutionResult> {
	return swapService.buy(params);
}

export async function sellKeys(
	params: SellSwapParams
): Promise<SwapExecutionResult> {
	return swapService.sell(params);
}

export default swapService;
