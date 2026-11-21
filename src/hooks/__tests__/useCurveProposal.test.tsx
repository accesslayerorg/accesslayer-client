import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useCurveProposal } from '../useCurveProposal';
import { curveContractService } from '@/services/curveContract.service';
import showToast from '@/utils/toast.util';

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
		curveUpdateProposed: vi.fn(),
	},
}));

function createWrapper() {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: { retry: false },
		},
	});
	return ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}

describe('useCurveProposal', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		curveContractService.clearProposal('creator-1');
		curveContractService.setCurveParams('creator-1', {
			slope: 0.002,
			intercept: 1.5,
		});
	});

	it('loads current curve params and pending proposal state', async () => {
		const { result } = renderHook(() => useCurveProposal('creator-1'), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		expect(result.current.currentParams.slope).toBe(0.002);
		expect(result.current.currentParams.intercept).toBe(1.5);
		expect(result.current.pendingProposal).toBeNull();
		expect(result.current.hasActiveProposal).toBe(false);
	});

	it('submits proposeCurveUpdate, updates state, and fires CurveUpdateProposed toast', async () => {
		const { result } = renderHook(() => useCurveProposal('creator-1'), {
			wrapper: createWrapper(),
		});

		await waitFor(() => expect(result.current.isLoading).toBe(false));

		await act(async () => {
			await result.current.proposeCurveUpdate({
				slope: 0.004,
				intercept: 2.0,
			});
		});

		expect(showToast.curveUpdateProposed).toHaveBeenCalled();
		await waitFor(() => {
			expect(result.current.pendingProposal).not.toBeNull();
			expect(result.current.pendingProposal?.proposedSlope).toBe(0.004);
			expect(result.current.hasActiveProposal).toBe(true);
		});
	});

	it('submits cancelCurveUpdate and clears pending proposal', async () => {
		await curveContractService.propose_curve_update('creator-1', 0.004, 2.0);

		const { result } = renderHook(() => useCurveProposal('creator-1'), {
			wrapper: createWrapper(),
		});

		await waitFor(() =>
			expect(result.current.pendingProposal).not.toBeNull()
		);

		await act(async () => {
			await result.current.cancelCurveUpdate();
		});

		expect(showToast.success).toHaveBeenCalledWith(
			'Curve update proposal cancelled'
		);
		await waitFor(() => {
			expect(result.current.pendingProposal).toBeNull();
			expect(result.current.hasActiveProposal).toBe(false);
		});
	});
});
