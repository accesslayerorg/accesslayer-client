import { Address, Networks } from '@stellar/stellar-sdk';
import {
	Client,
	type AssembledTransaction,
} from '@stellar/stellar-sdk/contract';
import type { Signer } from '@/lib/signing/types';
import type { ListRentalInput, RentKeyInput } from '@/types/keyRental';
import { env } from '@/utils/env.utils';

/**
 * Rental contract entrypoints, as specified in accesslayer-contracts#1227.
 * Listing ids are u64, day counts u32 and amounts i128 stroops.
 */
export interface KeyRentalContractClient {
	list_rental(args: {
		owner: Address;
		key_id: Address;
		quantity: bigint;
		fee_per_day: bigint;
		max_days: number;
		collateral: bigint;
	}): Promise<AssembledTransaction<unknown>>;
	rent(args: {
		renter: Address;
		listing_id: bigint;
		days: number;
	}): Promise<AssembledTransaction<unknown>>;
	end_rental(args: {
		listing_id: bigint;
	}): Promise<AssembledTransaction<unknown>>;
	claim_collateral(args: {
		owner: Address;
		listing_id: bigint;
	}): Promise<AssembledTransaction<unknown>>;
	is_active_renter(args: {
		wallet: Address;
		key_id: Address;
	}): Promise<AssembledTransaction<boolean>>;
}

/**
 * Builds a contract client for `address`. Without a signer the client can only
 * simulate read calls such as `is_active_renter`.
 */
export type KeyRentalContractClientFactory = (
	address: string | undefined,
	signer: Signer | null
) => Promise<KeyRentalContractClient>;

export interface KeyRentalTxResult {
	hash: string | null;
}

export class KeyRentalContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'KeyRentalContractError';
	}
}

/** Whether a rental contract is configured for this deployment. */
export function isKeyRentalContractConfigured(): boolean {
	return Boolean(env.VITE_KEY_RENTAL_CONTRACT_ID && env.VITE_STELLAR_RPC_URL);
}

function getNetworkPassphrase(): string {
	return env.VITE_STELLAR_NETWORK === 'mainnet'
		? Networks.PUBLIC
		: Networks.TESTNET;
}

function parseAddress(value: string | undefined, label: string): Address {
	if (!value) {
		throw new KeyRentalContractError(`${label} is required.`);
	}
	try {
		return Address.fromString(value);
	} catch {
		throw new KeyRentalContractError(
			`${label} is not a valid Stellar address.`
		);
	}
}

function parseListingId(listingId: string): bigint {
	if (!/^\d+$/.test(listingId.trim())) {
		throw new KeyRentalContractError('Invalid rental listing id.');
	}
	return BigInt(listingId.trim());
}

function requireSigner(signer: Signer | null): Signer {
	if (!signer) {
		throw new KeyRentalContractError(
			'A connected wallet signer is required for rental transactions.'
		);
	}
	return signer;
}

const defaultFactory: KeyRentalContractClientFactory = async (
	address,
	signer
) => {
	if (!env.VITE_STELLAR_RPC_URL) {
		throw new KeyRentalContractError(
			'VITE_STELLAR_RPC_URL is required for rental contract calls.'
		);
	}
	if (!env.VITE_KEY_RENTAL_CONTRACT_ID) {
		throw new KeyRentalContractError(
			'VITE_KEY_RENTAL_CONTRACT_ID is required for rental contract calls.'
		);
	}

	const publicKey =
		address ?? (signer ? await signer.getPublicKey() : undefined);

	return Client.from<KeyRentalContractClient>({
		contractId: env.VITE_KEY_RENTAL_CONTRACT_ID,
		rpcUrl: env.VITE_STELLAR_RPC_URL,
		networkPassphrase: getNetworkPassphrase(),
		...(signer
			? {
					signTransaction: async (transaction: string) => ({
						signedTxXdr: await signer.sign(transaction),
					}),
				}
			: {}),
		...(publicKey ? { publicKey } : {}),
	});
};

