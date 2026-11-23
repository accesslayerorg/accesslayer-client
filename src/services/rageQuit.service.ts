import { BaseApiService, type APIResponse } from './api.service';
import type { RageQuitStatus } from '@/types/governance';

export interface RageQuitResult {
	txHash: string | null;
	amountPaid: number;
	keysBurned: number;
}

function asRecord(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function normalizeRageQuitStatus(raw: unknown): RageQuitStatus {
	const r = asRecord(raw);
	return {
		proposalId: String(r.proposalId ?? r.proposal_id ?? ''),
		isOpen: Boolean(r.isOpen ?? r.is_open ?? false),
		windowEndsAt:
			typeof r.windowEndsAt === 'string'
				? r.windowEndsAt
				: typeof r.window_ends_at === 'string'
					? r.window_ends_at
					: null,
		exitedFraction: Number(r.exitedFraction ?? r.exited_fraction ?? 0),
		maxExitFraction: Number(r.maxExitFraction ?? r.max_exit_fraction ?? 0),
		eligibility:
			(r.eligibility as RageQuitStatus['eligibility']) ?? 'unknown',
		payoutPerKey:
			r.payoutPerKey !== undefined
				? Number(r.payoutPerKey)
				: r.payout_per_key !== undefined
					? Number(r.payout_per_key)
					: null,
	};
}

class RageQuitService extends BaseApiService {
	/**
	 * Fetch rage-quit window state for a proposal.
	 * GET /governance/proposals/:id/ragequit?wallet=:wallet
	 */
	async getRageQuitStatus(
		proposalId: string,
		wallet: string
	): Promise<RageQuitStatus> {
		try {
			const response = await this.api.get<APIResponse<unknown>>(
				`/governance/proposals/${encodeURIComponent(proposalId)}/ragequit`,
				{ params: { wallet } }
			);
			return normalizeRageQuitStatus(response.data.data);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Submit a rage-quit transaction.
	 * POST /governance/proposals/:id/ragequit
	 *
	 * The backend assembles the Stellar transaction; the client signs and
	 * broadcasts it, then posts the signed XDR back to record the exit.
	 */
	async submitRageQuit(
		proposalId: string,
		wallet: string,
		amount: number
	): Promise<RageQuitResult> {
		try {
			const response = await this.api.post<APIResponse<RageQuitResult>>(
				`/governance/proposals/${encodeURIComponent(proposalId)}/ragequit`,
				{ wallet, amount }
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const rageQuitService = new RageQuitService();
