import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useKeyConfig } from '@/hooks/useKeyConfig';
import { courseService, type KeyConfig } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';

vi.mock('@/services/course.service', async importOriginal => {
	const original =
		await importOriginal<typeof import('@/services/course.service')>();
	return {
		...original,
		courseService: {
			...original.courseService,
			getKeyConfig: vi.fn(),
		},
	};
});

const mockGetKeyConfig = vi.mocked(courseService.getKeyConfig);

describe('useKeyConfig (#951)', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
		mockGetKeyConfig.mockReset();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('fetches the key config via courseService.getKeyConfig', async () => {
		const mockConfig: KeyConfig = {
			keyId: 'creator-key-1',
			buyPriceStroops: 1_000_000,
			sellPriceStroops: 950_000,
			spreadStroops: 50_000,
			spreadBps: 500,
		};
		mockGetKeyConfig.mockResolvedValue(mockConfig);

		const { result } = renderHook(() => useKeyConfig('creator-key-1'), {
			wrapper,
		});

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual(mockConfig);
		expect(mockGetKeyConfig).toHaveBeenCalledWith('creator-key-1');

		const query = queryClient
			.getQueryCache()
			.find({ queryKey: queryKeys.creators.keyConfig('creator-key-1') });
		expect(query).toBeDefined();
	});

	it('does not fetch when the key id is empty or undefined', () => {
		const { result } = renderHook(() => useKeyConfig(undefined), { wrapper });

		expect(result.current.isFetching).toBe(false);
		expect(mockGetKeyConfig).not.toHaveBeenCalled();
	});
});
