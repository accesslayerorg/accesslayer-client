import { Address, Networks } from '@stellar/stellar-sdk';
import { Client } from '@stellar/stellar-sdk/contract';
import { env } from '@/utils/env.utils';

export interface OnChainMetadataResult {
	name?: string;
	symbol?: string;
	description?: string;
	image?: string;
	imageCid?: string;
	image_cid?: string;
	ipfsCid?: string;
	ipfs_cid?: string;
	avatarUri?: string;
	avatar_uri?: string;
	cid?: string;
}

export type CreatorKeysContractClientFactory = (
	contractId: string,
	rpcUrl: string,
	networkPassphrase: string
) => unknown;

function getNetworkPassphrase(): string {
	return env.VITE_STELLAR_NETWORK === 'mainnet'
		? Networks.PUBLIC
		: Networks.TESTNET;
}

const defaultFactory: CreatorKeysContractClientFactory = (
	contractId,
	rpcUrl,
	networkPassphrase
) => {
	return Client.from({
		contractId,
		rpcUrl,
		networkPassphrase,
	});
};

export class CreatorKeysContractService {
	private readonly factory: CreatorKeysContractClientFactory;

	constructor(factory: CreatorKeysContractClientFactory = defaultFactory) {
		this.factory = factory;
	}

	async getMetadata(keyId: string): Promise<OnChainMetadataResult | null> {
		if (!env.VITE_STELLAR_RPC_URL || !env.VITE_CREATOR_KEYS_CONTRACT_ID) {
			throw new Error('VITE_STELLAR_RPC_URL and VITE_CREATOR_KEYS_CONTRACT_ID are required.');
		}

		let address: Address;
		try {
			address = Address.fromString(keyId);
		} catch {
			throw new Error('Invalid key ID address.');
		}

		const client = this.factory(
			env.VITE_CREATOR_KEYS_CONTRACT_ID,
			env.VITE_STELLAR_RPC_URL,
			getNetworkPassphrase()
		) as {
			get_metadata(args: { key_id: Address }): Promise<{ result: unknown }>;
		};

		try {
			const res = await client.get_metadata({ key_id: address });
			return (res?.result as OnChainMetadataResult) ?? null;
		} catch (err) {
			try {
				const clientWithCreator = this.factory(
					env.VITE_CREATOR_KEYS_CONTRACT_ID,
					env.VITE_STELLAR_RPC_URL,
					getNetworkPassphrase()
				) as {
					get_metadata(args: { creator_id: Address }): Promise<{ result: unknown }>;
				};
				const res = await clientWithCreator.get_metadata({ creator_id: address });
				return (res?.result as OnChainMetadataResult) ?? null;
			} catch {
				throw err;
			}
		}
	}
}

export const creatorKeysContractService = new CreatorKeysContractService();
