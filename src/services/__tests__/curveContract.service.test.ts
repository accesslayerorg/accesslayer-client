import { beforeEach, describe, expect, it } from 'vitest';
import {
	CurveContractService,
	propose_curve_update,
	cancel_curve_update,
} from '../curveContract.service';

describe('curveContract.service', () => {
	let service: CurveContractService;

	beforeEach(() => {
		service = new CurveContractService();
	});

	it('returns default curve parameters when none set', () => {
		const params = service.getCurveParams('creator-1');
		expect(params.slope).toBeGreaterThan(0);
		expect(params.intercept).toBeGreaterThan(0);
	});

	it('submits propose_curve_update with positional arguments', async () => {
		const result = await service.propose_curve_update(
			'creator-1',
			0.005,
			2.0
		);
		expect(result.success).toBe(true);
		expect(result.proposal.proposedSlope).toBe(0.005);
		expect(result.proposal.proposedIntercept).toBe(2.0);
		expect(result.proposal.status).toBe('pending');
		expect(result.proposal.timelockDurationHours).toBe(48);
		expect(result.proposal.eta - result.proposal.proposedAt).toBe(
			48 * 60 * 60 * 1000
		);

		const pending = service.getPendingProposal('creator-1');
		expect(pending).not.toBeNull();
		expect(pending?.proposedSlope).toBe(0.005);
	});

	it('submits propose_curve_update with object parameters', async () => {
		const result = await service.propose_curve_update({
			creatorId: 'creator-2',
			slope: 0.008,
			intercept: 1.8,
		});
		expect(result.success).toBe(true);
		expect(result.proposal.creatorId).toBe('creator-2');
		expect(result.proposal.proposedSlope).toBe(0.008);
	});

	it('rejects negative parameters in propose_curve_update', async () => {
		await expect(
			service.propose_curve_update('creator-1', -0.01, 1)
		).rejects.toThrow('Curve parameters cannot be negative');
	});

	it('submits cancel_curve_update and marks proposal cancelled', async () => {
		await service.propose_curve_update('creator-1', 0.005, 2.0);
		expect(service.getPendingProposal('creator-1')).not.toBeNull();

		const cancelResult = await service.cancel_curve_update('creator-1');
		expect(cancelResult.success).toBe(true);
		expect(service.getPendingProposal('creator-1')).toBeNull();
	});

	it('standalone functions invoke the contract service methods correctly', async () => {
		const result = await propose_curve_update('creator-3', 0.003, 1.2);
		expect(result.success).toBe(true);
		expect(result.proposal.creatorId).toBe('creator-3');

		const cancel = await cancel_curve_update('creator-3');
		expect(cancel.success).toBe(true);
	});
});
