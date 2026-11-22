import { describe, expect, it } from 'vitest';
import {
	MAX_BATCH_TRANSFER_RECIPIENTS,
	calculateTotalBatchTransferKeys,
	isValidStellarWalletAddress,
	validateBatchTransferRows,
	type BatchTransferRecipientRow,
} from '../batchTransfer.utils';

const validAddress = (char: string) => `G${char.repeat(55)}`;

describe('batchTransfer.utils', () => {
	describe('isValidStellarWalletAddress', () => {
		it('returns true for a valid 56-character G-address', () => {
			expect(isValidStellarWalletAddress(validAddress('A'))).toBe(true);
			expect(isValidStellarWalletAddress(validAddress('2'))).toBe(true);
		});

		it('returns false for empty or non-string values', () => {
			expect(isValidStellarWalletAddress('')).toBe(false);
			expect(isValidStellarWalletAddress('   ')).toBe(false);
		});

		it('returns false for addresses not starting with G', () => {
			expect(isValidStellarWalletAddress(`C${'A'.repeat(55)}`)).toBe(false);
			expect(isValidStellarWalletAddress(`S${'A'.repeat(55)}`)).toBe(false);
		});

		it('returns false for addresses of incorrect length', () => {
			expect(isValidStellarWalletAddress('GA234')).toBe(false);
			expect(isValidStellarWalletAddress(`G${'A'.repeat(56)}`)).toBe(false);
		});

		it('returns false for invalid base32 characters', () => {
			// '8', '9', '0', '1' are invalid in RFC 4648 Base32
			expect(isValidStellarWalletAddress(`G8${'A'.repeat(54)}`)).toBe(false);
			expect(isValidStellarWalletAddress(`G9${'A'.repeat(54)}`)).toBe(false);
			expect(isValidStellarWalletAddress(`G0${'A'.repeat(54)}`)).toBe(false);
		});
	});

	describe('calculateTotalBatchTransferKeys', () => {
		it('sums quantities correctly across rows', () => {
			const rows = [{ quantity: 3 }, { quantity: 5 }, { quantity: '2' }];
			expect(calculateTotalBatchTransferKeys(rows)).toBe(10);
		});

		it('handles empty or non-numeric values safely', () => {
			const rows = [{ quantity: '' }, { quantity: -2 }, { quantity: 4 }];
			expect(calculateTotalBatchTransferKeys(rows)).toBe(4);
		});
	});

	describe('validateBatchTransferRows', () => {
		it('validates a valid set of recipient rows within liquid balance', () => {
			const rows: BatchTransferRecipientRow[] = [
				{ id: '1', address: validAddress('A'), quantity: 2 },
				{ id: '2', address: validAddress('B'), quantity: 3 },
			];
			const result = validateBatchTransferRows(rows, 10);
			expect(result.isValid).toBe(true);
			expect(result.totalKeys).toBe(5);
			expect(result.balanceError).toBeUndefined();
			expect(result.rowErrors['1'].isValid).toBe(true);
			expect(result.rowErrors['2'].isValid).toBe(true);
		});

		it('flags invalid addresses with row-level error', () => {
			const rows: BatchTransferRecipientRow[] = [
				{ id: '1', address: 'not-an-address', quantity: 2 },
			];
			const result = validateBatchTransferRows(rows, 10);
			expect(result.isValid).toBe(false);
			expect(result.rowErrors['1'].addressError).toContain(
				'Invalid Stellar address'
			);
		});

		it('flags missing address with row-level error', () => {
			const rows: BatchTransferRecipientRow[] = [
				{ id: '1', address: '', quantity: 2 },
			];
			const result = validateBatchTransferRows(rows, 10);
			expect(result.isValid).toBe(false);
			expect(result.rowErrors['1'].addressError).toBe(
				'Wallet address is required'
			);
		});

		it('flags duplicate addresses with row-level error', () => {
			const rows: BatchTransferRecipientRow[] = [
				{ id: '1', address: validAddress('A'), quantity: 1 },
				{ id: '2', address: validAddress('A'), quantity: 2 },
			];
			const result = validateBatchTransferRows(rows, 10);
			expect(result.isValid).toBe(false);
			expect(result.rowErrors['2'].addressError).toBe(
				'Duplicate recipient address'
			);
		});

		it('flags quantity <= 0 with row-level error', () => {
			const rows: BatchTransferRecipientRow[] = [
				{ id: '1', address: validAddress('A'), quantity: 0 },
			];
			const result = validateBatchTransferRows(rows, 10);
			expect(result.isValid).toBe(false);
			expect(result.rowErrors['1'].quantityError).toBe(
				'Quantity must be at least 1'
			);
		});

		it('flags non-integer quantity with row-level error', () => {
			const rows: BatchTransferRecipientRow[] = [
				{ id: '1', address: validAddress('A'), quantity: 1.5 },
			];
			const result = validateBatchTransferRows(rows, 10);
			expect(result.isValid).toBe(false);
			expect(result.rowErrors['1'].quantityError).toBe(
				'Quantity must be a whole number'
			);
		});

		it('flags balance exceeded error when total quantity exceeds liquid balance', () => {
			const rows: BatchTransferRecipientRow[] = [
				{ id: '1', address: validAddress('A'), quantity: 4 },
				{ id: '2', address: validAddress('B'), quantity: 5 },
			];
			const result = validateBatchTransferRows(rows, 8);
			expect(result.isValid).toBe(false);
			expect(result.totalKeys).toBe(9);
			expect(result.balanceError).toContain(
				'Total quantity (9) exceeds your liquid balance of 8 keys.'
			);
		});

		it('flags error when rows exceed MAX_BATCH_TRANSFER_RECIPIENTS', () => {
			const rows: BatchTransferRecipientRow[] = Array.from(
				{ length: MAX_BATCH_TRANSFER_RECIPIENTS + 1 },
				(_, i) => ({
					id: String(i),
					address: validAddress(String.fromCharCode(65 + i)),
					quantity: 1,
				})
			);
			const result = validateBatchTransferRows(rows, 100);
			expect(result.isValid).toBe(false);
			expect(result.generalError).toContain('Maximum 10 recipients allowed');
		});
	});
});
