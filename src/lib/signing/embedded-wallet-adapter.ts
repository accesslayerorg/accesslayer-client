import { Asset, FeeBumpTransaction, TransactionBuilder, type Transaction } from '@stellar/stellar-sdk';
import type { AuthenticationCredentialJSON } from '@/lib/webauthn';
import { SigningPipelineError } from './errors';
import type { Signer } from './types';

/**
 * Signer for embedded (passkey / email) wallets (#1477). Signing is
 * server-assisted: the XDR goes to the wallet service, which holds the key.
 *
 * Transactions moving more than `reauthThresholdXlm`, or whose amount cannot
 * be read from the XDR (contract calls, non-XLM assets), first ask the user
 * to confirm with their passkey and send that assertion with the request.
 * The server enforces its own limit too; this check only decides when to
 * prompt.
 */

export interface EmbeddedSigningApi {
	sign(xdr: string, networkPassphrase: string, reauth?: AuthenticationCredentialJSON): Promise<string>;
}

export interface EmbeddedWalletAdapterOptions {
	publicKey: string;
	networkPassphrase: string;
	reauthThresholdXlm: number;
	api: EmbeddedSigningApi;
	/** Prompts for the passkey; rejects when the user cancels or has none. */
	reauthenticate: () => Promise<AuthenticationCredentialJSON>;
	/** Defaults to reading native XLM amounts out of the XDR. */
	estimateAmountXlm?: (xdr: string, networkPassphrase: string) => number | null;
}

const isNative = (asset: Asset) => asset.isNative();

/**
 * Total XLM a transaction sends, from its operations. Returns null when any
 * operation moves value the client cannot price (contract invocations,
 * non-native assets, offers), so the caller can fail safe.
 */
export function estimateNativeAmountXlm(xdr: string, networkPassphrase: string): number | null {
	let tx: Transaction;
	try {
		const parsed = TransactionBuilder.fromXDR(xdr, networkPassphrase);
		tx = parsed instanceof FeeBumpTransaction ? parsed.innerTransaction : parsed;
	} catch {
		return null;
	}
	let total = 0;
	for (const op of tx.operations) {
		switch (op.type) {
			case 'payment':
				if (!isNative(op.asset)) return null;
				total += Number(op.amount);
				break;
			case 'createAccount':
				total += Number(op.startingBalance);
				break;
			case 'pathPaymentStrictSend':
				if (!isNative(op.sendAsset)) return null;
				total += Number(op.sendAmount);
				break;
			case 'pathPaymentStrictReceive':
				if (!isNative(op.sendAsset)) return null;
				total += Number(op.sendMax);
				break;
			case 'changeTrust':
			case 'manageData':
			case 'bumpSequence':
			case 'setOptions':
				break;
			default:
				return null;
		}
	}
	return Number.isFinite(total) ? total : null;
}

export class EmbeddedWalletAdapter implements Signer {
	readonly type = 'software' as const;
	private readonly options: EmbeddedWalletAdapterOptions;

	constructor(options: EmbeddedWalletAdapterOptions) {
		this.options = options;
	}

	async getPublicKey(): Promise<string> {
		return this.options.publicKey;
	}

	/** Whether signing this XDR will ask for the passkey first. */
	requiresReauth(xdr: string): boolean {
		const estimate = (this.options.estimateAmountXlm ?? estimateNativeAmountXlm)(xdr, this.options.networkPassphrase);
		return estimate === null || estimate > this.options.reauthThresholdXlm;
	}

	async sign(xdr: string): Promise<string> {
		const { api, networkPassphrase, reauthenticate } = this.options;
		let reauth: AuthenticationCredentialJSON | undefined;
		if (this.requiresReauth(xdr)) {
			try {
				reauth = await reauthenticate();
			} catch (cause) {
				throw new SigningPipelineError(
					'UserRejected',
					'Signing this transaction needs a passkey confirmation.',
					cause
				);
			}
		}
		return api.sign(xdr, networkPassphrase, reauth);
	}
}
