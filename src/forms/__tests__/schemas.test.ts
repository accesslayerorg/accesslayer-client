import { Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import { swapSchema, transferSchema } from '../schemas';
import { applyServerErrors, zodResolver } from '../useZodForm';

const address = Keypair.random().publicKey();
const messages = (r: { success: boolean; error?: { issues: { message: string }[] } }) =>
	r.error?.issues.map(i => i.message) ?? [];

describe('swapSchema', () => {
	it('accepts a valid swap and coerces numeric strings', () => {
		const r = swapSchema(10).safeParse({ side: 'buy', amount: '3', slippage: '0.5' });
		expect(r.success && r.data).toEqual({ side: 'buy', amount: 3, slippage: 0.5 });
	});

	it('rejects zero, fractional and over-balance amounts and bad slippage', () => {
		expect(messages(swapSchema(10).safeParse({ side: 'buy', amount: 0, slippage: 1 }))).toContain('Amount must be greater than zero');
		expect(messages(swapSchema(10).safeParse({ side: 'buy', amount: 1.5, slippage: 1 }))).toContain('Amount must be a whole number of keys');
		expect(messages(swapSchema(10).safeParse({ side: 'sell', amount: 11, slippage: 1 }))).toContain('Amount exceeds your available balance of 10');
		expect(messages(swapSchema().safeParse({ side: 'buy', amount: 1, slippage: 51 }))).toContain('Slippage cannot exceed 50%');
	});
});

describe('transferSchema', () => {
	it('accepts a valid transfer', () => {
		expect(transferSchema(5).safeParse({ recipient: address, amount: 2 }).success).toBe(true);
	});

	it('rejects an invalid address and a missing label when saving', () => {
		expect(messages(transferSchema().safeParse({ recipient: 'GABC', amount: 1 }))).toContain('Please enter a valid recipient address');
		expect(
			messages(transferSchema().safeParse({ recipient: address, amount: 1, saveRecipient: true }))
		).toContain('Please enter a label for the recipient');
	});
});

describe('zodResolver and applyServerErrors', () => {
	it('maps the first issue per field to a react-hook-form error', async () => {
		const result = await zodResolver(transferSchema())({ recipient: '', amount: 0 } as never, undefined, {} as never);
		expect(result.errors).toMatchObject({
			recipient: { message: 'Recipient address is required' },
			amount: { message: 'Amount must be greater than zero' },
		});
	});

	it('puts server errors on matching fields and the rest on root.server', () => {
		const setError = vi.fn();
		const form = { setError, getValues: () => ({ recipient: '', amount: 1 }) };
		const applied = applyServerErrors(form as never, {
			fieldErrors: { recipient: ['Account does not exist'], unknown: 'Boom' },
		});
		expect(applied).toBe(true);
		expect(setError).toHaveBeenCalledWith('recipient', { type: 'server', message: 'Account does not exist' });
		expect(setError).toHaveBeenCalledWith('root.server', { type: 'server', message: 'Boom' });
		expect(applyServerErrors(form as never, null)).toBe(false);
	});
});
