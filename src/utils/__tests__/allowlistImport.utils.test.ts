import { describe, expect, it } from 'vitest';
import {
	ALLOWLIST_IMPORT_TEMPLATE,
	MAX_ALLOWLIST_IMPORT_BYTES,
	parseAllowlistCsvPreview,
} from '../allowlistImport.utils';

describe('parseAllowlistCsvPreview', () => {
	it('parses quoted CSV columns and only returns the first 20 data rows', () => {
		const csv = [
			'\uFEFFwalletAddress,Note',
			'"GABC","has, comma"',
			...Array.from({ length: 20 }, (_, index) => `G${index},row ${index}`),
		].join('\r\n');

		const preview = parseAllowlistCsvPreview(csv);

		expect(preview.columns).toEqual(['walletAddress', 'Note']);
		expect(preview.rows).toHaveLength(20);
		expect(preview.rows[0]).toEqual({
			rowNumber: 2,
			values: ['GABC', 'has, comma'],
		});
	});

	it('reports empty or malformed CSV input', () => {
		expect(parseAllowlistCsvPreview(' \r\n')).toMatchObject({
			error: 'The CSV file is empty.',
		});
		expect(
			parseAllowlistCsvPreview('walletAddress\n"unfinished')
		).toMatchObject({
			error: 'The CSV contains an unclosed quoted field.',
		});
	});

	it('sets the upload limit to exactly 2 MiB', () => {
		expect(MAX_ALLOWLIST_IMPORT_BYTES).toBe(2 * 1024 * 1024);
	});

	it('provides the supported wallet_address template header', () => {
		expect(ALLOWLIST_IMPORT_TEMPLATE).toBe('wallet_address\n');
	});
});
