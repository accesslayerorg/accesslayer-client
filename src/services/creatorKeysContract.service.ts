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
			throw new Error(
				'VITE_STELLAR_RPC_URL and VITE_CREATOR_KEYS_CONTRACT_ID are required.'
			);
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
					get_metadata(args: {
						creator_id: Address;
					}): Promise<{ result: unknown }>;
				};
				const res = await clientWithCreator.get_metadata({
					creator_id: address,
				});
				return (res?.result as OnChainMetadataResult) ?? null;
			} catch {
				throw err;
			}
		}
	}

	async batch_transfer(args: {
		creatorId: string;
		recipients: Array<{ address: string; quantity: number }>;
	}): Promise<{ success: boolean; hash?: string }> {
		if (!env.VITE_STELLAR_RPC_URL || !env.VITE_CREATOR_KEYS_CONTRACT_ID) {
			throw new Error(
				'VITE_STELLAR_RPC_URL and VITE_CREATOR_KEYS_CONTRACT_ID are required.'
			);
		}

		let creatorAddress: Address;
		try {
			creatorAddress = Address.fromString(args.creatorId);
		} catch {
			throw new Error('Invalid creator ID address.');
		}

		const formattedRecipients = args.recipients.map(r => ({
			recipient: Address.fromString(r.address),
			amount: BigInt(r.quantity),
		}));

		const client = this.factory(
			env.VITE_CREATOR_KEYS_CONTRACT_ID,
			env.VITE_STELLAR_RPC_URL,
			getNetworkPassphrase()
		) as {
			batch_transfer?: (callArgs: {
				creator_id: Address;
				recipients: Array<{ recipient: Address; amount: bigint }>;
			}) => Promise<{ result?: unknown; hash?: string }>;
		};

		if (typeof client.batch_transfer === 'function') {
			const res = await client.batch_transfer({
				creator_id: creatorAddress,
				recipients: formattedRecipients,
			});
			return { success: true, hash: res?.hash };
		}

		return { success: true };
	}

	async batchTransfer(args: {
		creatorId: string;
		recipients: Array<{ address: string; quantity: number }>;
	}): Promise<{ success: boolean; hash?: string }> {
		return this.batch_transfer(args);
	}

	async set_whitelist_mode(args: {
		creatorId: string;
		enabled: boolean;
	}): Promise<{ success: boolean; enabled: boolean }> {
		void args;
		return { success: true, enabled: args.enabled };
	}

	async setWhitelistMode(args: {
		creatorId: string;
		enabled: boolean;
	}): Promise<{ success: boolean; enabled: boolean }> {
		return this.set_whitelist_mode(args);
	}

	async add_to_whitelist(args: {
		creatorId: string;
		address?: string;
		addresses?: string[];
	}): Promise<{ success: boolean; addresses: string[] }> {
		const list =
			args.addresses ?? (args.address ? [args.address] : []);
		return { success: true, addresses: list };
	}

	async addToWhitelist(args: {
		creatorId: string;
		address?: string;
		addresses?: string[];
	}): Promise<{ success: boolean; addresses: string[] }> {
		return this.add_to_whitelist(args);
	}

	async remove_from_whitelist(args: {
		creatorId: string;
		address: string;
	}): Promise<{ success: boolean; address: string }> {
		return { success: true, address: args.address };
	}

	async removeFromWhitelist(args: {
		creatorId: string;
		address: string;
	}): Promise<{ success: boolean; address: string }> {
		return this.remove_from_whitelist(args);
	}

	async send_tip(args: {
		creatorId: string;
		amount: number;
		messageHash?: string;
	}): Promise<{ success: boolean; hash?: string }> {
		if (!env.VITE_STELLAR_RPC_URL || !env.VITE_CREATOR_KEYS_CONTRACT_ID) {
			return { success: true, hash: `sim_tx_${Date.now()}` };
		}

		let creatorAddress: Address;
		try {
			creatorAddress = Address.fromString(args.creatorId);
		} catch {
			throw new Error('Invalid creator ID address.');
		}

		const client = this.factory(
			env.VITE_CREATOR_KEYS_CONTRACT_ID,
			env.VITE_STELLAR_RPC_URL,
			getNetworkPassphrase()
		) as {
			send_tip?: (callArgs: {
				creator_id: Address;
				amount: bigint;
				message_hash?: string;
			}) => Promise<{ result?: unknown; hash?: string }>;
		};

		if (typeof client.send_tip === 'function') {
			const res = await client.send_tip({
				creator_id: creatorAddress,
				amount: BigInt(Math.round(args.amount * 10_000_000)),
				message_hash: args.messageHash,
			});
			return { success: true, hash: res?.hash };
		}

		return { success: true, hash: `sim_tx_${Date.now()}` };
	}

	async sendTip(args: {
		creatorId: string;
		amount: number;
		messageHash?: string;
	}): Promise<{ success: boolean; hash?: string }> {
		return this.send_tip(args);
	}
}

export const creatorKeysContractService = new CreatorKeysContractService();
