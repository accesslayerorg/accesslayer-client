import { Address, Networks } from '@stellar/stellar-sdk';
import { Client } from '@stellar/stellar-sdk/contract';
import type { Signer } from '@/lib/signing/types';
import { env } from '@/utils/env.utils';

export const NOTIFICATION_PREFERENCE_TYPES = [
	'settlement',
	'kyc_expiry',
	'watchlist_change',
	'auto_invest',
	'maturity_approaching',
] as const;

export type NotificationPreferenceType =
	(typeof NOTIFICATION_PREFERENCE_TYPES)[number];

export type NotificationPreferences = Record<
	NotificationPreferenceType,
	boolean
>;

export interface NotificationPreferencesContractClient {
	get_alert_preferences(args: {
		user: Address;
	}): Promise<{ result: NotificationPreferences | null | undefined }>;
	set_alert_preferences(args: {
		user: Address;
		settlement: boolean;
		kyc_expiry: boolean;
		watchlist_change: boolean;
		auto_invest: boolean;
		maturity_approaching: boolean;
	}): Promise<{
		simulation?: unknown;
		signAndSend(): Promise<{
			sendTransactionResponse?: { hash?: string };
			getTransactionResponse?: { status?: string };
		}>;
	}>;
}

export type NotificationPreferencesClientFactory = (
	address: string,
	signer?: Signer
) => Promise<NotificationPreferencesContractClient>;

export class NotificationPreferencesContractError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'NotificationPreferencesContractError';
	}
}

function getNetworkPassphrase(): string {
	return env.VITE_STELLAR_NETWORK === 'mainnet'
		? Networks.PUBLIC
		: Networks.TESTNET;
}

const defaultFactory: NotificationPreferencesClientFactory = async (
	address,
	signer
) => {
	if (!env.VITE_STELLAR_RPC_URL || !env.VITE_CREATOR_KEYS_CONTRACT_ID) {
		throw new NotificationPreferencesContractError(
			'VITE_STELLAR_RPC_URL and VITE_CREATOR_KEYS_CONTRACT_ID are required to access alert preferences.'
		);
	}

	return Client.from<NotificationPreferencesContractClient>({
		contractId: env.VITE_CREATOR_KEYS_CONTRACT_ID,
		rpcUrl: env.VITE_STELLAR_RPC_URL,
		networkPassphrase: getNetworkPassphrase(),
		publicKey: address,
		...(signer
			? {
					signTransaction: async (transaction: string) => ({
						signedTxXdr: await signer.sign(transaction),
					}),
				}
			: {}),
	});
};

function parseAddress(value: string): Address {
	try {
		return Address.fromString(value);
	} catch {
		throw new NotificationPreferencesContractError(
			'The connected wallet is not a valid Stellar address.'
		);
	}
}

export class NotificationPreferencesService {
	private readonly clientFactory: NotificationPreferencesClientFactory;

	constructor(
		clientFactory: NotificationPreferencesClientFactory = defaultFactory
	) {
		this.clientFactory = clientFactory;
	}

	async getPreferences(
		address: string
	): Promise<NotificationPreferences | null | undefined> {
		const user = parseAddress(address);
		const client = await this.clientFactory(address);
		const { result } = await client.get_alert_preferences({
			user,
		});
		return result;
	}

	async updatePreferences(
		address: string,
		preferences: NotificationPreferences,
		signer: Signer
	): Promise<void> {
		const user = parseAddress(address);
		const client = await this.clientFactory(address, signer);
		const transaction = await client.set_alert_preferences({
			user,
			...preferences,
		});
		const sent = await transaction.signAndSend();

		if (
			sent.getTransactionResponse?.status !== 'SUCCESS' ||
			!sent.sendTransactionResponse?.hash
		) {
			throw new NotificationPreferencesContractError(
				'The alert preferences transaction did not succeed on-chain.'
			);
		}
	}
}

export const notificationPreferencesService =
	new NotificationPreferencesService();
