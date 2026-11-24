export interface StreamWithdrawal {
	id: string;
	txHash: string;
	amountXlm: number;
	feeXlm: number;
	netAmountXlm: number;
	timestamp: string; // ISO string
	explorerUrl: string;
}

export interface EarningsStream {
	id: string;
	creatorAddress: string;
	keyId: string;
	keySymbol: string;
	keyName: string;
	keyAvatarUrl?: string;
	/** Total XLM funded into the stream. */
	fundedAmount: number;
	/** Total XLM withdrawn so far. */
	withdrawnAmount: number;
	/** Rate in XLM streamed per second. */
	ratePerSecond: number;
	/** Epoch timestamp in ms when streaming began. */
	startTime: number;
	/** Epoch timestamp in ms when streaming reaches 100% distribution. */
	stopTime: number;
	/** Epoch timestamp in ms of last withdrawal or start time. */
	lastWithdrawalTime: number;
	/** Epoch timestamp in ms when stream was paused (if paused). */
	pausedAt?: number;
	/** Whether the stream is paused. Accrual stops when paused. */
	isPaused: boolean;
	/** Historical withdrawals from this stream. */
	withdrawals: StreamWithdrawal[];
}
