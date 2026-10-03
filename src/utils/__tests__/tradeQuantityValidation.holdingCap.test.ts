import { describe, expect, it } from 'vitest';
import {
	validateTradeQuantity,
	formatValidationError,
} from '../tradeQuantityValidation';

describe('validateTradeQuantity holding cap validation (#1015)', () => {
	it('accepts buy quantity when within holding cap', () => {
		const result = validateTradeQuantity('5', 'buy', 10, 20);
		expect(result.valid).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it('accepts buy quantity that brings total exactly to holding cap', () => {
		const result = validateTradeQuantity('10', 'buy', 10, 20);
		expect(result.valid).toBe(true);
		expect(result.error).toBeUndefined();
	});

	it('rejects buy quantity when purchase would exceed holding cap', () => {
		const result = validateTradeQuantity('11', 'buy', 10, 20);
		expect(result.valid).toBe(false);
		expect(result.error).toBe('exceeds-holding-cap');
		expect(result.message).toContain('Purchase would exceed the holding cap of 20 keys');
	});

	it('rejects any positive buy quantity when holdings have reached holding cap', () => {
		const result = validateTradeQuantity('1', 'buy', 20, 20);
		expect(result.valid).toBe(false);
		expect(result.error).toBe('exceeds-holding-cap');
		expect(result.message).toContain('Holding cap reached for this key (20 keys max)');
	});

	it('does not enforce holding cap on sell side', () => {
		const result = validateTradeQuantity('5', 'sell', 25, 20);
		expect(result.valid).toBe(true);
	});

	it('ignores holding cap when null or undefined (unlimited)', () => {
		const r1 = validateTradeQuantity('100', 'buy', 10, null);
		expect(r1.valid).toBe(true);

		const r2 = validateTradeQuantity('100', 'buy', 10, undefined);
		expect(r2.valid).toBe(true);
	});

	it('formats exceeds-holding-cap error message correctly', () => {
		const msgWithCap = formatValidationError('exceeds-holding-cap', 5, 20);
		expect(msgWithCap).toBe('Purchase would exceed holding cap of 20 keys.');

		const msgWithoutCap = formatValidationError('exceeds-holding-cap');
		expect(msgWithoutCap).toBe('Purchase would exceed the holding cap for this key.');
	});
});
