/**
 * Key subscription investment types for recurring automatic investments
 */

export type SubscriptionInterval = 'daily' | 'weekly' | 'monthly';

export interface KeySubscription {
	id: string;
	creatorId: string;
	investorAddress: string;
	amountXlm: number;
	interval: SubscriptionInterval;
	intervalSeconds: number;
	nextExecutionAt: string;
	totalInvestedXlm: number;
	status: 'active' | 'cancelled' | 'paused';
	createdAt: string;
	updatedAt: string;
}

export interface CreateSubscriptionInput {
	creatorId: string;
	amountXlm: number;
	interval: SubscriptionInterval;
}

export interface CancelSubscriptionInput {
	subscriptionId: string;
}

export interface SubscriptionExecutionPreview {
	nextExecutionDate: Date;
	estimatedCostXlm: number;
}

export const SUBSCRIPTION_INTERVAL_SECONDS: Record<SubscriptionInterval, number> = {
	daily: 86400,
	weekly: 604800,
	monthly: 2592000,
};

export const SUBSCRIPTION_INTERVAL_LABELS: Record<SubscriptionInterval, string> = {
	daily: 'Daily',
	weekly: 'Weekly',
	monthly: 'Monthly',
};