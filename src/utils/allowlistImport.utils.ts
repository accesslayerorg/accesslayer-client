export const MAX_ALLOWLIST_IMPORT_BYTES = 2 * 1024 * 1024;
export const ALLOWLIST_IMPORT_TEMPLATE = 'wallet_address\n';

export interface CsvPreviewRow {
	rowNumber: number;
	values: string[];
}

export interface CsvPreview {
	columns: string[];
	rows: CsvPreviewRow[];
	error?: string;
}

export function parseAllowlistCsvPreview(csv: string): CsvPreview {
	const input = csv.replace(/^\uFEFF/, '');
	const records: string[][] = [];
	let row: string[] = [];
	let field = '';
	let inQuotes = false;

	for (let index = 0; index < input.length; index += 1) {
		const character = input[index];

		if (inQuotes) {
			if (character === '"') {
				if (input[index + 1] === '"') {
					field += '"';
					index += 1;
				} else {
					inQuotes = false;
				}
			} else {
				field += character;
			}
			continue;
		}

		if (character === '"' && field.length === 0) {
			inQuotes = true;
		} else if (character === ',') {
			row.push(field);
			field = '';
		} else if (character === '\n' || character === '\r') {
			row.push(field);
			records.push(row);
			row = [];
			field = '';
			if (character === '\r' && input[index + 1] === '\n') index += 1;
		} else {
			field += character;
		}
	}

	if (inQuotes) {
		return {
			columns: [],
			rows: [],
			error: 'The CSV contains an unclosed quoted field.',
		};
	}

	if (field.length > 0 || row.length > 0) {
		row.push(field);
		records.push(row);
	}

	const headerIndex = records.findIndex(record =>
		record.some(value => value.trim() !== '')
	);
	if (headerIndex < 0) {
		return { columns: [], rows: [], error: 'The CSV file is empty.' };
	}

	const header = records[headerIndex];
	const columns = header.map(
		(column, index) => column.trim() || `Column ${index + 1}`
	);
	const rows = records
		.slice(headerIndex + 1)
		.map((values, index) => ({
			rowNumber: headerIndex + index + 2,
			values,
		}))
		.filter(record => record.values.some(value => value.trim() !== ''))
		.slice(0, 20);

	return { columns, rows };
}
