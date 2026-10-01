import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ApiError } from '../api.service';

const { mockGet, mockPost, mockDelete } = vi.hoisted(() => ({
	mockGet: vi.fn(),
	mockPost: vi.fn(),
	mockDelete: vi.fn(),
}));

vi.mock('axios', () => ({
	default: {
		create: vi.fn(() => ({
			get: mockGet,
			post: mockPost,
			delete: mockDelete,
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

import {
	adminService,
	createOracleCaller,
	deleteOracleCaller,
} from '../admin.service';

const CALLER_A = 'CAAACAQDAQCQMBYIBEFAWDANBYHRAEISCMKBKFQXDAMRUGY4DUPB7DRX';
const CALLER_B = 'CD7757P47P5PT6HX6327J47S6HYO73XN5TV6V2PI47TOLZHD4LQ6ACUD';

function fakeApiResponse<T>(data: T) {
	return {
		data: { success: true, data, message: 'ok' },
	};
}

function fakeApiError(status: number, message: string) {
	return {
		isAxiosError: true as const,
		response: { status, data: { success: false, message } },
		config: {},
		message,
	};
}

describe('adminService oracle callers (#829)', () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockPost.mockReset();
		mockDelete.mockReset();
	});

	describe('getOracleCallers', () => {
		it('returns caller objects from an array of { address } entries', async () => {
			mockGet.mockResolvedValueOnce(
				fakeApiResponse([
					{ address: CALLER_A, addedAt: '2026-08-28T00:00:00Z' },
					{ address: CALLER_B },
				])
			);

			const callers = await adminService.getOracleCallers();

			expect(callers).toEqual([
				{ address: CALLER_A, addedAt: '2026-08-28T00:00:00Z' },
				{ address: CALLER_B },
			]);
			expect(mockGet).toHaveBeenCalledWith('/admin/oracle/callers');
		});

		it('normalizes plain-string caller arrays', async () => {
			mockGet.mockResolvedValueOnce(fakeApiResponse([CALLER_A, CALLER_B]));

			const callers = await adminService.getOracleCallers();

			expect(callers).toEqual([
				{ address: CALLER_A },
				{ address: CALLER_B },
			]);
		});

		it('reads callers nested under a callers envelope', async () => {
			mockGet.mockResolvedValueOnce(
				fakeApiResponse({ callers: [{ address: CALLER_A }] })
			);

			const callers = await adminService.getOracleCallers();

			expect(callers).toEqual([{ address: CALLER_A }]);
		});

		it('filters out invalid entries and returns an empty list for an empty payload', async () => {
			mockGet.mockResolvedValueOnce(
				fakeApiResponse([null, { noKey: true }])
			);

			const callers = await adminService.getOracleCallers();

			expect(callers).toEqual([]);
		});

		it('throws ApiError(401) when authorization is rejected', async () => {
			mockGet.mockRejectedValueOnce(fakeApiError(401, 'Not authorized'));

			const err = await adminService
				.getOracleCallers()
				.catch((e: unknown) => e);

			expect(err).toBeInstanceOf(ApiError);
			expect((err as ApiError).status).toBe(401);
		});
	});

	describe('addOracleCaller', () => {
		it('POSTs the contract address to /admin/oracle/callers', async () => {
			mockPost.mockResolvedValueOnce(fakeApiResponse({ address: CALLER_A }));

			const caller = await createOracleCaller(CALLER_A);

			expect(mockPost).toHaveBeenCalledWith('/admin/oracle/callers', {
				address: CALLER_A,
			});
			expect(caller).toEqual({ address: CALLER_A });
		});

		it('falls back to the submitted address when the response has no body data', async () => {
			mockPost.mockResolvedValueOnce(fakeApiResponse(null));

			const caller = await createOracleCaller(CALLER_A);

			expect(caller).toEqual({ address: CALLER_A });
		});

		it('throws ApiError(400) when the server rejects the address', async () => {
			mockPost.mockRejectedValueOnce(
				fakeApiError(400, 'Invalid contract address')
			);

			const err = await createOracleCaller(CALLER_A).catch(
				(e: unknown) => e
			);

			expect(err).toBeInstanceOf(ApiError);
			expect((err as ApiError).status).toBe(400);
		});
	});

	describe('removeOracleCaller', () => {
		it('DELETEs the caller address with the address in the path', async () => {
			mockDelete.mockResolvedValueOnce(fakeApiResponse(null));

			await deleteOracleCaller(CALLER_A);

			expect(mockDelete).toHaveBeenCalledWith(
				`/admin/oracle/callers/${encodeURIComponent(CALLER_A)}`
			);
		});

		it('throws ApiError(404) when the caller is already removed', async () => {
			mockDelete.mockRejectedValueOnce(
				fakeApiError(404, 'Caller not found')
			);

			const err = await deleteOracleCaller(CALLER_B).catch(
				(e: unknown) => e
			);

			expect(err).toBeInstanceOf(ApiError);
			expect((err as ApiError).status).toBe(404);
		});
	});
});

describe('adminService timelock actions (#1014)', () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockPost.mockReset();
	});

	it('normalizes pending action data and preserves full params', async () => {
		const params = {
			target: CALLER_A,
			value: '250',
			nested: { enabled: true },
		};
		mockGet.mockResolvedValueOnce(
			fakeApiResponse([
				{
					id: 'action-1',
					type: 'set-oracle',
					params,
					eta: 1_798_560_000,
					status: 'pending',
					cancellable: true,
					cancellationDeadline: '2026-09-30T12:00:00Z',
				},
				null,
				{ id: 'invalid-row' },
			])
		);

		const actions = await adminService.getPendingTimelockActions();

		expect(actions).toEqual([
			{
				id: 'action-1',
				type: 'set-oracle',
				params,
				eta: new Date(1_798_560_000 * 1000).toISOString(),
				status: 'pending',
				queuedAt: undefined,
				executedAt: undefined,
				cancelledAt: undefined,
				cancellable: true,
				cancellationDeadline: '2026-09-30T12:00:00Z',
			},
		]);
		expect(mockGet).toHaveBeenCalledWith('/admin/timelock/actions/pending');
	});

	it('loads executed and cancelled history from the history endpoint', async () => {
		mockGet.mockResolvedValueOnce(
			fakeApiResponse({
				actions: [
					{
						id: 'done-1',
						type: 'set-fee',
						params: { fee: 25 },
						eta: '2026-09-28T10:00:00Z',
						status: 'executed',
						executedAt: '2026-09-28T10:01:00Z',
					},
					{
						id: 'done-2',
						type: 'set-fee',
						params: { fee: 30 },
						eta: '2026-09-28T11:00:00Z',
						status: 'cancelled',
						cancelledAt: '2026-09-28T10:30:00Z',
					},
				],
			})
		);

		const history = await adminService.getTimelockHistory();

		expect(history.map(action => action.status)).toEqual([
			'executed',
			'cancelled',
		]);
		expect(mockGet).toHaveBeenCalledWith('/admin/timelock/actions/history');
	});

	it('posts cancellation for the encoded action id', async () => {
		mockPost.mockResolvedValueOnce(fakeApiResponse(null));

		await adminService.cancelTimelockAction('action / one');

		expect(mockPost).toHaveBeenCalledWith(
			'/admin/timelock/actions/action%20%2F%20one/cancel'
		);
	});
});

describe('adminService treasury', () => {
	beforeEach(() => {
		mockGet.mockReset();
		mockPost.mockReset();
	});

	it('loads the exact treasury balance and fee/distribution records', async () => {
		const treasury = { accumulatedFeesStroops: '123456789', updatedAt: '2026-09-30T10:00:00Z' };
		const distributions = [{
			id: 'dist-1', epoch: 4, totalDistributedStroops: '10000000',
			recipients: [{ address: CALLER_A, amountStroops: '10000000' }],
			distributedAt: '2026-09-30T10:00:00Z', transactionHash: 'tx-confirmed',
		}];
		const feeEvents = [{
			id: 'fee-1', creatorAddress: CALLER_A, traderAddress: CALLER_B,
			amountStroops: '250000', collectedAt: '2026-09-30T09:00:00Z', transactionHash: 'tx-fee',
		}];
		mockGet
			.mockResolvedValueOnce(fakeApiResponse(treasury))
			.mockResolvedValueOnce(fakeApiResponse(distributions))
			.mockResolvedValueOnce(fakeApiResponse(feeEvents));

		expect(await adminService.getTreasuryBalance()).toEqual(treasury);
		expect(await adminService.getTreasuryDistributions()).toEqual(distributions);
		expect(await adminService.getTreasuryFeeEvents()).toEqual(feeEvents);
		expect(mockGet.mock.calls.map(([url]) => url)).toEqual([
			'/admin/treasury',
			'/admin/treasury/distributions',
			'/admin/treasury/fees',
		]);
	});

	it('submits recipient allocations and requires a confirmed on-chain hash', async () => {
		const input = {
			admin: CALLER_A,
			totalAmountStroops: '10000000',
			recipients: [{ address: CALLER_B, amountStroops: '10000000' }],
		};
		const result = { epoch: 5, transactionHash: 'confirmed-hash' };
		mockPost.mockResolvedValueOnce(fakeApiResponse(result));

		expect(await adminService.distributeTreasuryFees(input)).toEqual(result);
		expect(mockPost).toHaveBeenCalledWith('/admin/treasury/distributions', input);
	});

	it('rejects a distribution response without a transaction confirmation', async () => {
		mockPost.mockResolvedValueOnce(fakeApiResponse({ epoch: 5 }));

		await expect(adminService.distributeTreasuryFees({
			admin: CALLER_A,
			totalAmountStroops: '10000000',
			recipients: [{ address: CALLER_B, amountStroops: '10000000' }],
		})).rejects.toMatchObject({ status: 502 });
	});
});
