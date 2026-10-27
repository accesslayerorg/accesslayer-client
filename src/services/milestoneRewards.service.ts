import { BaseApiService, type APIResponse } from './api.service';

/** Holding-duration thresholds, in days, that unlock a milestone reward. */
export const MILESTONE_THRESHOLDS_DAYS = [30, 90, 180, 365] as const;
export type MilestoneThresholdDays = (typeof MILESTONE_THRESHOLDS_DAYS)[number];

/** One loyalty milestone for a held key. */
export interface MilestoneReward {
	/** Index of this milestone within the key's milestone schedule (0-based). */
	milestoneIndex: number;
	/** Holding-duration threshold in days, e.g. 30, 90, 180, 365. */
	thresholdDays: MilestoneThresholdDays;
	/** Whether the reward has already been claimed. */
	claimed: boolean;
	/** Amount received, in stroops, once claimed (undefined until then). */
	receivedAmountStroops?: number;
	/** ISO timestamp the reward was claimed, when applicable. */
	claimedAt?: string;
}

/** Milestone schedule for a single held key. */
export interface KeyMilestoneRewards {
	keyId: string;
	keyTitle?: string;
	/** Days this wallet has continuously held the key. */
	daysHeld: number;
	milestones: MilestoneReward[];
}

interface MilestoneRewardsEnvelope {
	keys: KeyMilestoneRewards[];
}

class MilestoneRewardsService extends BaseApiService {
	/**
	 * Fetches every held key's milestone reward schedule for a wallet from
	 * `GET /wallets/:wallet/milestone-rewards` (#1141).
	 */
	async getMilestoneRewards(wallet: string): Promise<KeyMilestoneRewards[]> {
		try {
			const response = await this.api.get<
				APIResponse<MilestoneRewardsEnvelope | KeyMilestoneRewards[]>
			>(`/wallets/${wallet}/milestone-rewards`);

			const payload = response.data.data;
			if (Array.isArray(payload)) return payload;
			return payload?.keys ?? [];
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const milestoneRewardsService = new MilestoneRewardsService();
