import { STROOPS_PER_XLM } from '@/constants/stellar';

export interface LargeTradeRuleConfig {
	id: 'PRICE_IMPACT' | 'TRADE_VALUE' | 'SUPPLY_PERCENT';
	label: string;
	description: string;
	thresholdValue: number;
	unit: string;
}

export const LARGE_TRADE_RULES: Record<
	'PRICE_IMPACT' | 'TRADE_VALUE' | 'SUPPLY_PERCENT',
	LargeTradeRuleConfig
> = {
	PRICE_IMPACT: {
		id: 'PRICE_IMPACT',
		label: 'High Price Impact',
		description: 'Trade causes price movement exceeding safe execution bounds (> 5%).',
		thresholdValue: 5.0, // percent
		unit: '%',
	},
	TRADE_VALUE: {
		id: 'TRADE_VALUE',
		label: 'High Trade Value',
		description: 'Total trade value exceeds whale liquidity warning threshold (10,000 XLM).',
		thresholdValue: 10000, // XLM
		unit: 'XLM',
	},
	SUPPLY_PERCENT: {
		id: 'SUPPLY_PERCENT',
		label: 'High Supply Percentage',
		description: 'Order quantity exceeds 10% of the key circulating supply.',
		thresholdValue: 10.0, // percent
		unit: '%',
	},
};

export const LARGE_TRADE_VALUE_THRESHOLD_STROOPS =
	LARGE_TRADE_RULES.TRADE_VALUE.thresholdValue * STROOPS_PER_XLM;
