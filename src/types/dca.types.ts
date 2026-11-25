export type DcaFrequency = 'daily' | 'weekly' | 'monthly';

export type DcaPlanStatus = 'active' | 'paused' | 'completed' | 'cancelled';

export type DcaRunStatus = 'success' | 'skipped' | 'failed';

export interface DcaExecutionRun {
	id: string;
	planId: string;
	timestamp: string;
	status: DcaRunStatus;
	priceStroops?: number;
	priceXlm?: number;
	quantity?: number;
	spentStroops?: number;
	spentXlm?: number;
	skipReason?: string;
	txHash?: string;
}

export interface DcaPlan {
	id: string;
	creatorKeyId: string;
	creatorName: string;
	creatorAvatar?: string;
	wallet: string;
	amountPerPurchaseXlm: number;
	amountPerPurchaseStroops: number;
	frequency: DcaFrequency;
	startDate: string;
	endDate?: string | null;
	totalCapXlm?: number | null;
	maxSlippagePercent: number;
	approvedBudgetXlm: number;
	status: DcaPlanStatus;
	nextRunTime: string;
	consecutiveFailures: number;
	totalInvestedXlm: number;
	totalQuantityBought: number;
	averagePriceXlm: number;
	runs: DcaExecutionRun[];
	createdAt: string;
	updatedAt: string;
}

export interface CreateDcaPlanInput {
	creatorKeyId: string;
	creatorName: string;
	creatorAvatar?: string;
	wallet: string;
	amountPerPurchaseXlm: number;
	frequency: DcaFrequency;
	endDate?: string | null;
	totalCapXlm?: number | null;
	maxSlippagePercent?: number;
	approvedBudgetXlm?: number;
}
