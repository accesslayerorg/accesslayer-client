import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMultiSigActions } from '@/hooks/useMultiSigActions';
import { queryKeys } from '@/lib/queryKeys';
import type { MultiSigAction } from '@/services/admin.service';
import { adminService } from '@/services/admin.service';

vi.mock('@/services/admin.service', () => ({
	adminService: {
		getPendingMultiSigActions: vi.fn(),
		getMultiSigHistory: vi.fn(),
		signMultiSigAction: vi.fn(),
		executeMultiSigAction: vi.fn(),
	},
}));
vi.mock('@/utils/toast.util', () => ({
	default: { error: vi.fn(), success: vi.fn() },
}));

const action: MultiSigAction = {
	id: 'action-1',
	type: 'governance',
	title: 'Governance action',
	payload: 'governance:action-1',
	createdAt: '2026-09-01T12:00:00.000Z',
	requiredSignatures: 2,
	totalSigners: 3,
	signatures: [
		{ signer: 'admin-1', signature: 'sig-1', signedAt: '2026-09-01T12:01:00.000Z' },
		{ signer: 'admin-2', signature: 'sig-2', signedAt: '2026-09-01T12:02:00.000Z' },
	],
};

function wrapper({ children }: { children: ReactNode }) {
	const client = new QueryClient({
		defaultOptions: { queries: { retry: false } },
	});
	return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe('useMultiSigActions (#928)', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(adminService.getPendingMultiSigActions).mockResolvedValue([action]);
		vi.mocked(adminService.getMultiSigHistory).mockResolvedValue([]);
	});

	it('does not request admin data for a non-admin or disconnected wallet', () => {
		const { result } = renderHook(() => useMultiSigActions(false, 'wallet', true), { wrapper });

		expect(result.current.enabled).toBe(false);
		expect(adminService.getPendingMultiSigActions).not.toHaveBeenCalled();
	});

	it('moves an executed action from pending to timestamped history', async () => {
		const completed = { ...action, executedAt: '2026-09-01T12:05:00.000Z' };
		vi.mocked(adminService.executeMultiSigAction).mockResolvedValue(completed);
		const { result } = renderHook(() => useMultiSigActions(true, 'admin-1', true), { wrapper });

		await waitFor(() => expect(result.current.pending.data).toEqual([action]));
		result.current.execute.mutate(action);

		await waitFor(() => {
			expect(result.current.pending.data).toEqual([]);
			expect(result.current.history.data?.[0]).toMatchObject({
				id: action.id,
				executedAt: '2026-09-01T12:05:00.000Z',
			});
		});
		expect(queryKeys.admin.multiSigPending()).toEqual(['admin', 'multisig', 'pending']);
	});
});
