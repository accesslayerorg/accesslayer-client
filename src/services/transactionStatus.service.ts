import { rpc } from '@stellar/stellar-sdk';
import { env } from '@/utils/env.utils';

/**
 * Ledger confirmation status for a submitted Stellar transaction (#1286).
 *
 * `getTransaction` answers `SUCCESS` once the transaction is included in a
 * ledger and `FAILED` when it is included but reverted. A hash the RPC has
 * not indexed yet answers `NOT_FOUND`; that is still an in-flight
 * transaction from the UI's point of view, so it is surfaced as
 * `NOT_FOUND` and the polling hook keeps waiting rather than treating it as
 * an error.
 */

export type TransactionStatus = 'SUCCESS' | 'FAILED' | 'NOT_FOUND';

export type TransactionStatusReader = (
	hash: string
) => Promise<TransactionStatus>;

const defaultReader: TransactionStatusReader = async hash => {
	if (!env.VITE_STELLAR_RPC_URL) {
		throw new Error(
			'VITE_STELLAR_RPC_URL is required to poll transaction status.'
		);
	}

	const response = await new rpc.Server(
		env.VITE_STELLAR_RPC_URL
	).getTransaction(hash);

	return response.status === 'SUCCESS' || response.status === 'FAILED'
		? response.status
		: 'NOT_FOUND';
};

export class TransactionStatusService {
	private readonly readStatus: TransactionStatusReader;

	constructor(readStatus: TransactionStatusReader = defaultReader) {
		this.readStatus = readStatus;
	}

	/** Reads the current ledger status for `hash` over Soroban RPC. */
	getStatus(hash: string): Promise<TransactionStatus> {
		return this.readStatus(hash);
	}
}

export const transactionStatusService = new TransactionStatusService();
