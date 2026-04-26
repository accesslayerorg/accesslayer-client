import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ApiError } from '../api.service';

// Hoist mock values so they are available inside vi.mock factory (which is
// hoisted above imports by vitest).
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

import { courseService } from '../course.service';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fakeApiError(status: number, message: string) {
	return {
		isAxiosError: true as const,
		response: { status, data: { success: false, message } },
		config: {},
		message,
	};
}

function fakeNetworkError() {
	return {
		isAxiosError: true as const,
		request: {},
		response: undefined,
		config: {},
		message: 'Network Error',
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('courseService.getCourse – invalid creator detail reads', () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	it('throws ApiError(404) for a non-existent creator id', async () => {
		mockGet.mockRejectedValueOnce(fakeApiError(404, 'Creator not found'));

		const err = await courseService
			.getCourse('nonexistent-id')
			.catch((e: unknown) => e);

		expect(err).toBeInstanceOf(ApiError);
		expect((err as ApiError).status).toBe(404);
	});

	it('throws ApiError(400) for an empty creator id', async () => {
		mockGet.mockRejectedValueOnce(fakeApiError(400, 'Invalid creator ID'));

		const err = await courseService.getCourse('').catch((e: unknown) => e);

		expect(err).toBeInstanceOf(ApiError);
		expect((err as ApiError).status).toBe(400);
	});

	it('throws ApiError(status=0) on network failure', async () => {
		mockGet.mockRejectedValueOnce(fakeNetworkError());

		const err = await courseService
			.getCourse('any-id')
			.catch((e: unknown) => e);

		expect(err).toBeInstanceOf(ApiError);
		expect((err as ApiError).status).toBe(0);
		expect((err as ApiError).message).toBe(
			'Network error - check your connection'
		);
	});

	it('throws ApiError(500) on unexpected server error', async () => {
		mockGet.mockRejectedValueOnce(fakeApiError(500, 'Internal server error'));

		const err = await courseService
			.getCourse('any-id')
			.catch((e: unknown) => e);

		expect(err).toBeInstanceOf(ApiError);
		expect((err as ApiError).status).toBe(500);
	});
});
