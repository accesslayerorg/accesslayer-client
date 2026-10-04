import {
	getAddress,
	getNetworkDetails,
	isConnected,
	signMessage,
	signTransaction,
} from '@stellar/freighter-api';
import { classifySigningError, SigningPipelineError } from './errors';
import type { Signer } from './types';

export interface FreighterApiAdapter {
	isConnected(): Promise<{ isConnected: boolean; error?: unknown }>;
	getAddress(): Promise<{ address: string; error?: unknown }>;
	getNetworkDetails(): Promise<{ networkPassphrase: string; error?: unknown }>;
	signTransaction(
		xdr: string,
		options: { networkPassphrase: string; address?: string }
	): Promise<{ signedTxXdr: string; error?: unknown }>;
	signMessage?(
		message: string,
		options: { networkPassphrase: string; address?: string }
	): Promise<{
		signedMessage: string | Uint8Array | null;
		error?: unknown;
	}>;
}

const defaultApi: FreighterApiAdapter = {
	isConnected,
	getAddress,
	getNetworkDetails,
	signTransaction,
	signMessage,
};

export class FreighterSigner implements Signer {
	readonly type = 'software' as const;
	private readonly networkPassphrase: string;
	private readonly api: FreighterApiAdapter;

	constructor(
		networkPassphrase: string,
		api: FreighterApiAdapter = defaultApi
	) {
		this.networkPassphrase = networkPassphrase;
		this.api = api;
	}

	static async isAvailable(
		api: FreighterApiAdapter = defaultApi
	): Promise<boolean> {
		try {
			const result = await api.isConnected();
			return result.isConnected && !result.error;
		} catch {
			return false;
		}
	}

	async getPublicKey(): Promise<string> {
		try {
			const result = await this.api.getAddress();
			if (result.error || !result.address) throw result.error;
			return result.address;
		} catch (error) {
			throw classifySigningError(error);
		}
	}

	async signMessage(message: string): Promise<string> {
		try {
			const network = await this.api.getNetworkDetails();
			if (network.error) throw network.error;
			if (network.networkPassphrase !== this.networkPassphrase) {
				throw new SigningPipelineError('NetworkMismatch');
			}
			if (!this.api.signMessage) {
				throw new Error('Freighter message signing is unavailable');
			}
			const address = await this.getPublicKey();
			const result = await this.api.signMessage(message, {
				networkPassphrase: this.networkPassphrase,
				address,
			});
			if (result.error || !result.signedMessage) throw result.error;
			if (typeof result.signedMessage === 'string') {
				return result.signedMessage;
			}
			return btoa(
				String.fromCharCode(...new Uint8Array(result.signedMessage))
			);
		} catch (error) {
			throw classifySigningError(error);
		}
	}

	async sign(xdr: string): Promise<string> {
		try {
			const network = await this.api.getNetworkDetails();
			if (network.error) throw network.error;
			if (network.networkPassphrase !== this.networkPassphrase) {
				throw new SigningPipelineError('NetworkMismatch');
			}
			const address = await this.getPublicKey();
			const result = await this.api.signTransaction(xdr, {
				networkPassphrase: this.networkPassphrase,
				address,
			});
			if (result.error || !result.signedTxXdr) throw result.error;
			return result.signedTxXdr;
		} catch (error) {
			throw classifySigningError(error);
		}
	}
}
