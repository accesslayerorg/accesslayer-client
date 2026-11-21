import { describe, expect, it } from 'vitest';
import { MAX_GIFT_MESSAGE_LENGTH, validateGiftKey } from '../giftKey.utils';

const validAddress = (char: string) => `G${char.repeat(55)}`;

describe('validateGiftKey', () => {
	it('accepts a valid gift and normalises the recipient address', () => {
		const result = validateGiftKey({
			quantity: '3',
			recipient: `  ${validAddress('A').toLowerCase()}  `,
			message: 'Enjoy!',
			availableBalance: 5,
		});

		expect(result.isValid).toBe(true);
		expect(result.quantity).toBe(3);
		expect(result.recipient).toBe(validAddress('A'));
		expect(result.errors).toEqual({});
	});

	it.each([
		['', 'Quantity is required'],
		['0', 'Quantity must be at least 1'],
		['-2', 'Quantity must be at least 1'],
		['1.5', 'Quantity must be a whole number'],
		['11', 'Quantity exceeds your balance of 10 keys'],
	])('rejects an invalid quantity (%s)', (quantity, message) => {
		const result = validateGiftKey({
			quantity,
			recipient: validAddress('A'),
			availableBalance: 10,
		});

		expect(result.isValid).toBe(false);
		expect(result.errors.quantity).toBe(message);
	});

	it('uses the singular form when the balance is one key', () => {
		const result = validateGiftKey({
			quantity: '2',
			recipient: validAddress('A'),
			availableBalance: 1,
		});

		expect(result.errors.quantity).toBe(
			'Quantity exceeds your balance of 1 key'
		);
	});

	it('requires a recipient address', () => {
		const result = validateGiftKey({
			quantity: '1',
			recipient: '   ',
			availableBalance: 5,
		});

		expect(result.errors.recipient).toBe('Recipient address is required');
	});

	it('rejects a recipient that is not a Stellar address', () => {
		const result = validateGiftKey({
			quantity: '1',
			recipient: 'not-an-address',
			availableBalance: 5,
		});

		expect(result.errors.recipient).toBe(
			'Invalid Stellar address (must start with G and be 56 characters)'
		);
	});

	it('rejects a message longer than the limit', () => {
		const result = validateGiftKey({
			quantity: '1',
			recipient: validAddress('A'),
			message: 'x'.repeat(MAX_GIFT_MESSAGE_LENGTH + 1),
			availableBalance: 5,
		});

		expect(result.isValid).toBe(false);
		expect(result.errors.message).toBe(
			`Message cannot exceed ${MAX_GIFT_MESSAGE_LENGTH} characters`
		);
	});

	it('allows a message exactly at the limit', () => {
		const result = validateGiftKey({
			quantity: '1',
			recipient: validAddress('A'),
			message: 'x'.repeat(MAX_GIFT_MESSAGE_LENGTH),
			availableBalance: 5,
		});

		expect(result.isValid).toBe(true);
		expect(result.errors.message).toBeUndefined();
	});
});
