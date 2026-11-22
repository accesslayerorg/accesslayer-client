import { describe, expect, it, vi } from 'vitest';
import { Keypair, xdr } from '@stellar/stellar-sdk';
import {
	BASE_RESERVE_STROOPS,
	StellarAccountService,
	computeSpendableNativeStroops,
	readNativeAccountBalanceFields,
} from '../stellarAccount.service';

const XLM = 10_000_000n;
const ADDRESS = Keypair.random().publicKey();

describe('computeSpendableNativeStroops', () => {
	it('subtracts the base account reserve (2 entries)', () => {
		expect(
			computeSpendableNativeStroops({
				balanceStroops: 100n * XLM,
				numSubEntries: 0,
				numSponsoring: 0,
				numSponsored: 0,
				sellingLiabilitiesStroops: 0n,
			})
		).toBe(100n * XLM - 2n * BASE_RESERVE_STROOPS);
	});

	it('accounts for subentries, sponsorship, and selling liabilities', () => {
		// (2 + 3 + 1 - 2) = 4 reserve entries = 2 XLM, plus 5 XLM in open offers
		expect(
			computeSpendableNativeStroops({
				balanceStroops: 100n * XLM,
				numSubEntries: 3,
				numSponsoring: 1,
				numSponsored: 2,
				sellingLiabilitiesStroops: 5n * XLM,
			})
		).toBe(93n * XLM);
	});

	it('never goes negative', () => {
		expect(
			computeSpendableNativeStroops({
				balanceStroops: XLM / 2n,
				numSubEntries: 0,
				numSponsoring: 0,
				numSponsored: 0,
				sellingLiabilitiesStroops: 0n,
			})
		).toBe(0n);
	});
});

function accountEntry(ext: xdr.AccountEntryExt, balance = 50n * XLM) {
	return new xdr.AccountEntry({
		accountId: Keypair.fromPublicKey(ADDRESS).xdrPublicKey(),
		balance,
		seqNum: 1n,
		numSubEntries: 2,
		inflationDest: null,
		flags: 0,
		homeDomain: '',
		thresholds: new Uint8Array([1, 0, 0, 0]),
		signers: [],
		ext,
	});
}

describe('readNativeAccountBalanceFields (real XDR)', () => {
	it('reads a v0 account entry', () => {
		expect(
			readNativeAccountBalanceFields(accountEntry(xdr.AccountEntryExt.v0()))
		).toEqual({
			balanceStroops: 50n * XLM,
			numSubEntries: 2,
			numSponsoring: 0,
			numSponsored: 0,
			sellingLiabilitiesStroops: 0n,
		});
	});

	it('reads liabilities and sponsorship from v1/v2 extensions', () => {
		const v2 = new xdr.AccountEntryExtensionV2({
			numSponsored: 1,
			numSponsoring: 4,
			signerSponsoringIDs: [],
			ext: xdr.AccountEntryExtensionV2Ext.v0(),
		});
		const v1 = new xdr.AccountEntryExtensionV1({
			liabilities: new xdr.Liabilities({ buying: 0n, selling: 3n * XLM }),
			ext: xdr.AccountEntryExtensionV1Ext.v2(v2),
		});
		expect(
			readNativeAccountBalanceFields(
				accountEntry(xdr.AccountEntryExt.v1(v1))
			)
		).toEqual({
			balanceStroops: 50n * XLM,
			numSubEntries: 2,
			numSponsoring: 4,
			numSponsored: 1,
			sellingLiabilitiesStroops: 3n * XLM,
		});
	});
});

describe('StellarAccountService.getSpendableXlmStroops', () => {
	it('computes spendable XLM from the ledger entry', async () => {
		const reader = vi
			.fn()
			.mockResolvedValue(accountEntry(xdr.AccountEntryExt.v0()));
		const service = new StellarAccountService(reader);
		// 50 XLM - (2 + 2 subentries) * 0.5 XLM = 48 XLM
		await expect(service.getSpendableXlmStroops(ADDRESS)).resolves.toBe(
			48n * XLM
		);
		expect(reader).toHaveBeenCalledWith(ADDRESS);
	});

	it('treats an unfunded account as a zero balance', async () => {
		const service = new StellarAccountService(
			vi.fn().mockRejectedValue(new Error(`Account not found: ${ADDRESS}`))
		);
		await expect(service.getSpendableXlmStroops(ADDRESS)).resolves.toBe(0n);
	});

	it('propagates other RPC failures', async () => {
		const service = new StellarAccountService(
			vi.fn().mockRejectedValue(new Error('network down'))
		);
		await expect(service.getSpendableXlmStroops(ADDRESS)).rejects.toThrow(
			'network down'
		);
	});
});
