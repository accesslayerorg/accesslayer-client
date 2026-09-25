import Str from '@ledgerhq/hw-app-str';
import TransportWebHID from '@ledgerhq/hw-transport-webhid';
import { StrKey, TransactionBuilder, xdr } from '@stellar/stellar-sdk';
import { classifySigningError, SigningPipelineError } from './errors';
import type { Signer } from './types';

const DEFAULT_PATH = "44'/148'/0'";
const DEFAULT_TIMEOUT_MS = 30_000;

type LedgerTransport = Awaited<ReturnType<typeof TransportWebHID.create>>;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
	return new Promise((resolve, reject) => {
		const timer = window.setTimeout(
			() => reject(new SigningPipelineError('LedgerTimeout')),
			timeoutMs
		);
		promise.then(
			value => {
				window.clearTimeout(timer);
				resolve(value);
			},
			error => {
				window.clearTimeout(timer);
				reject(error);
			}
		);
	});
}

export class LedgerSigner implements Signer {
	readonly type = 'hardware' as const;
	private transport: LedgerTransport | null = null;
	private app: Str | null = null;
	private readonly networkPassphrase: string;
	private readonly path: string;
	private readonly timeoutMs: number;

	constructor(
		networkPassphrase: string,
		path = DEFAULT_PATH,
		timeoutMs = DEFAULT_TIMEOUT_MS
	) {
		this.networkPassphrase = networkPassphrase;
		this.path = path;
		this.timeoutMs = timeoutMs;
	}

	static async isAvailable(): Promise<boolean> {
		try {
			return (
				typeof navigator !== 'undefined' &&
				(await TransportWebHID.isSupported())
			);
		} catch {
			return false;
		}
	}

	private async connect(): Promise<Str> {
		if (this.app) return this.app;
		try {
			this.transport = await TransportWebHID.create();
			this.transport.on('disconnect', () => {
				this.transport = null;
				this.app = null;
			});
			this.app = new Str(this.transport);
			return this.app;
		} catch (error) {
			throw classifySigningError(error);
		}
	}

	async healthCheck(): Promise<void> {
		try {
			const app = await this.connect();
			await withTimeout(app.getAppConfiguration(), this.timeoutMs);
		} catch (error) {
			this.app = null;
			this.transport = null;
			throw classifySigningError(error);
		}
	}

	async getPublicKey(): Promise<string> {
		try {
			await this.healthCheck();
			const result = await withTimeout(
				this.app!.getPublicKey(this.path),
				this.timeoutMs
			);
			return StrKey.encodeEd25519PublicKey(result.rawPublicKey);
		} catch (error) {
			throw classifySigningError(error);
		}
	}

	async sign(transactionXdr: string): Promise<string> {
		try {
			await this.healthCheck();
			const transaction = TransactionBuilder.fromXDR(
				transactionXdr,
				this.networkPassphrase
			);
			const signatureBase = transaction.signatureBase();
			const configuration = await withTimeout(
				this.app!.getAppConfiguration(),
				this.timeoutMs
			);
			if (
				configuration.maxDataSize &&
				signatureBase.length > configuration.maxDataSize
			) {
				throw new SigningPipelineError('TransactionTooLarge');
			}
			const [{ rawPublicKey }, { signature }] = await Promise.all([
				withTimeout(this.app!.getPublicKey(this.path), this.timeoutMs),
				withTimeout(
					this.app!.signTransaction(this.path, Buffer.from(signatureBase)),
					this.timeoutMs
				),
			]);
			transaction.signatures.push(
				new xdr.DecoratedSignature({
					hint: rawPublicKey.subarray(rawPublicKey.length - 4),
					signature,
				})
			);
			return transaction.toXDR();
		} catch (error) {
			throw classifySigningError(error);
		}
	}

	async disconnect(): Promise<void> {
		await this.transport?.close();
		this.transport = null;
		this.app = null;
	}
}
