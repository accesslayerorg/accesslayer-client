import { rpc, type xdr } from '@stellar/stellar-sdk';
import { env } from '@/utils/env.utils';

/**
 * Spendable native XLM balance for a Stellar account (#1030).
 *
 * Read straight from the account ledger entry over Soroban RPC (the same
 * `VITE_STELLAR_RPC_URL` the contract services use), so the add-liquidity
 * modal validates against the chain rather than a cached API figure.
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

/** Extracts the reserve-relevant fields from an `AccountEntry` XDR. */
export function readNativeAccountBalanceFields(
	entry: xdr.AccountEntry
): NativeAccountBalanceFields {
	let sellingLiabilitiesStroops = 0n;
	let numSponsoring = 0;
	let numSponsored = 0;

	if (entry.ext.type === 'v1') {
		const v1 = entry.ext.v1;
		sellingLiabilitiesStroops = v1.liabilities.selling;
		if (v1.ext.type === 'v2') {
			numSponsoring = v1.ext.v2.numSponsoring;
			numSponsored = v1.ext.v2.numSponsored;
		}
	}

	return {
		balanceStroops: entry.balance,
		numSubEntries: entry.numSubEntries,
		numSponsoring,
		numSponsored,
		sellingLiabilitiesStroops,
	};
}

export type AccountEntryReader = (address: string) => Promise<xdr.AccountEntry>;

const defaultReader: AccountEntryReader = async address => {
	if (!env.VITE_STELLAR_RPC_URL) {
		throw new Error('VITE_STELLAR_RPC_URL is required to read balances.');
	}
	return new rpc.Server(env.VITE_STELLAR_RPC_URL).getAccountEntry(address);
};

export class StellarAccountService {
	private readonly readAccountEntry: AccountEntryReader;

	constructor(readAccountEntry: AccountEntryReader = defaultReader) {
		this.readAccountEntry = readAccountEntry;
	}

	/**
	 * Spendable XLM in stroops. An account that doesn't exist on-chain yet
	 * (unfunded) has nothing to spend, so it resolves to `0n` rather than an
	 * error.
	 */
	async getSpendableXlmStroops(address: string): Promise<bigint> {
		let entry: xdr.AccountEntry;
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
