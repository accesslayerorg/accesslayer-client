import { describe, it, expect } from 'vitest';
import { convertQuoteToPaymentAsset } from '../paymentAsset.utils';
import type { PaymentAsset } from '@/types/paymentAsset.types';

describe('paymentAsset.utils (#1445)', () => {
	// Base quote: 10 XLM = 100,000,000 stroops (7 decimals)
	const baseQuoteStroops = 100_000_000n; // 10 XLM

	it('converts quote correctly for 7-decimal native asset (XLM)', () => {
		const xlmAsset: PaymentAsset = {
			code: 'XLM',
			name: 'Stellar Lumens',
			decimals: 7,
			rateAgainstXlm: 1.0,
			balance: 50.0,
		};

		const result = convertQuoteToPaymentAsset(baseQuoteStroops, xlmAsset, 1.0);

		// 10 XLM * 1.0 = 10 XLM
		expect(result.numericAmount).toBe(10);
		expect(result.formattedAmount).toBe('10.0000000');
		// Max pay at 1% slippage = 10 * 1.01 = 10.1
		expect(result.maxPayAmount).toBeCloseTo(10.1, 5);
		expect(result.hasSufficientBalance).toBe(true);
		expect(result.shortfall).toBe(0);
	});

	it('converts quote correctly for 6-decimal tokens (e.g. USDC)', () => {
		const usdcAsset: PaymentAsset = {
			code: 'USDC',
			name: 'USD Coin',
			decimals: 6,
			rateAgainstXlm: 0.125, // 1 XLM = 0.125 USDC
			balance: 100.0,
		};

		const result = convertQuoteToPaymentAsset(baseQuoteStroops, usdcAsset, 2.0);

		// 10 XLM * 0.125 = 1.25 USDC
		expect(result.numericAmount).toBe(1.25);
		expect(result.formattedAmount).toBe('1.250000');
		// Max pay at 2% slippage = 1.25 * 1.02 = 1.275
		expect(result.maxPayAmount).toBeCloseTo(1.275, 5);
		expect(result.hasSufficientBalance).toBe(true);
		expect(result.shortfall).toBe(0);
	});

	it('converts quote correctly for 18-decimal tokens (e.g. WETH)', () => {
		const wethAsset: PaymentAsset = {
			code: 'WETH',
			name: 'Wrapped Ether',
			decimals: 18,
			rateAgainstXlm: 0.000045, // 1 XLM = 0.000045 WETH
			balance: 1.0,
		};

		const result = convertQuoteToPaymentAsset(baseQuoteStroops, wethAsset, 0.5);

		// 10 XLM * 0.000045 = 0.00045 WETH
		expect(result.numericAmount).toBeCloseTo(0.00045, 8);
		// Decimal-safe formatting respects 18 decimals (up to 8 display decimals)
		expect(result.formattedAmount).toBe('0.00045000');
		// Max pay at 0.5% slippage = 0.00045 * 1.005 = 0.00045225
		expect(result.maxPayAmount).toBeCloseTo(0.00045225, 8);
		expect(result.hasSufficientBalance).toBe(true);
	});

	it('computes shortfall and flags insufficient balance when balance is below quote', () => {
		const lowBalanceAsset: PaymentAsset = {
			code: 'USDC',
			name: 'USD Coin',
			decimals: 6,
			rateAgainstXlm: 0.125,
			balance: 0.5, // 0.5 USDC available, needed 1.25 USDC
		};

		const result = convertQuoteToPaymentAsset(baseQuoteStroops, lowBalanceAsset, 1.0);

		expect(result.hasSufficientBalance).toBe(false);
		expect(result.shortfall).toBeCloseTo(0.75, 5); // 1.25 - 0.5 = 0.75
		expect(result.formattedShortfall).toBe('0.750000');
	});
});
