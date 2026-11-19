import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));

vi.mock('axios', () => ({
	default: {
		create: vi.fn(() => ({
			post: mockPost,
			interceptors: {
				request: { use: vi.fn() },
				response: { use: vi.fn() },
			},
		})),
		isAxiosError: (error: unknown) =>
			error !== null &&
			typeof error === 'object' &&
			(error as Record<string, unknown>).isAxiosError === true,
	},
}));

import { reportKey } from '@/services/moderation.service';

describe('reportKey', () => {
	beforeEach(() => {
		mockPost.mockReset();
	});

	it('posts the key report payload to the key reports endpoint', async () => {
		mockPost.mockResolvedValue({ data: { success: true, data: undefined } });
		const payload = {
			reason: 'scam' as const,
			details: 'Misleading identity',
			reporterAddress: '0x123',
		};

		await reportKey('key/1', payload);

		expect(mockPost).toHaveBeenCalledWith('/keys/key%2F1/reports', payload);
	});

	it('normalizes API errors for the caller', async () => {
		mockPost.mockRejectedValue({
			isAxiosError: true,
			response: {
				status: 429,
				data: { success: false, message: 'Rate limited' },
			},
			message: 'Rate limited',
		});

		await expect(
			reportKey('key-1', {
				reason: 'other',
				details: '',
				reporterAddress: '0x123',
			})
		).rejects.toMatchObject({ status: 429, message: 'Rate limited' });
	});
});
