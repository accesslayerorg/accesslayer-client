import { Address, Networks } from '@stellar/stellar-sdk';
import {
	Client,
	type AssembledTransaction,
} from '@stellar/stellar-sdk/contract';
import type { Signer } from '@/lib/signing/types';
import { env } from '@/utils/env.utils';

export interface CampaignContractClient {
	claim_campaign_reward(args: {
		campaign_id: string;
		claimant: Address;
	}): Promise<AssembledTransaction<unknown>>;
}

export type CampaignContractClientFactory = (
	address: string | undefined,
	signer: Signer
) => Promise<CampaignContractClient>;

export interface ClaimCampaignRewardInput {
	/** Campaign id being claimed, forwarded to the contract call. */
	campaignId: string;
	/** Connected Stellar wallet address of the claimant. */
	wallet: string;
	/** Signer used to sign and submit the transaction. */
	signer: Signer | null;
}

export interface ClaimCampaignRewardResult {
	hash: string | null;
}

export class CampaignContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CampaignContractError';
	}
}

function getNetworkPassphrase(): string {
	return env.VITE_STELLAR_NETWORK === 'mainnet'
		? Networks.PUBLIC
		: Networks.TESTNET;
}

function parseAddress(value: string | undefined, label: string): Address {
	if (!value) {
		throw new CampaignContractError(`${label} is not configured.`);
	}

	try {
		return Address.fromString(value);
	} catch {
		throw new CampaignContractError(
			`${label} is not a valid Stellar address.`
		);
	}
}

const defaultFactory: CampaignContractClientFactory = async (
	address,
	signer
) => {
	if (!env.VITE_STELLAR_RPC_URL) {
		throw new CampaignContractError(
			'VITE_STELLAR_RPC_URL is required for campaign contract calls.'
		);
	}
	if (!env.VITE_CREATOR_KEYS_CONTRACT_ID) {
		throw new CampaignContractError(
			'VITE_CREATOR_KEYS_CONTRACT_ID is required for campaign contract calls.'
		);
	}

	const publicKey = address ?? (await signer.getPublicKey());

	return Client.from<CampaignContractClient>({
		contractId: env.VITE_CREATOR_KEYS_CONTRACT_ID,
		rpcUrl: env.VITE_STELLAR_RPC_URL,
		networkPassphrase: getNetworkPassphrase(),
		signTransaction: async (transaction: string) => ({
			signedTxXdr: await signer.sign(transaction),
		}),
		...(publicKey ? { publicKey } : {}),
	});
};

export class CampaignContractService {
	private readonly clientFactory: CampaignContractClientFactory;

	constructor(clientFactory: CampaignContractClientFactory = defaultFactory) {
		this.clientFactory = clientFactory;
	}

	/**
	 * Signs and submits the on-chain `claim_campaign_reward` call for an
	 * ended campaign the wallet qualified for (#1204).
	 */
	async claimCampaignReward({
		campaignId,
		wallet,
		signer,
	}: ClaimCampaignRewardInput): Promise<ClaimCampaignRewardResult> {
		if (!campaignId) {
			throw new CampaignContractError('A campaign ID is required to claim.');
		}
		if (!signer) {
			throw new CampaignContractError(
				'A connected wallet signer is required to claim campaign rewards.'
			);
		}

		const claimant = parseAddress(wallet, 'Connected Stellar address');
		const client = await this.clientFactory(wallet, signer);
		const transaction = await client.claim_campaign_reward({
			campaign_id: campaignId,
			claimant,
		});
		const result = await transaction.signAndSend();

		return {
			hash: result.sendTransactionResponse?.hash ?? null,
		};
	}
}

export const campaignContractService = new CampaignContractService();
