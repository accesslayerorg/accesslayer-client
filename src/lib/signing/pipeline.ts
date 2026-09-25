import { classifySigningError } from './errors';
import type { Signer, SigningError, SigningProgressState } from './types';

const DEFAULT_RETRY_DELAYS = [2_000, 4_000, 8_000] as const;

export interface SigningRetryOptions {
	retryDelays?: readonly number[];
	sleep?: (milliseconds: number) => Promise<void>;
	onRetry?: (attempt: number, delayMs: number, error: SigningError) => void;
}

export interface SigningPipelineOptions<T> extends SigningRetryOptions {
	prepare: () => Promise<string>;
	signer: Signer;
	submit: (signedXdr: string) => Promise<T>;
	onProgress?: (state: SigningProgressState) => void;
}

const defaultSleep = (milliseconds: number) =>
	new Promise<void>(resolve => window.setTimeout(resolve, milliseconds));

/** Hardware timeouts retry at 2s/4s/8s; actionable and user-rejected errors never retry. */
export async function signWithRetry(
	signer: Signer,
	xdr: string,
	options: SigningRetryOptions = {}
): Promise<string> {
	const delays = options.retryDelays ?? DEFAULT_RETRY_DELAYS;
	const sleep = options.sleep ?? defaultSleep;
	let retries = 0;

	while (true) {
		try {
			return await signer.sign(xdr);
		} catch (rawError) {
			const error = classifySigningError(rawError);
			if (
				signer.type !== 'hardware' ||
				error.type !== 'LedgerTimeout' ||
				retries >= delays.length
			) {
				throw error;
			}
			const delay = delays[retries];
			retries += 1;
			options.onRetry?.(retries, delay, error);
			await sleep(delay);
		}
	}
}

export async function executeSigningPipeline<T>(
	options: SigningPipelineOptions<T>
): Promise<T> {
	try {
		options.onProgress?.({ stage: 'preparing' });
		const xdr = await options.prepare();
		options.onProgress?.({ stage: 'waiting-for-signature' });
		const signedXdr = await signWithRetry(options.signer, xdr, {
			retryDelays: options.retryDelays,
			sleep: options.sleep,
			onRetry: options.onRetry,
		});
		options.onProgress?.({ stage: 'submitting' });
		const result = await options.submit(signedXdr);
		options.onProgress?.({ stage: 'complete' });
		return result;
	} catch (rawError) {
		const error = classifySigningError(rawError);
		options.onProgress?.({ stage: 'failed', error });
		throw error;
	}
}
