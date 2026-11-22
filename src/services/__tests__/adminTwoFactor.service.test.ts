import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockPost } = vi.hoisted(() => ({ mockPost: vi.fn() }));

vi.mock('axios', () => ({
	default: {
		create: vi.fn(() => ({
			post: mockPost,
			get: vi.fn(),
			delete: vi.fn(),
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

import { adminTwoFactorService } from '../adminTwoFactor.service';

describe('adminTwoFactorService', () => {
	beforeEach(() => mockPost.mockReset());

	it('calls setup, verify, login, and challenge endpoints', async () => {
		mockPost
			.mockResolvedValueOnce({ data: { data: { secret: 'ABC', otpauthUrl: 'otpauth://test' } } })
			.mockResolvedValueOnce({ data: { data: { enabled: true, recoveryCodes: ['one'] } } })
			.mockResolvedValueOnce({ data: { data: { status: 'pending_2fa' } } })
			.mockResolvedValueOnce({ data: { data: { enabled: true, status: 'active' } } });

		await adminTwoFactorService.setup();
		await adminTwoFactorService.verify({ code: '123456' });
		await adminTwoFactorService.login({ email: 'admin@example.com', password: 'secret' });
		await adminTwoFactorService.challenge({ code: '123456' });

		expect(mockPost.mock.calls).toEqual([
			['/admin/2fa/setup'],
			['/admin/2fa/verify', { code: '123456' }],
			['/auth/admin/login', { email: 'admin@example.com', password: 'secret' }],
			['/admin/2fa/login', { code: '123456' }],
		]);
	});
});
