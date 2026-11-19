import { BaseApiService, type APIResponse } from './api.service';
import type {
	AutoInvestRule,
	AutoInvestHistory,
	AutoInvestSettings,
} from '@/types/autoInvest';

export class AutoInvestService extends BaseApiService {
	/**
	 * Get all auto-invest rules for the current user
	 */
	async getRules(): Promise<AutoInvestRule[]> {
		try {
			const response =
				await this.api.get<APIResponse<AutoInvestRule[]>>(
					'/auto-invest/rules'
				);
			return response.data?.data || [];
		} catch (error) {
			this.handleError(error);
			return [];
		}
	}

	/**
	 * Create a new auto-invest rule
	 */
	async createRule(
		rule: Omit<AutoInvestRule, 'id' | 'createdAt' | 'updatedAt'>
	) {
		try {
			const response = await this.api.post<APIResponse<AutoInvestRule>>(
				'/auto-invest/rules',
				rule
			);
			return response.data?.data;
		} catch (error) {
			this.handleError(error);
			throw error;
		}
	}

	/**
	 * Update an auto-invest rule
	 */
	async updateRule(ruleId: string, updates: Partial<AutoInvestRule>) {
		try {
			const response = await this.api.put<APIResponse<AutoInvestRule>>(
				`/auto-invest/rules/${ruleId}`,
				updates
			);
			return response.data?.data;
		} catch (error) {
			this.handleError(error);
			throw error;
		}
	}

	/**
	 * Delete an auto-invest rule
	 */
	async deleteRule(ruleId: string) {
		try {
			await this.api.delete(`/auto-invest/rules/${ruleId}`);
		} catch (error) {
			this.handleError(error);
			throw error;
		}
	}

	/**
	 * Toggle rule enabled/disabled status
	 */
	async toggleRule(ruleId: string, enabled: boolean) {
		try {
			const response = await this.api.patch<APIResponse<AutoInvestRule>>(
				`/auto-invest/rules/${ruleId}`,
				{ enabled }
			);
			return response.data?.data;
		} catch (error) {
			this.handleError(error);
			throw error;
		}
	}

	/**
	 * Get auto-invest history
	 */
	async getHistory(
		limit: number = 50,
		offset: number = 0
	): Promise<AutoInvestHistory[]> {
		try {
			const response = await this.api.get<APIResponse<AutoInvestHistory[]>>(
				`/auto-invest/history?limit=${limit}&offset=${offset}`
			);
			return response.data?.data || [];
		} catch (error) {
			this.handleError(error);
			return [];
		}
	}

	/**
	 * Get auto-invest settings
	 */
	async getSettings(): Promise<AutoInvestSettings> {
		try {
			const response = await this.api.get<APIResponse<AutoInvestSettings>>(
				'/auto-invest/settings'
			);
			return (
				response.data?.data || {
					balanceThreshold: 0,
					paused: false,
				}
			);
		} catch (error) {
			this.handleError(error);
			return {
				balanceThreshold: 0,
				paused: false,
			};
		}
	}

	/**
	 * Update auto-invest settings
	 */
	async updateSettings(settings: Partial<AutoInvestSettings>) {
		try {
			const response = await this.api.put<APIResponse<AutoInvestSettings>>(
				'/auto-invest/settings',
				settings
			);
			return response.data?.data;
		} catch (error) {
			this.handleError(error);
			throw error;
		}
	}
}

export const autoInvestService = new AutoInvestService();
