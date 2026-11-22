import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../api.service';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('axios', () => ({
	default: {
		create: vi.fn(() => ({
			get: mockGet,
			post: vi.fn(),
			interceptors: {
				request: { use: vi.fn() },
				response: { use: vi.fn() },
			},
		})),
		isAxiosError: (err: unknown): boolean =>
			err !== null &&
			typeof err === 'object' &&
			(err as Record<string, unknown>).isAxiosError === true,
	},
}));

const { submitCreatorContractCall } = vi.hoisted(() => ({
	submitCreatorContractCall: vi.fn(),
}));

vi.mock('@/hooks/useCreatorContractActions', () => ({
	submitCreatorContractCall,
}));

import {
	contentGateService,
	fetchContentGateConfig,
	normalizeContentGateConfig,
	setContentGate,
} from '../contentGate.service';

const KEY_ID = 'key-1';

describe('contentGateService (#1221)', () => {
	beforeEach(() => {
		mockGet.mockReset();
		submitCreatorContractCall.mockReset();
		submitCreatorContractCall.mockResolvedValue({ success: true });
	});

	it('requests the gate config from the key gate endpoint', async () => {
		mockGet.mockResolvedValueOnce({
			data: { success: true, data: { gateType: 'holder' } },
		});

		await fetchContentGateConfig(KEY_ID);

		expect(mockGet).toHaveBeenCalledWith('/keys/key-1/gate');
	});

	it('returns the stored gate configuration', async () => {
		mockGet.mockResolvedValueOnce({
			data: {
				success: true,
				data: { gateType: 'threshold', thresholdAmount: 250 },
			},
		});

		const config = await contentGateService.getGateConfig(KEY_ID);

		expect(config).toEqual({
			gateType: 'threshold',
			thresholdAmount: 250,
		});
	});

	it('treats a missing endpoint as no gate', async () => {
		mockGet.mockRejectedValueOnce({
			isAxiosError: true,
			response: { status: 404, data: { success: false, message: 'Not found' } },
			message: 'Not found',
		});

		await expect(contentGateService.getGateConfig(KEY_ID)).resolves.toEqual({
			gateType: 'none',
			thresholdAmount: null,
		});
	});

	it('handles server errors and wraps them in ApiError', async () => {
		mockGet.mockRejectedValueOnce({
			isAxiosError: true,
			response: { status: 500, data: { success: false, message: 'Server error' } },
			message: 'Server error',
		});

		await expect(contentGateService.getGateConfig(KEY_ID)).rejects.toThrow(
			ApiError
		);
	});
});

describe('setContentGate (#1221)', () => {
	beforeEach(() => {
		submitCreatorContractCall.mockReset();
		submitCreatorContractCall.mockResolvedValue({ success: true });
	});

	it('submits the set_gate contract call with the gate params', async () => {
		await setContentGate(
			KEY_ID,
			{ gateType: 'threshold', thresholdAmount: 250 },
			'0xAAA'
		);

		expect(submitCreatorContractCall).toHaveBeenCalledWith('set_gate', {
			creatorId: KEY_ID,
			gateType: 'threshold',
			thresholdAmount: 250,
			wallet: '0xAAA',
		});
	});

	it('sends a null threshold for the gates that do not use one', async () => {
		await setContentGate(KEY_ID, { gateType: 'none', thresholdAmount: null });

		expect(submitCreatorContractCall).toHaveBeenCalledWith(
			'set_gate',
			expect.objectContaining({ gateType: 'none', thresholdAmount: null })
		);
	});
});

describe('normalizeContentGateConfig (#1221)', () => {
	it('reads the gate type and threshold', () => {
		expect(
			normalizeContentGateConfig({ gateType: 'subscriber' })
		).toEqual({ gateType: 'subscriber', thresholdAmount: null });

		expect(
			normalizeContentGateConfig({
				gateType: 'threshold',
				thresholdAmount: 100,
			})
		).toEqual({ gateType: 'threshold', thresholdAmount: 100 });
	});

	it('accepts the gate type aliases', () => {
		expect(normalizeContentGateConfig({ gateType: 'HOLDER_REQUIRED' }).gateType).toBe(
			'holder'
		);
		expect(normalizeContentGateConfig({ gateType: 'no_gate' }).gateType).toBe(
			'none'
		);
	});

	it('falls back to no gate for an unusable payload', () => {
		expect(normalizeContentGateConfig(null)).toEqual({
			gateType: 'none',
			thresholdAmount: null,
		});
		expect(normalizeContentGateConfig({ gateType: 'mystery' }).gateType).toBe(
			'none'
		);
	});

	it('drops the threshold for the gates that do not use one', () => {
		expect(
			normalizeContentGateConfig({
				gateType: 'holder',
				thresholdAmount: 100,
			})
		).toEqual({ gateType: 'holder', thresholdAmount: null });
	});
});
