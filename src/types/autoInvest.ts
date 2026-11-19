/**
 * Auto-invest rules configuration types
 */

export interface AutoInvestRule {
	id: string;
	name: string;
	enabled: boolean;
	category?: string;
	minRating?: number;
	maxPrice: number;
	minUniqueTradersVolumeXlm?: number;
	maxPerKey: number;
	createdAt: string;
	updatedAt: string;
}

export interface AutoInvestHistory {
	id: string;
	ruleId: string;
	ruleName: string;
	creatorKeyId: string;
	creatorKeyTitle: string;
	amountXlm: number;
	executedAt: string;
	status: 'success' | 'failed' | 'pending';
	errorMessage?: string;
}

export interface AutoInvestSettings {
	balanceThreshold: number; // Minimum balance in XLM to maintain
	paused: boolean;
}

export interface AutoInvestExecutionResult {
	success: boolean;
	ruleId: string;
	ruleName: string;
	creatorKeyId: string;
	amountXlm: number;
	message: string;
}
