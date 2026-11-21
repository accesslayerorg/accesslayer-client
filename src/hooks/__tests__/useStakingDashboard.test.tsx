import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import {
	useStakeKeysMutation,
	useUnstakeKeysMutation,
	useClaimStakingRewardsMutation,
} from '../useStakingDashboard';
import showToast from '@/utils/toast.util';

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
		message: vi.fn(),
	},
}));

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
			mutations: { retry: false },
		},
	});
	return ({ children }: { children: React.ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe('useStakingDashboard hooks', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('stakes creator keys and triggers success toast', async () => {
		const { result } = renderHook(
			() => useStakeKeysMutation('GAAA1234567890'),
			{ wrapper: createWrapper() }
		);

		await act(async () => {
			await result.current.mutateAsync({
				keyId: 'creator-alpha',
				quantity: 5,
				lockPeriodDays: 90,
			});
		});

		expect(showToast.success).toHaveBeenCalledWith(
			'Keys staked successfully'
		);
	});

	it('unstakes creator keys and triggers success toast', async () => {
		const { result } = renderHook(
			() => useUnstakeKeysMutation('GAAA1234567890'),
			{ wrapper: createWrapper() }
		);

		await act(async () => {
			await result.current.mutateAsync({
				positionId: 'pos-101',
				keyId: 'creator-alpha',
			});
		});

		expect(showToast.success).toHaveBeenCalledWith(
			'Keys unstaked successfully'
		);
	});

	it('claims rewards and triggers success toast', async () => {
		const { result } = renderHook(
			() => useClaimStakingRewardsMutation('GAAA1234567890'),
			{ wrapper: createWrapper() }
		);

		await act(async () => {
			await result.current.mutateAsync({
				positionId: 'pos-102',
				keyId: 'creator-beta',
			});
		});

		expect(showToast.success).toHaveBeenCalledWith(
			'Staking rewards claimed'
		);
	});
});
