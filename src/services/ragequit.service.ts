import { BaseApiService } from './api.service';
import type { RagequitState } from '@/types/ragequit';

class RagequitService extends BaseApiService {
	private overrides: Map<string, Partial<RagequitState>> = new Map();

	async getRagequitState(
		proposalId: string,
		_userAddress?: string
	): Promise<RagequitState> {
		const override = this.overrides.get(proposalId);

		const now = Date.now();
		const defaultEnd = now + 2 * 3600 * 1000; // 2 hours from now
		const totalReserveXlm = 50000;
		const totalCirculatingKeys = 10000;
		const payoutPerKeyXlm = totalReserveXlm / totalCirculatingKeys; // 5.0 XLM per key
		const userKeys = 50;

		const base: RagequitState = {
			proposalId,
			isOpen: true,
			windowEndsAt: new Date(defaultEnd).toISOString(),
			remainingSeconds: Math.max(0, Math.floor((defaultEnd - now) / 1000)),
			totalReserveXlm,
			totalCirculatingKeys,
			cumulativeExits: 500,
			exitCap: 2000,
			isExecuted: false,
			executedProposalId: proposalId,
			isEligible: true,
			userKeys,
			userVoteDirection: 'against',
			payoutPerKeyXlm,
			estimatedPayoutXlm: userKeys * payoutPerKeyXlm, // 250 XLM
		};

		if (override) {
			const merged = { ...base, ...override };
			const endMs = new Date(merged.windowEndsAt).getTime();
			const remaining = Math.max(0, Math.floor((endMs - Date.now()) / 1000));
			merged.remainingSeconds = remaining;

			if (remaining <= 0) {
				merged.isOpen = false;
			}

			// Validate eligibility constraints
			if (!merged.isOpen) {
				merged.isEligible = false;
				merged.ineligibilityReason =
					merged.ineligibilityReason || 'The ragequit window for this proposal has closed.';
			} else if (merged.userVoteDirection === 'for') {
				merged.isEligible = false;
				merged.ineligibilityReason =
					'You voted in favor of this proposal and are not eligible to ragequit.';
				merged.estimatedPayoutXlm = 0;
			} else if (merged.userKeys <= 0) {
				merged.isEligible = false;
				merged.ineligibilityReason =
					'You hold 0 keys for this creator and have no reserve share to claim.';
				merged.estimatedPayoutXlm = 0;
			} else if (merged.cumulativeExits >= merged.exitCap) {
				merged.isEligible = false;
				merged.ineligibilityReason = `Cumulative exits have reached the cap of ${merged.exitCap.toLocaleString()} keys.`;
			}

			return structuredClone(merged);
		}

		return structuredClone(base);
	}

	async executeRagequit(
		proposalId: string,
		keysToBurn: number,
		_userAddress?: string
	): Promise<{ txHash: string; payoutXlm: number }> {
		const state = await this.getRagequitState(proposalId);
		if (!state.isOpen) {
			throw new Error('Ragequit window is closed');
		}
		if (!state.isEligible) {
			throw new Error(state.ineligibilityReason || 'Ineligible to ragequit');
		}
		if (keysToBurn <= 0 || keysToBurn > state.userKeys) {
			throw new Error(`Invalid keys to burn (${keysToBurn})`);
		}
		if (state.cumulativeExits + keysToBurn > state.exitCap) {
			throw new Error('Exits would exceed the exit cap');
		}

		const payoutXlm = keysToBurn * state.payoutPerKeyXlm;
		const updatedState: Partial<RagequitState> = {
			userKeys: state.userKeys - keysToBurn,
			cumulativeExits: state.cumulativeExits + keysToBurn,
			estimatedPayoutXlm: (state.userKeys - keysToBurn) * state.payoutPerKeyXlm,
		};
		this.setMockRagequitState(proposalId, updatedState);

		return {
			txHash: `0x${Math.random().toString(16).slice(2)}`,
			payoutXlm,
		};
	}

	setMockRagequitState(proposalId: string, state: Partial<RagequitState>) {
		const existing = this.overrides.get(proposalId) || {};
		this.overrides.set(proposalId, { ...existing, ...state });
	}

	reset() {
		this.overrides.clear();
	}
}

export const ragequitService = new RagequitService();
