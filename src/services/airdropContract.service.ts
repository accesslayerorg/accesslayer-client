import { Address, Networks } from '@stellar/stellar-sdk';
import {
	Client,
	type AssembledTransaction,
} from '@stellar/stellar-sdk/contract';
import type { Signer } from '@/lib/signing/types';
import { env } from '@/utils/env.utils';

export interface AirdropContractClient {
	claim_airdrop(args: {
		airdrop_id: string;
		recipient: Address;
	}): Promise<AssembledTransaction<unknown>>;
}

export type AirdropContractClientFactory = (
	address: string | undefined,
	signer: Signer
) => Promise<AirdropContractClient>;

export interface ClaimAirdropInput {
	/** Airdrop id being claimed, forwarded to the contract call. */
	airdropId: string;
	/** Connected Stellar wallet address of the claimant. */
	wallet: string;
	/** Signer used to sign and submit the transaction. */
	signer: Signer | null;
}

export interface ClaimAirdropResult {
	hash: string | null;
}

export class AirdropContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'AirdropContractError';
	}
}

function getNetworkPassphrase(): string {
	return env.VITE_STELLAR_NETWORK === 'mainnet'
		? Networks.PUBLIC
		: Networks.TESTNET;
}

function parseAddress(value: string | undefined, label: string): Address {
	if (!value) {
		throw new AirdropContractError(`${label} is not configured.`);
	}

	try {
		return Address.fromString(value);
	} catch {
		throw new AirdropContractError(
			`${label} is not a valid Stellar address.`
		);
	}
}

const defaultFactory: AirdropContractClientFactory = async (
	address,
	signer
) => {
	if (!env.VITE_STELLAR_RPC_URL) {
		throw new AirdropContractError(
			'VITE_STELLAR_RPC_URL is required for airdrop contract calls.'
		);
	}
	if (!env.VITE_CREATOR_KEYS_CONTRACT_ID) {
		throw new AirdropContractError(
			'VITE_CREATOR_KEYS_CONTRACT_ID is required for airdrop contract calls.'
		);
	}

	const publicKey = address ?? (await signer.getPublicKey());

	return Client.from<AirdropContractClient>({
		contractId: env.VITE_CREATOR_KEYS_CONTRACT_ID,
		rpcUrl: env.VITE_STELLAR_RPC_URL,
		networkPassphrase: getNetworkPassphrase(),
		signTransaction: async (transaction: string) => ({
			signedTxXdr: await signer.sign(transaction),
		}),
		...(publicKey ? { publicKey } : {}),
	});
};

export class AirdropContractService {
	private readonly clientFactory: AirdropContractClientFactory;

	constructor(clientFactory: AirdropContractClientFactory = defaultFactory) {
		this.clientFactory = clientFactory;
	}

	/**
	 * Signs and submits the on-chain `claim_airdrop` call for a single
	 * airdrop allocation.
	 */
	async claimAirdrop({
		airdropId,
		wallet,
		signer,
	}: ClaimAirdropInput): Promise<ClaimAirdropResult> {
		if (!airdropId) {
			throw new AirdropContractError('An airdrop ID is required to claim.');
		}
		if (!signer) {
			throw new AirdropContractError(
				'A connected wallet signer is required to claim airdrops.'
			);
		}

		const recipient = parseAddress(wallet, 'Connected Stellar address');
		const client = await this.clientFactory(wallet, signer);
		const transaction = await client.claim_airdrop({
			airdrop_id: airdropId,
			recipient,
		});
		const result = await transaction.signAndSend();

		return {
			hash: result.sendTransactionResponse?.hash ?? null,
		};
	}
}

export const airdropContractService = new AirdropContractService();
