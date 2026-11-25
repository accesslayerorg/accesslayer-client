import {
	computeBondingCurvePrice,
	computeSellRevenue,
	type BondingCurveParams,
} from '@/utils/bondingCurve.utils';
import { simulateKeyBuy } from '@/utils/keySimulation.utils';

export interface CurveTradeRequest {
	quantity: number;
	currentSupply: number;
	params: BondingCurveParams;
	protocolFeeBps: number;
	creatorFeeBps: number;
}

export interface CurveTradeQuote {
	quantity: number;
	grossStroops: number;
	protocolFeeStroops: number;
	creatorFeeStroops: number;
	totalStroops: number;
	averagePriceStroops: number;
	priceImpactPercent: number;
	startPriceStroops: number;
	endPriceStroops: number;
}

export function calculateCurveBuy(request: CurveTradeRequest): CurveTradeQuote | null {
	const simulation = simulateKeyBuy({
		quantity: request.quantity,
		currentSupply: request.currentSupply,
		protocolFeeBps: request.protocolFeeBps,
		creatorFeeBps: request.creatorFeeBps,
		curveParams: request.params,
	});
	if (!simulation) return null;

	return {
		quantity: request.quantity,
		grossStroops: simulation.grossCostStroops,
		protocolFeeStroops: simulation.protocolFeeStroops,
		creatorFeeStroops: simulation.creatorFeeStroops,
		totalStroops: simulation.totalCostStroops,
		averagePriceStroops: simulation.averagePriceStroops,
		priceImpactPercent: simulation.priceImpactPercent,
		startPriceStroops: simulation.startPriceStroops,
		endPriceStroops: simulation.endPriceStroops,
	};
}

export function calculateCurveSell(
	request: CurveTradeRequest
): CurveTradeQuote | null {
	const { quantity, currentSupply, params } = request;
	if (!Number.isFinite(quantity) || quantity <= 0) return null;
	if (!Number.isFinite(currentSupply) || currentSupply < 0) return null;

	const sellable = Math.min(quantity, currentSupply);
	if (sellable <= 0) return null;

	const startPriceStroops = computeBondingCurvePrice(currentSupply, params);
	const endPriceStroops = computeBondingCurvePrice(
		currentSupply - sellable,
		params
	);
	const grossStroops = computeSellRevenue(currentSupply, sellable, params);
	const protocolFeeStroops = Math.round(
		(grossStroops * request.protocolFeeBps) / 10_000
	);
	const creatorFeeStroops = Math.round(
		(grossStroops * request.creatorFeeBps) / 10_000
	);

	return {
		quantity: sellable,
		grossStroops,
		protocolFeeStroops,
		creatorFeeStroops,
		totalStroops: Math.max(0, grossStroops - protocolFeeStroops - creatorFeeStroops),
		averagePriceStroops: grossStroops / sellable,
		priceImpactPercent:
			startPriceStroops > 0
				? ((startPriceStroops - endPriceStroops) / startPriceStroops) * 100
				: 0,
		startPriceStroops,
		endPriceStroops,
	};
}

export function calculateCurveQuote(
	side: 'buy' | 'sell',
	request: CurveTradeRequest
): CurveTradeQuote | null {
	return side === 'buy'
		? calculateCurveBuy(request)
		: calculateCurveSell(request);
}

export interface SplitBuyComparison {
	chunkCount: number;
	lumpSumCostStroops: number;
	splitCostStroops: number;
	savingsStroops: number;
	lumpImpactPercent: number;
	splitImpactPercent: number;
}

export function compareBuyStrategies(
	request: CurveTradeRequest & { chunkCount: number }
): SplitBuyComparison | null {
	const lump = calculateCurveBuy(request);
	if (!lump) return null;
	const chunks = Math.max(1, Math.floor(request.chunkCount));
	const base = Math.floor(request.quantity / chunks);
	const remainder = request.quantity - base * chunks;
	let supply = request.currentSupply;
	let splitCostStroops = 0;
	let splitImpactPercent = 0;

	for (let index = 0; index < chunks; index += 1) {
		const quantity = base + (index < remainder ? 1 : 0);
		if (quantity <= 0) continue;
		const quote = calculateCurveBuy({
			...request,
			quantity,
			currentSupply: supply,
		});
		if (!quote) continue;
		splitCostStroops += quote.totalStroops;
		splitImpactPercent += quote.priceImpactPercent;
		supply += quantity;
	}

	return {
		chunkCount: chunks,
		lumpSumCostStroops: lump.totalStroops,
		splitCostStroops,
		savingsStroops: lump.totalStroops - splitCostStroops,
		lumpImpactPercent: lump.priceImpactPercent,
		splitImpactPercent,
	};
}
