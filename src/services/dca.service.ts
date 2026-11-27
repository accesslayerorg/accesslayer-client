import { BaseApiService } from './api.service';
import type { CreateDcaPlanInput, DcaExecutionRun, DcaPlan } from '@/types/dca.types';
import {
	calculateApprovedBudget,
	calculateNextRunTime,
	recalculatePlanStats,
	checkConsecutiveFailureAutoPause,
} from '@/utils/dca.utils';
import { STROOPS_PER_XLM } from '@/constants/stellar';

const STORAGE_KEY = 'accesslayer_dca_plans';

const MOCK_INITIAL_PLANS: DcaPlan[] = [
	{
		id: 'dca-plan-1',
		creatorKeyId: 'alice-key',
		creatorName: 'Alice Stellar',
		creatorAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop',
		wallet: 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI',
		amountPerPurchaseXlm: 25,
		amountPerPurchaseStroops: 25 * STROOPS_PER_XLM,
		frequency: 'daily',
		startDate: new Date(Date.now() - 7 * 86400000).toISOString(),
		endDate: null,
		totalCapXlm: 500,
		maxSlippagePercent: 1.0,
		approvedBudgetXlm: 500,
		status: 'active',
		nextRunTime: calculateNextRunTime('daily'),
		consecutiveFailures: 0,
		totalInvestedXlm: 150,
		totalQuantityBought: 12,
		averagePriceXlm: 12.5,
		runs: [
			{
				id: 'run-1',
				planId: 'dca-plan-1',
				timestamp: new Date(Date.now() - 6 * 86400000).toISOString(),
				status: 'success',
				priceXlm: 12.0,
				priceStroops: 12 * STROOPS_PER_XLM,
				quantity: 2,
				spentXlm: 24.0,
				spentStroops: 24 * STROOPS_PER_XLM,
				txHash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
			},
			{
				id: 'run-2',
				planId: 'dca-plan-1',
				timestamp: new Date(Date.now() - 5 * 86400000).toISOString(),
				status: 'success',
				priceXlm: 12.5,
				priceStroops: 12.5 * STROOPS_PER_XLM,
				quantity: 2,
				spentXlm: 25.0,
				spentStroops: 25 * STROOPS_PER_XLM,
				txHash: 'a1b2c3d4e5f60718293a4b5c6d7e8f90123456789abcdef0123456789abcdef0',
			},
			{
				id: 'run-3',
				planId: 'dca-plan-1',
				timestamp: new Date(Date.now() - 4 * 86400000).toISOString(),
				status: 'skipped',
				skipReason: 'Insufficient balance: 14 XLM available, 25 XLM required',
			},
			{
				id: 'run-4',
				planId: 'dca-plan-1',
				timestamp: new Date(Date.now() - 3 * 86400000).toISOString(),
				status: 'success',
				priceXlm: 13.0,
				priceStroops: 13 * STROOPS_PER_XLM,
				quantity: 8,
				spentXlm: 101.0,
				spentStroops: 101 * STROOPS_PER_XLM,
				txHash: '1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
			},
		],
		createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
		updatedAt: new Date().toISOString(),
	},
];

export class DcaService extends BaseApiService {
	private loadStoredPlans(): DcaPlan[] {
		if (typeof window === 'undefined') return MOCK_INITIAL_PLANS;
		try {
			const item = localStorage.getItem(STORAGE_KEY);
			if (!item) {
				localStorage.setItem(STORAGE_KEY, JSON.stringify(MOCK_INITIAL_PLANS));
				return MOCK_INITIAL_PLANS;
			}
			return JSON.parse(item);
		} catch {
			return MOCK_INITIAL_PLANS;
		}
	}

	private savePlans(plans: DcaPlan[]): void {
		if (typeof window === 'undefined') return;
		try {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
		} catch {
			// silent fallback
		}
	}

	async getPlans(wallet?: string): Promise<DcaPlan[]> {
		const plans = this.loadStoredPlans();
		if (!wallet) return plans;
		return plans.filter(p => p.wallet.toLowerCase() === wallet.toLowerCase());
	}

