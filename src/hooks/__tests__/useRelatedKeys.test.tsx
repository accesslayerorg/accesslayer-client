import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import {
	RELATED_KEYS_STALE_TIME_MS,
	useRelatedKeys,
} from '../useRelatedKeys';
import { relatedKeysService } from '@/services/relatedKeys.service';
import { queryKeys } from '@/lib/queryKeys';

vi.mock('@/services/relatedKeys.service', () => ({
	relatedKeysService: { getRelatedKeys: vi.fn() },
}));

const getRelatedKeys = vi.mocked(relatedKeysService.getRelatedKeys);

describe('useRelatedKeys (#1318)', () => {
	let queryClient: QueryClient;
	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	beforeEach(() => {
		queryClient = new QueryClient();
		getRelatedKeys.mockReset();
	});

	it('uses a 15 minute stale time', () => {
		expect(RELATED_KEYS_STALE_TIME_MS).toBe(15 * 60 * 1000);
	});

	it('fetches related keys for the key id and limit', async () => {
		getRelatedKeys.mockResolvedValue([{ id: 'k1' }]);

		const { result } = renderHook(() => useRelatedKeys('src', 5), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));
		expect(getRelatedKeys).toHaveBeenCalledWith('src', 5);
		expect(result.current.data).toEqual([{ id: 'k1' }]);
		expect(
			queryClient.getQueryState(queryKeys.creators.related('src', 5))
		).toBeDefined();
	});

	it('does not fetch without a key id', () => {
		renderHook(() => useRelatedKeys(undefined), { wrapper });

		expect(getRelatedKeys).not.toHaveBeenCalled();
	});
});
