import { describe, it, expect } from 'vitest';
import {
	validateAirdropRecipients,
	parseAirdropInput,
	type AirdropRecipient,
} from '../airdropValidation';

const validAddress = 'G'.concat('A'.repeat(55));

const makeRows = (n: number): AirdropRecipient[] =>
	Array.from({ length: n }, (_, i) => ({
		address: `G${String(i + 1).padStart(55, 'A')}`,
		quantity: 1,
	}));

describe('validateAirdropRecipients', () => {
	it('passes for a valid list of 3 recipients', () => {
		const rows: AirdropRecipient[] = [
			{ address: validAddress, quantity: 5 },
			{ address: 'G'.concat('B'.repeat(55)), quantity: 1 },
			{ address: 'G'.concat('C'.repeat(55)), quantity: 10 },
		];
		expect(validateAirdropRecipients(rows)).toEqual([]);
	});

	it('flags an invalid Stellar address', () => {
		const rows: AirdropRecipient[] = [
			{ address: 'not-a-valid-address', quantity: 1 },
		];
		const errors = validateAirdropRecipients(rows);
		expect(errors).toContainEqual({
			rowIndex: 0,
			message: 'Invalid Stellar address',
		});
	});

	it('flags quantity 0', () => {
		const rows: AirdropRecipient[] = [
			{ address: validAddress, quantity: 0 },
		];
		const errors = validateAirdropRecipients(rows);
		expect(errors).toContainEqual({
			rowIndex: 0,
			message: 'Quantity must be at least 1',
		});
	});

	it('flags more than 50 recipients', () => {
		const rows = makeRows(51);
		const errors = validateAirdropRecipients(rows);
		expect(errors).toContainEqual({
			rowIndex: -1,
			message: 'Maximum 50 recipients per airdrop',
		});
	});

	it('flags duplicate addresses on second occurrence', () => {
		const rows: AirdropRecipient[] = [
			{ address: validAddress, quantity: 1 },
			{ address: validAddress, quantity: 2 },
		];
		const errors = validateAirdropRecipients(rows);
		expect(errors).toContainEqual({
			rowIndex: 1,
			message: 'Duplicate address',
		});
	});
});

describe('parseAirdropInput', () => {
	it('parses wallet:quantity lines', () => {
		const input = `${validAddress}:5\n${'G'.concat('B'.repeat(55))}:10`;
		const result = parseAirdropInput(input);
		expect(result).toHaveLength(2);
		expect(result[0].quantity).toBe(5);
		expect(result[1].quantity).toBe(10);
	});

	it('skips blank lines', () => {
		const input = `${validAddress}:3\n\n`;
		expect(parseAirdropInput(input)).toHaveLength(1);
	});
});