	async createPlan(input: CreateDcaPlanInput): Promise<DcaPlan> {
		const { approvedBudgetXlm } = calculateApprovedBudget({
			amountPerPurchaseXlm: input.amountPerPurchaseXlm,
			frequency: input.frequency,
			endDate: input.endDate,
			totalCapXlm: input.totalCapXlm,
		});

		const newPlan: DcaPlan = {
			id: `dca-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
			creatorKeyId: input.creatorKeyId,
			creatorName: input.creatorName,
			creatorAvatar: input.creatorAvatar,
			wallet: input.wallet,
			amountPerPurchaseXlm: input.amountPerPurchaseXlm,
			amountPerPurchaseStroops: Math.round(input.amountPerPurchaseXlm * STROOPS_PER_XLM),
			frequency: input.frequency,
			startDate: new Date().toISOString(),
			endDate: input.endDate ?? null,
			totalCapXlm: input.totalCapXlm ?? null,
			maxSlippagePercent: input.maxSlippagePercent ?? 1.0,
			approvedBudgetXlm: input.approvedBudgetXlm ?? approvedBudgetXlm,
			status: 'active',
			nextRunTime: calculateNextRunTime(input.frequency),
			consecutiveFailures: 0,
			totalInvestedXlm: 0,
			totalQuantityBought: 0,
			averagePriceXlm: 0,
			runs: [],
			createdAt: new Date().toISOString(),
			updatedAt: new Date().toISOString(),
		};

		const plans = this.loadStoredPlans();
		const updated = [newPlan, ...plans];
		this.savePlans(updated);
		return newPlan;
	}

	async pausePlan(planId: string): Promise<DcaPlan> {
		const plans = this.loadStoredPlans();
		const index = plans.findIndex(p => p.id === planId);
		if (index === -1) throw new Error(`Plan ${planId} not found`);

		plans[index] = {
			...plans[index],
			status: 'paused',
			updatedAt: new Date().toISOString(),
		};
		this.savePlans(plans);
		return plans[index];
	}

	async resumePlan(planId: string): Promise<DcaPlan> {
		const plans = this.loadStoredPlans();
		const index = plans.findIndex(p => p.id === planId);
		if (index === -1) throw new Error(`Plan ${planId} not found`);

		plans[index] = {
			...plans[index],
			status: 'active',
			consecutiveFailures: 0, // Reset failures on manual resume
			nextRunTime: calculateNextRunTime(plans[index].frequency),
			updatedAt: new Date().toISOString(),
		};
		this.savePlans(plans);
		return plans[index];
	}

	async cancelPlan(planId: string): Promise<DcaPlan> {
		const plans = this.loadStoredPlans();
		const index = plans.findIndex(p => p.id === planId);
		if (index === -1) throw new Error(`Plan ${planId} not found`);

		plans[index] = {
			...plans[index],
			status: 'cancelled',
			updatedAt: new Date().toISOString(),
		};
		this.savePlans(plans);
		return plans[index];
	}

	async recordExecutionRun(
		planId: string,
		run: Omit<DcaExecutionRun, 'id' | 'planId' | 'timestamp'>
	): Promise<{ plan: DcaPlan; autoPaused: boolean }> {
		const plans = this.loadStoredPlans();
		const index = plans.findIndex(p => p.id === planId);
		if (index === -1) throw new Error(`Plan ${planId} not found`);

		const fullRun: DcaExecutionRun = {
			...run,
			id: `run-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
			planId,
			timestamp: new Date().toISOString(),
		};

		const existingRuns = [...plans[index].runs, fullRun];
		const stats = recalculatePlanStats(existingRuns);

		let autoPaused = false;
		let nextStatus = plans[index].status;

		// Automatically pause after 3 consecutive failures (#1470)
		if (checkConsecutiveFailureAutoPause(stats.consecutiveFailures, 3)) {
			nextStatus = 'paused';
			autoPaused = true;
		}

		plans[index] = {
			...plans[index],
			...stats,
			runs: existingRuns,
			status: nextStatus,
			nextRunTime: nextStatus === 'active' ? calculateNextRunTime(plans[index].frequency) : plans[index].nextRunTime,
			updatedAt: new Date().toISOString(),
		};

		this.savePlans(plans);
		return { plan: plans[index], autoPaused };
	}
}

export const dcaService = new DcaService();
