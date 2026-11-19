import { Horizon, xdr } from '@stellar/stellar-sdk';
import { env } from '@/utils/env.utils';

const PUBLIC_HORIZON_URLS: Record<'mainnet' | 'testnet', string> = {
	mainnet: 'https://horizon.stellar.org',
	testnet: 'https://horizon-testnet.stellar.org',
};

let cachedServer: Horizon.Server | null = null;

/**
 * Returns a shared Horizon.Server instance pointed at VITE_HORIZON_URL, or
 * the public Horizon endpoint for the configured network when unset (#1082).
 */
export function getHorizonServer(): Horizon.Server {
	if (cachedServer) return cachedServer;
	const url = env.VITE_HORIZON_URL ?? PUBLIC_HORIZON_URLS[env.VITE_STELLAR_NETWORK];
	cachedServer = new Horizon.Server(url);
	return cachedServer;
}

export type HorizonTransactionStatus =
	| { status: 'confirmed' }
	| { status: 'failed'; errorMessage: string }
	| { status: 'pending' };

/**
 * Looks up a submitted transaction's status on Horizon (#1082).
 *
 * Horizon returns 404 until the transaction is included in a closed ledger,
 * which this treats as `pending` rather than a failure: a 404 means "not
 * found yet", not "rejected". Any other error (network failure, malformed
 * hash) is surfaced as `failed` so the caller does not poll forever against
 * a request that can never succeed.
 */
export async function getTransactionStatus(
	hash: string
): Promise<HorizonTransactionStatus> {
	try {
		const record = await getHorizonServer().transactions().transaction(hash).call();
		if (record.successful) return { status: 'confirmed' };
		return {
			status: 'failed',
			errorMessage: extractResultCode(record.result_xdr) ?? 'Transaction failed on-chain.',
		};
	} catch (error) {
		if (isNotFoundError(error)) return { status: 'pending' };
		return {
			status: 'failed',
			errorMessage: error instanceof Error ? error.message : 'Unable to reach Horizon.',
		};
	}
}

function isNotFoundError(error: unknown): boolean {
	if (error && typeof error === 'object' && 'response' in error) {
		const response = (error as { response?: { status?: number } }).response;
		return response?.status === 404;
	}
	return false;
}

/**
 * Best-effort extraction of a human-readable code from a transaction's
 * result XDR. Falls back to undefined (caller supplies a generic message)
 * rather than throwing, since a malformed or unexpected XDR shape here must
 * never crash the poller.
 */
function extractResultCode(resultXdr: string | undefined): string | undefined {
	if (!resultXdr) return undefined;
	try {
		const result = xdr.TransactionResult.fromXdr(resultXdr, 'base64');
		return result.result.type;
	} catch {
		return undefined;
	}
}
