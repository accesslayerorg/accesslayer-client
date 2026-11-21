import { Address, Keypair } from '@stellar/stellar-sdk';
import { describe, expect, it, vi } from 'vitest';
import type { Signer } from '@/lib/signing/types';
import {
	KeyRentalContractError,
	KeyRentalContractService,
	type KeyRentalContractClient,
} from '../keyRentalContract.service';

const wallet = Keypair.random().publicKey();
const keyId = Keypair.random().publicKey();

function createSigner(): Signer {
	return {
		type: 'software',
		getPublicKey: vi.fn().mockResolvedValue(wallet),
		sign: vi.fn().mockResolvedValue('signed-xdr'),
	};
}

function sent(hash = 'tx-hash') {
	return {
		signAndSend: vi
			.fn()
			.mockResolvedValue({ sendTransactionResponse: { hash } }),
	};
}

function createClient(): KeyRentalContractClient {
	return {
		list_rental: vi.fn().mockResolvedValue(sent()),
		rent: vi.fn().mockResolvedValue(sent()),
		end_rental: vi.fn().mockResolvedValue(sent()),
		claim_collateral: vi.fn().mockResolvedValue(sent()),
		is_active_renter: vi.fn().mockResolvedValue({ result: true }),
	} as unknown as KeyRentalContractClient;
}

function setup() {
	const client = createClient();
	const factory = vi.fn().mockResolvedValue(client);
	return { client, factory, service: new KeyRentalContractService(factory) };
}

describe('KeyRentalContractService', () => {
	it('lists keys with list_rental, sending amounts in stroops', async () => {
		const { client, factory, service } = setup();
		const signer = createSigner();

		await expect(
			service.listRental(
				{
					keyId,
					quantity: 2,
					feePerDayStroops: 5_000_000n,
					maxDays: 30,
					collateralStroops: 100_000_000n,
				},
				wallet,
				signer
			)
		).resolves.toEqual({ hash: 'tx-hash' });

		expect(factory).toHaveBeenCalledWith(wallet, signer);
		const args = vi.mocked(client.list_rental).mock.calls[0][0];
		expect(args.owner).toBeInstanceOf(Address);
		expect(args.owner.toString()).toBe(wallet);
		expect(args.key_id.toString()).toBe(keyId);
		expect(args).toMatchObject({
			quantity: 2n,
			fee_per_day: 5_000_000n,
			max_days: 30,
			collateral: 100_000_000n,
		});
	});

	it('rents a listing for the chosen days with rent', async () => {
		const { client, service } = setup();

		await service.rent({ listingId: '42', days: 7 }, wallet, createSigner());

		const args = vi.mocked(client.rent).mock.calls[0][0];
		expect(args.renter.toString()).toBe(wallet);
		expect(args).toMatchObject({ listing_id: 42n, days: 7 });
	});

	it('ends a rental with end_rental and claims collateral with claim_collateral', async () => {
		const { client, service } = setup();

		await service.endRental('42', wallet, createSigner());
		await service.claimCollateral('42', wallet, createSigner());

		expect(client.end_rental).toHaveBeenCalledWith({ listing_id: 42n });
		const claimArgs = vi.mocked(client.claim_collateral).mock.calls[0][0];
		expect(claimArgs.owner.toString()).toBe(wallet);
		expect(claimArgs.listing_id).toBe(42n);
	});

	it('returns a null hash when the response has none', async () => {
		const { client, service } = setup();
		vi.mocked(client.end_rental).mockResolvedValue({
			signAndSend: vi
				.fn()
				.mockResolvedValue({ sendTransactionResponse: {} }),
		} as never);

		await expect(
			service.endRental('1', wallet, createSigner())
		).resolves.toEqual({ hash: null });
	});

	it('refuses to sign without a signer and never builds a client', async () => {
		const { factory, service } = setup();

		await expect(
			service.rent({ listingId: '1', days: 1 }, wallet, null)
		).rejects.toThrow(KeyRentalContractError);
		await expect(service.endRental('1', wallet, null)).rejects.toThrow(
			'A connected wallet signer is required for rental transactions.'
		);
		expect(factory).not.toHaveBeenCalled();
	});

	it('rejects invalid input before touching the client', async () => {
		const { factory, service } = setup();
		const signer = createSigner();

		await expect(
			service.rent({ listingId: '1', days: 0 }, wallet, signer)
		).rejects.toThrow('Rent for at least one day.');
		await expect(
			service.rent({ listingId: 'abc', days: 1 }, wallet, signer)
		).rejects.toThrow('Invalid rental listing id.');
		await expect(
			service.listRental(
				{
					keyId,
					quantity: 1,
					feePerDayStroops: 0n,
					maxDays: 1,
					collateralStroops: 0n,
				},
				wallet,
				signer
			)
		).rejects.toThrow('The fee per day must be greater than 0.');
		await expect(
			service.listRental(
				{
					keyId: 'not-an-address',
					quantity: 1,
					feePerDayStroops: 1n,
					maxDays: 1,
					collateralStroops: 0n,
				},
				wallet,
				signer
			)
		).rejects.toThrow('Creator key id is not a valid Stellar address.');
		expect(factory).not.toHaveBeenCalled();
	});

	it('reads is_active_renter without a signer', async () => {
		const { client, factory, service } = setup();

		await expect(service.isActiveRenter(wallet, keyId)).resolves.toBe(true);

		expect(factory).toHaveBeenCalledWith(wallet, null);
		const args = vi.mocked(client.is_active_renter).mock.calls[0][0];
		expect(args.wallet.toString()).toBe(wallet);
		expect(args.key_id.toString()).toBe(keyId);
	});

	it('treats anything but true from is_active_renter as no access', async () => {
		const { client, service } = setup();
		vi.mocked(client.is_active_renter).mockResolvedValue({
			result: undefined,
		} as never);

		await expect(service.isActiveRenter(wallet, keyId)).resolves.toBe(false);
		await expect(service.isActiveRenter('', keyId)).resolves.toBe(false);
	});
});
