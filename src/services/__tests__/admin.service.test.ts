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
