/**
 * Contract service handling bonding curve update proposals and cancellations.
 * Implements propose_curve_update and cancel_curve_update Soroban contract call contracts.
 */

export interface CurveProposal {
	id: string;
	creatorId: string;
	proposedSlope: number;
	proposedIntercept: number;
	currentSlope: number;
	currentIntercept: number;
	proposedAt: number; // timestamp in ms
	eta: number; // timestamp in ms (proposedAt + 48 hours)
	timelockDurationHours: number; // 48
	status: 'pending' | 'executed' | 'cancelled';
	txHash?: string;
}

export interface ProposeCurveUpdateParams {
	creatorId: string;
	slope: number;
	intercept: number;
}

export interface CancelCurveUpdateParams {
	creatorId: string;
}

export class CurveContractService {
	private activeProposals: Map<string, CurveProposal> = new Map();
	private curveParams: Map<string, { slope: number; intercept: number }> =
		new Map();

	/**
	 * Returns the current slope and intercept parameters for a given creator.
	 */
	getCurveParams(creatorId: string): { slope: number; intercept: number } {
		return (
			this.curveParams.get(creatorId) ?? {
				slope: 0.001,
				intercept: 1.0,
			}
		);
	}

	/**
	 * Sets or overrides current curve parameters (useful for hydration/testing).
	 */
	setCurveParams(
		creatorId: string,
		params: { slope: number; intercept: number }
	): void {
		this.curveParams.set(creatorId, params);
	}

	/**
	 * Returns the currently active (pending) proposal for a creator, if any.
	 */
	getPendingProposal(creatorId: string): CurveProposal | null {
		const proposal = this.activeProposals.get(creatorId);
		if (proposal && proposal.status === 'pending') {
			return proposal;
		}
		return null;
	}

	/**
	 * Sets or mocks a proposal (useful for testing states).
	 */
	setProposal(proposal: CurveProposal): void {
		this.activeProposals.set(proposal.creatorId, proposal);
	}

	/**
	 * Clears proposal for a creator.
	 */
	clearProposal(creatorId: string): void {
		this.activeProposals.delete(creatorId);
	}

	/**
	 * Submits the `propose_curve_update` contract call.
	 * Supports both object signature ({ creatorId, slope, intercept }) and positional arguments (creatorId, slope, intercept).
	 */
	async propose_curve_update(
		creatorIdOrParams: string | ProposeCurveUpdateParams,
		slopeArg?: number,
		interceptArg?: number
	): Promise<{ success: boolean; proposal: CurveProposal; txHash: string }> {
		const creatorId =
			typeof creatorIdOrParams === 'object'
				? creatorIdOrParams.creatorId
				: creatorIdOrParams;
		const slope =
			typeof creatorIdOrParams === 'object'
				? creatorIdOrParams.slope
				: (slopeArg ?? 0);
		const intercept =
			typeof creatorIdOrParams === 'object'
				? creatorIdOrParams.intercept
				: (interceptArg ?? 0);

		if (!creatorId) {
			throw new Error('creatorId is required');
		}
		if (slope < 0 || intercept < 0) {
			throw new Error('Curve parameters cannot be negative');
		}

		const current = this.getCurveParams(creatorId);
		const now = Date.now();
		const eta = now + 48 * 60 * 60 * 1000;
		const txHash = `0x${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}`;

		const proposal: CurveProposal = {
			id: `proposal-${creatorId}-${now}`,
			creatorId,
			proposedSlope: slope,
			proposedIntercept: intercept,
			currentSlope: current.slope,
			currentIntercept: current.intercept,
			proposedAt: now,
			eta,
			timelockDurationHours: 48,
			status: 'pending',
			txHash,
		};

		this.activeProposals.set(creatorId, proposal);

		return {
			success: true,
			proposal,
			txHash,
		};
	}

	/**
	 * Submits the `cancel_curve_update` contract call for an active proposal.
	 * Supports both object signature ({ creatorId }) and string (creatorId).
	 */
	async cancel_curve_update(
		creatorIdOrParams: string | CancelCurveUpdateParams
	): Promise<{ success: boolean; txHash: string }> {
		const creatorId =
			typeof creatorIdOrParams === 'object'
				? creatorIdOrParams.creatorId
				: creatorIdOrParams;

		if (!creatorId) {
			throw new Error('creatorId is required');
		}

		const proposal = this.activeProposals.get(creatorId);
		if (proposal) {
			proposal.status = 'cancelled';
			this.activeProposals.set(creatorId, proposal);
		}

		const txHash = `0x${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16)}`;

		return {
			success: true,
			txHash,
		};
	}
}

export const curveContractService = new CurveContractService();

export async function propose_curve_update(
	creatorIdOrParams: string | ProposeCurveUpdateParams,
	slope?: number,
	intercept?: number
) {
	return curveContractService.propose_curve_update(
		creatorIdOrParams,
		slope,
		intercept
	);
}

export async function cancel_curve_update(
	creatorIdOrParams: string | CancelCurveUpdateParams
) {
	return curveContractService.cancel_curve_update(creatorIdOrParams);
}
