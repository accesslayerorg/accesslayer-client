export interface AirdropRecipient {
	address: string;
	quantity: number;
}

export interface AirdropRowError {
	rowIndex: number;
	message: string;
}

const MAX_RECIPIENTS = 50;
const STELLAR_ADDRESS_RE = /^[G][A-Z2-7]{55}$/;

function isValidStellarAddress(address: string): boolean {
	return STELLAR_ADDRESS_RE.test(address);
}

export function validateAirdropRecipients(
	rows: AirdropRecipient[]
): AirdropRowError[] {
	const errors: AirdropRowError[] = [];
	const seen = new Set<string>();

	if (rows.length > MAX_RECIPIENTS) {
		errors.push({
			rowIndex: -1,
			message: 'Maximum 50 recipients per airdrop',
		});
	}

	for (let i = 0; i < rows.length; i++) {
		const { address, quantity } = rows[i];

		if (!isValidStellarAddress(address)) {
			errors.push({ rowIndex: i, message: 'Invalid Stellar address' });
		}

		if (quantity < 1) {
			errors.push({ rowIndex: i, message: 'Quantity must be at least 1' });
		}

		if (seen.has(address)) {
			errors.push({ rowIndex: i, message: 'Duplicate address' });
		}
		seen.add(address);
	}

	return errors;
}

export function parseAirdropInput(raw: string): AirdropRecipient[] {
	return raw
		.split('\n')
		.map(line => line.trim())
		.filter(Boolean)
		.map(line => {
			const [address, qtyStr] = line.split(':').map(s => s.trim());
			return {
				address: address ?? '',
				quantity: Number(qtyStr) || 0,
			};
		});
}