async function submit(
	transaction: AssembledTransaction<unknown>
): Promise<KeyRentalTxResult> {
	const result = await transaction.signAndSend();
	return { hash: result.sendTransactionResponse?.hash ?? null };
}

export class KeyRentalContractService {
	private readonly clientFactory: KeyRentalContractClientFactory;

	constructor(clientFactory: KeyRentalContractClientFactory = defaultFactory) {
		this.clientFactory = clientFactory;
	}

	/** Escrows keys in a new listing via `list_rental`. */
	async listRental(
		input: ListRentalInput,
		wallet: string,
		signer: Signer | null
	): Promise<KeyRentalTxResult> {
		const activeSigner = requireSigner(signer);
		if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
			throw new KeyRentalContractError('List at least one key.');
		}
		if (input.feePerDayStroops <= 0n) {
			throw new KeyRentalContractError(
				'The fee per day must be greater than 0.'
			);
		}
		if (!Number.isInteger(input.maxDays) || input.maxDays <= 0) {
			throw new KeyRentalContractError('Maximum days must be at least 1.');
		}
		if (input.collateralStroops < 0n) {
			throw new KeyRentalContractError('Collateral cannot be negative.');
		}

		const owner = parseAddress(wallet, 'Connected Stellar address');
		const keyId = parseAddress(input.keyId, 'Creator key id');
		const client = await this.clientFactory(wallet, activeSigner);
		const transaction = await client.list_rental({
			owner,
			key_id: keyId,
			quantity: BigInt(input.quantity),
			fee_per_day: input.feePerDayStroops,
			max_days: input.maxDays,
			collateral: input.collateralStroops,
		});
		return submit(transaction);
	}

	/** Rents a listing for `days` days via `rent`; the contract charges the fee and locks the collateral. */
	async rent(
		input: RentKeyInput,
		wallet: string,
		signer: Signer | null
	): Promise<KeyRentalTxResult> {
		const activeSigner = requireSigner(signer);
		if (!Number.isInteger(input.days) || input.days <= 0) {
			throw new KeyRentalContractError('Rent for at least one day.');
		}

		const renter = parseAddress(wallet, 'Connected Stellar address');
		const listingId = parseListingId(input.listingId);
		const client = await this.clientFactory(wallet, activeSigner);
		const transaction = await client.rent({
			renter,
			listing_id: listingId,
			days: input.days,
		});
		return submit(transaction);
	}

	/** Ends an expired rental via `end_rental`, returning keys and collateral. */
	async endRental(
		listingId: string,
		wallet: string,
		signer: Signer | null
	): Promise<KeyRentalTxResult> {
		const activeSigner = requireSigner(signer);
		const id = parseListingId(listingId);
		parseAddress(wallet, 'Connected Stellar address');
		const client = await this.clientFactory(wallet, activeSigner);
		const transaction = await client.end_rental({ listing_id: id });
		return submit(transaction);
	}

	/** Claims the collateral after the grace period via `claim_collateral`. */
	async claimCollateral(
		listingId: string,
		wallet: string,
		signer: Signer | null
	): Promise<KeyRentalTxResult> {
		const activeSigner = requireSigner(signer);
		const id = parseListingId(listingId);
		const owner = parseAddress(wallet, 'Connected Stellar address');
		const client = await this.clientFactory(wallet, activeSigner);
		const transaction = await client.claim_collateral({
			owner,
			listing_id: id,
		});
		return submit(transaction);
	}

	/**
	 * Reads `is_active_renter` by simulation, without signing. Returns false
	 * when no rental contract is configured.
	 */
	async isActiveRenter(wallet: string, keyId: string): Promise<boolean> {
		if (!wallet || !keyId) return false;
		const walletAddress = parseAddress(wallet, 'Wallet address');
		const keyAddress = parseAddress(keyId, 'Creator key id');
		const client = await this.clientFactory(wallet, null);
		const transaction = await client.is_active_renter({
			wallet: walletAddress,
			key_id: keyAddress,
		});
		return transaction.result === true;
	}
}

export const keyRentalContractService = new KeyRentalContractService();
