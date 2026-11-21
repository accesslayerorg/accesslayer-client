// src/services/transactionHistory.service.ts
import { BaseApiService, type APIResponse } from './api.service';

/** Every kind of wallet event the history page can show. */
export type WalletTransactionType =
	'buy' | 'sell' | 'stake' | 'unstake' | 'claim' | 'referral' | 'swap';

/** Whether value moved into or out of the wallet. */
export type WalletTransactionDirection = 'in' | 'out';

export interface WalletTransaction {
	id: string;
	type: WalletTransactionType;
	/** Display name of the creator key involved (or the swap pair). */
	keyName: string;
	creatorId?: string;
	/** Transaction value in XLM. */
	amount: number;
	direction: WalletTransactionDirection;
	/** Network + protocol fee paid, in XLM. */
	fee: number;
	/** Unix epoch milliseconds. */
	timestamp: number;
	txHash?: string;
}

export interface WalletTransactionPage {
	items: WalletTransaction[];
	/** Opaque cursor for the next page; `null` when there are no more. */
	nextCursor: string | null;
}

export interface GetWalletTransactionsParams {
	address: string;
	/** Restrict to these types; omitted means all types. */
	types?: WalletTransactionType[];
	/** Inclusive lower bound, epoch ms. */
	from?: number;
	/** Inclusive upper bound, epoch ms. */
	to?: number;
	cursor?: string | null;
	limit?: number;
}

export const TRANSACTION_HISTORY_PAGE_SIZE = 20;

class TransactionHistoryService extends BaseApiService {
	/** GET /wallet/:address/transactions */
	async getTransactions({
		address,
		types,
		from,
		to,
		cursor,
		limit = TRANSACTION_HISTORY_PAGE_SIZE,
	}: GetWalletTransactionsParams): Promise<WalletTransactionPage> {
		try {
			const response = await this.api.get<
				APIResponse<WalletTransactionPage>
			>(`/wallet/${address}/transactions`, {
				params: {
					limit,
					...(types?.length ? { types: types.join(',') } : {}),
					...(from !== undefined
						? { from: new Date(from).toISOString() }
						: {}),
					...(to !== undefined ? { to: new Date(to).toISOString() } : {}),
					...(cursor ? { cursor } : {}),
				},
			});
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const transactionHistoryService = new TransactionHistoryService();
