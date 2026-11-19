/**
 * Spendable native XLM balance for a Stellar account (#1030).
 *
 * "Spendable" follows Stellar's reserve rules: the account must keep
 * `(2 + subentries + sponsoring - sponsored) * baseReserve` and cannot spend
 * XLM already committed to open sell offers (selling liabilities).
 */

/** Current network base reserve: 0.5 XLM, identical on mainnet and testnet. */
export const BASE_RESERVE_STROOPS = 5_000_000n;

export interface NativeAccountBalanceFields {
	balanceStroops: bigint;
	numSubEntries: number;
	numSponsoring: number;
	numSponsored: number;
	sellingLiabilitiesStroops: bigint;
}

interface AccountEntryLike {
	balance: bigint;
	numSubEntries: number;
	ext?: {
		type?: string;
		v1?: {
			liabilities?: { selling?: bigint };
			ext?: {
				type?: string;
				v2?: { numSponsoring?: number; numSponsored?: number };
			};
		};
	};
}

function toBigInt(value: unknown): bigint {
	if (typeof value === 'bigint') return value;
	if (typeof value === 'number' && Number.isSafeInteger(value)) {
		return BigInt(value);
	}
	if (typeof value === 'string' && /^-?\d+$/.test(value)) return BigInt(value);
	return 0n;
}

/** Pure reserve math; see the file header for the rule. Never negative. */
export function computeSpendableNativeStroops(
	fields: NativeAccountBalanceFields,
	baseReserveStroops: bigint = BASE_RESERVE_STROOPS
): bigint {
	const reserveEntries =
		2 + fields.numSubEntries + fields.numSponsoring - fields.numSponsored;
	const minimumBalance =
		BigInt(Math.max(0, reserveEntries)) * baseReserveStroops;
	const spendable =
		fields.balanceStroops - minimumBalance - fields.sellingLiabilitiesStroops;
	return spendable > 0n ? spendable : 0n;
}

/** Extracts the reserve-relevant fields from an account ledger entry. */
export function readNativeAccountBalanceFields(
	entry: AccountEntryLike
): NativeAccountBalanceFields {
	let sellingLiabilitiesStroops = 0n;
	let numSponsoring = 0;
	let numSponsored = 0;

	if (entry.ext?.type === 'v1' && entry.ext.v1) {
		const v1 = entry.ext.v1;
		sellingLiabilitiesStroops = toBigInt(v1.liabilities?.selling);
		if (v1.ext?.type === 'v2' && v1.ext.v2) {
			numSponsoring = v1.ext.v2.numSponsoring ?? 0;
			numSponsored = v1.ext.v2.numSponsored ?? 0;
		}
	}

	return {
		balanceStroops: toBigInt(entry.balance),
		numSubEntries: entry.numSubEntries,
		numSponsoring,
		numSponsored,
		sellingLiabilitiesStroops,
	};
}

export type AccountEntryReader = (address: string) => Promise<AccountEntryLike>;

const defaultReader: AccountEntryReader = async () => {
	throw new Error('Account entry reader is not configured.');
};

export class StellarAccountService {
	private readonly readAccountEntry: AccountEntryReader;

	constructor(readAccountEntry: AccountEntryReader = defaultReader) {
		this.readAccountEntry = readAccountEntry;
	}

	/**
	 * Spendable XLM in stroops. An unfunded account resolves to `0n`.
	 */
	async getSpendableXlmStroops(address: string): Promise<bigint> {
		let entry: AccountEntryLike;
		try {
			entry = await this.readAccountEntry(address);
		} catch (error) {
			if (
				error instanceof Error &&
				/account not found/i.test(error.message)
			) {
				return 0n;
			}
			throw error;
		}
		return computeSpendableNativeStroops(
			readNativeAccountBalanceFields(entry)
		);
	}
}

export const stellarAccountService = new StellarAccountService();
