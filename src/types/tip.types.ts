export interface Tip {
	id: string;
	creatorId: string;
	tipper: string;
	amount: number; // in XLM
	netAmount: number; // in XLM (amount - fee)
	fee: number; // in XLM (2% fee deduction)
	message?: string;
	messageHash?: string;
	timestamp: number;
	txHash?: string;
}

export interface TipBreakdown {
	amount: number;
	fee: number;
	netAmount: number;
	feePercent: number;
}

export interface SendTipInput {
	creatorId: string;
	amount: number;
	message?: string;
}

export interface TipSentToastData {
	tipper: string;
	creatorName: string;
	amount: number;
	netAmount: number;
	fee?: number;
	message?: string;
	txHash?: string;
}
