import { Address } from '@stellar/stellar-sdk';
import type { TreasuryDistributionRecipient } from '@/services/admin.service';

const STROOPS_PER_XLM = 10_000_000n;

export function parseXlmToStroops(value: string): bigint | null {
	const normalized = value.trim();
	if (!/^(?:0|[1-9]\d*)(?:\.\d{1,7})?$/.test(normalized)) return null;
	const [whole, fraction = ''] = normalized.split('.');
	return BigInt(whole) * STROOPS_PER_XLM + BigInt(fraction.padEnd(7, '0') || '0');
}

export function formatStroops(stroops: string | bigint): string {
	let amount: bigint;
	try {
		amount = typeof stroops === 'bigint' ? stroops : BigInt(stroops);
	} catch {
		return '—';
	}
	const negative = amount < 0n;
	const absolute = negative ? -amount : amount;
	const whole = absolute / STROOPS_PER_XLM;
	const fraction = (absolute % STROOPS_PER_XLM)
		.toString()
		.padStart(7, '0')
		.replace(/0+$/, '');
	return `${negative ? '-' : ''}${whole.toLocaleString()}${fraction ? `.${fraction}` : ''} XLM`;
}

export function validateTreasuryDistribution(
	balanceStroops: string,
	recipients: TreasuryDistributionRecipient[]
): string | null {
	if (!/^\d+$/.test(balanceStroops)) return 'Treasury balance is unavailable.';
	const balance = BigInt(balanceStroops);
	if (balance <= 0n) return 'There are no accumulated fees to distribute.';
	if (recipients.length === 0) return 'Add at least one recipient.';

	let total = 0n;
	const addresses = new Set<string>();
	for (const [index, recipient] of recipients.entries()) {
		const address = recipient.address.trim();
		try {
			Address.fromString(address);
		} catch {
			return `Recipient ${index + 1} must be a valid Stellar address.`;
		}
		const normalizedAddress = address.toLowerCase();
		if (addresses.has(normalizedAddress)) {
			return 'Recipient addresses must be unique.';
		}
		addresses.add(normalizedAddress);

		if (!/^\d+$/.test(recipient.amountStroops)) {
			return `Recipient ${index + 1} must have a valid amount.`;
		}
		const amount = BigInt(recipient.amountStroops);
		if (amount <= 0n) return `Recipient ${index + 1} amount must be greater than zero.`;
		total += amount;
	}

	if (total !== balance) return 'Recipient amounts must equal the accumulated treasury balance.';
	return null;
}
