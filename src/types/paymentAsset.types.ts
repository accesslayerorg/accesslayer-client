import type { OracleStatus } from './oracle';

export interface PaymentAsset {
	code: string;
	name: string;
	decimals: number;
	rateAgainstXlm: number; // 1 XLM = X units of PaymentAsset
	balance: number;
	issuer?: string;
	oracleStatus?: Partial<OracleStatus>;
}

export interface ConvertedQuoteResult {
	assetCode: string;
	decimals: number;
	rate: number;
	rawUnits: bigint;
	numericAmount: number;
	formattedAmount: string;
	maxPayAmount: number;
	formattedMaxPay: string;
	hasSufficientBalance: boolean;
	shortfall: number;
	formattedShortfall: string;
	isFallback: boolean;
	rateSource: string;
	rateAgeMs: number;
}
