import { describe, it, expect } from 'vitest';
import {
	validateTradeQuantity,
	formatValidationError,
	type TradeValidationError,
} from '../tradeQuantityValidation';

describe('Trade Quantity Validation', () => {
	describe('validateTradeQuantity - Buy Side', () => {
		const side = 'buy' as const;
		const holdings = 10;

		it('accepts valid positive integer', () => {
			const result = validateTradeQuantity('2', side, holdings);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
			expect(result.message).toBeUndefined();
		});

		it('accepts single digit', () => {
			const result = validateTradeQuantity('1', side, holdings);
			expect(result.valid).toBe(true);
		});

		it('accepts large quantity', () => {
			const result = validateTradeQuantity('1000', side, holdings);
			expect(result.valid).toBe(true);
		});

		it('accepts decimal that parses to valid number', () => {
			const result = validateTradeQuantity('2.5', side, holdings);
			expect(result.valid).toBe(true);
		});

		it('rejects empty string', () => {
			const result = validateTradeQuantity('', side, holdings);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('empty');
			expect(result.message).toBe('Please enter an amount.');
		});

		it('rejects whitespace-only string', () => {
			const result = validateTradeQuantity('   ', side, holdings);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('empty');
		});

		it('rejects zero', () => {
			const result = validateTradeQuantity('0', side, holdings);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('zero-or-negative');
			expect(result.message).toBe('Amount must be greater than zero.');
		});

		it('rejects negative value', () => {
			const result = validateTradeQuantity('-5', side, holdings);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('zero-or-negative');
			expect(result.message).toBe('Amount must be greater than zero.');
		});

		it('rejects negative decimal', () => {
			const result = validateTradeQuantity('-2.5', side, holdings);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('zero-or-negative');
		});

		it('rejects non-numeric string', () => {
			const result = validateTradeQuantity('abc', side, holdings);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('invalid-number');
			expect(result.message).toBe('Amount must be a valid number.');
		});

		it('rejects string with mixed letters and numbers', () => {
			const result = validateTradeQuantity('5abc', side, holdings);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('invalid-number');
		});

		it('rejects special characters', () => {
			const result = validateTradeQuantity('5@#$', side, holdings);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('invalid-number');
		});

		it('buy side: does not check balance (no insufficient-balance error)', () => {
			// Even though holdings is 10, buy side should not reject high quantities
			const result = validateTradeQuantity('1000', side, 10);
			expect(result.valid).toBe(true);
			expect(result.error).not.toBe('insufficient-balance');
		});
	});

	describe('validateTradeQuantity - Sell Side', () => {
		const side = 'sell' as const;

		it('accepts quantity equal to holdings', () => {
			const result = validateTradeQuantity('10', side, 10);
			expect(result.valid).toBe(true);
		});

		it('accepts quantity less than holdings', () => {
			const result = validateTradeQuantity('5', side, 10);
			expect(result.valid).toBe(true);
		});

		it('rejects zero', () => {
			const result = validateTradeQuantity('0', side, 10);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('zero-or-negative');
		});

		it('rejects negative value', () => {
			const result = validateTradeQuantity('-3', side, 10);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('zero-or-negative');
		});

		it('rejects quantity exceeding holdings', () => {
			const result = validateTradeQuantity('15', side, 10);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('insufficient-balance');
			expect(result.message).toContain('10 keys');
		});

		it('rejects quantity significantly exceeding holdings', () => {
			const result = validateTradeQuantity('1000', side, 10);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('insufficient-balance');
		});

		it('rejects non-numeric string', () => {
			const result = validateTradeQuantity('not-a-number', side, 10);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('invalid-number');
		});

		it('insufficient-balance message includes formatted holding count', () => {
			const result = validateTradeQuantity('5', side, 2);
			expect(result.message).toContain('2 keys');
		});

		it('handles zero holdings - rejects any positive quantity', () => {
			const result = validateTradeQuantity('1', side, 0);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('insufficient-balance');
		});

		it('handles fractional holdings comparison', () => {
			const result = validateTradeQuantity('5.1', side, 5);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('insufficient-balance');
		});
	});

	describe('Edge Cases and Whitespace Handling', () => {
		it('strips leading/trailing whitespace', () => {
			const result = validateTradeQuantity('   5   ', 'buy', 10);
			expect(result.valid).toBe(true);
		});

		it('handles tab and newline characters', () => {
			const result = validateTradeQuantity('\t5\n', 'buy', 10);
			expect(result.valid).toBe(true);
		});

		it('rejects infinity string', () => {
			const result = validateTradeQuantity('Infinity', 'buy', 10);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('invalid-number');
		});

		it('rejects NaN string', () => {
			const result = validateTradeQuantity('NaN', 'buy', 10);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('invalid-number');
		});

		it('accepts scientific notation that parses to finite number', () => {
			const result = validateTradeQuantity('1e2', 'buy', 10);
			expect(result.valid).toBe(true);
		});

		it('handles very small positive decimal', () => {
			const result = validateTradeQuantity('0.01', 'buy', 10);
			expect(result.valid).toBe(true);
		});

		it('handles very large number', () => {
			const result = validateTradeQuantity('999999999', 'buy', 10);
			expect(result.valid).toBe(true);
		});
	});

	describe('formatValidationError', () => {
		it('formats empty error', () => {
			const message = formatValidationError('empty');
			expect(message).toBe('Please enter an amount.');
		});

		it('formats invalid-number error', () => {
			const message = formatValidationError('invalid-number');
			expect(message).toBe('Amount must be a valid number.');
		});

		it('formats zero-or-negative error', () => {
			const message = formatValidationError('zero-or-negative');
			expect(message).toBe('Amount must be greater than zero.');
		});

		it('formats insufficient-balance error without holdings', () => {
			const message = formatValidationError('insufficient-balance');
			expect(message).toContain('0 keys');
		});

		it('formats insufficient-balance error with holdings', () => {
			const message = formatValidationError('insufficient-balance', 42);
			expect(message).toContain('42 keys');
		});

		it('handles unknown error gracefully', () => {
			const message = formatValidationError(
				'unknown-error' as TradeValidationError
			);
			expect(message).toBe('Invalid amount.');
		});
	});

	describe('Integration: Common User Input Patterns', () => {
		it('handles user typing price instead of quantity', () => {
			const result = validateTradeQuantity('0.05', 'buy', 10);
			expect(result.valid).toBe(true); // Parses as valid number
		});

		it('rejects user pasting currency symbol', () => {
			const result = validateTradeQuantity('$5', 'buy', 10);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('invalid-number');
		});

		it('handles user adding comma as thousands separator', () => {
			const result = validateTradeQuantity('1,000', 'buy', 10);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('invalid-number');
		});

		it('handles user pressing delete key to clear field', () => {
			const result = validateTradeQuantity('', 'sell', 10);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('empty');
		});

		it('user tries to sell 0.5 keys with 1 holding', () => {
			const result = validateTradeQuantity('0.5', 'sell', 1);
			expect(result.valid).toBe(true);
		});

		it('user mistakenly enters negative to indicate sell (buy side)', () => {
			const result = validateTradeQuantity('-5', 'buy', 10);
			expect(result.valid).toBe(false);
			expect(result.error).toBe('zero-or-negative');
		});
	});

	describe('Result Structure', () => {
		it('valid result has no error or message', () => {
			const result = validateTradeQuantity('5', 'buy', 10);
			expect(result.valid).toBe(true);
			expect(result.error).toBeUndefined();
			expect(result.message).toBeUndefined();
		});

		it('invalid result includes error code and message', () => {
			const result = validateTradeQuantity('abc', 'buy', 10);
			expect(result.valid).toBe(false);
			expect(result.error).toBeDefined();
			expect(result.message).toBeDefined();
		});
	});
});
