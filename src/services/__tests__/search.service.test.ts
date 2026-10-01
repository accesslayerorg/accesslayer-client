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

import { searchService } from '../search.service';

describe('searchService', () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	it('returns empty results when query is whitespace without calling API', async () => {
		const result = await searchService.search('   ');
		expect(result).toEqual({ keys: [], creators: [], proposals: [] });
		expect(mockGet).not.toHaveBeenCalled();
	});

	it('fetches search results from /search endpoint', async () => {
		const mockData = {
			keys: [
				{ id: 'k1', title: 'Key One', priceStroops: 10000000 },
			],
			creators: [
				{ id: 'c1', name: 'Creator One', socialHandle: 'c_one' },
			],
			proposals: [
				{ id: 'p1', title: 'Proposal One', status: 'active' as const },
			],
		};

		mockGet.mockResolvedValueOnce({
			data: { success: true, data: mockData },
		});

		const result = await searchService.search('One');
		expect(mockGet).toHaveBeenCalledWith('/search', { params: { q: 'One' } });
		expect(result.keys).toHaveLength(1);
		expect(result.creators).toHaveLength(1);
		expect(result.proposals).toHaveLength(1);
	});

	it('handles results wrapped in nested results object', async () => {
		const mockData = {
			results: {
				keys: [{ id: 'k1', title: 'Key One' }],
				creators: [],
				proposals: [],
			},
		};

		mockGet.mockResolvedValueOnce({
			data: { success: true, data: mockData },
		});

		const result = await searchService.search('Key');
		expect(result.keys).toHaveLength(1);
		expect(result.creators).toHaveLength(0);
	});

	it('handles server errors and wraps in ApiError', async () => {
		mockGet.mockRejectedValueOnce({
			isAxiosError: true,
			response: { status: 500, data: { success: false, message: 'Server error' } },
			message: 'Server error',
		});

		await expect(searchService.search('Test')).rejects.toThrow(ApiError);
	});
});
