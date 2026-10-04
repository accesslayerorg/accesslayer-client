import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockGet } = vi.hoisted(() => ({ mockGet: vi.fn() }));

vi.mock('axios', () => ({
	default: {
		create: vi.fn(() => ({
			get: mockGet,
			interceptors: {
				request: { use: vi.fn() },
				response: { use: vi.fn() },
			},
		})),
		isAxiosError: (error: unknown): boolean =>
			error !== null &&
			typeof error === 'object' &&
			(error as Record<string, unknown>).isAxiosError === true,
	},
}));

import {
	governanceService,
	PROPOSAL_VOTES_PAGE_SIZE,
} from '@/services/governance.service';

function fakeApiResponse<T>(data: T) {
	return { data: { success: true, data, message: 'ok' } };
}

describe('governanceService.getProposalVotes', () => {
	beforeEach(() => {
		mockGet.mockReset();
	});

	it('requests the first vote page with the default page size', async () => {
		const page = {
			votes: [
				{
					id: 'vote-1',
					voter: '0xabc',
					direction: 'for' as const,
					weight: 10,
					timestamp: '2026-09-20T12:00:00.000Z',
				},
			],
			nextCursor: 'cursor-2',
		};
		mockGet.mockResolvedValueOnce(fakeApiResponse(page));

		await expect(
			governanceService.getProposalVotes('proposal-page-1')
		).resolves.toEqual(page);
		expect(mockGet).toHaveBeenCalledWith(
			'/governance/proposals/proposal-page-1/votes',
			{ params: { limit: PROPOSAL_VOTES_PAGE_SIZE } }
		);
	});

	it('forwards the next cursor for additional pages', async () => {
		const page = { votes: [], nextCursor: null };
		mockGet.mockResolvedValueOnce(fakeApiResponse(page));

		await governanceService.getProposalVotes(
			'proposal-page-2',
			'cursor-2',
			10
		);

		expect(mockGet).toHaveBeenCalledWith(
			'/governance/proposals/proposal-page-2/votes',
			{ params: { cursor: 'cursor-2', limit: 10 } }
		);
	});
});
