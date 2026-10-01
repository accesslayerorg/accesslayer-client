import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { type ReactNode } from 'react';
import { useGraduatedCurveConfig } from '@/hooks/useGraduatedCurveConfig';
import { courseService, type GraduatedCurveConfig } from '@/services/course.service';
import { queryKeys } from '@/lib/queryKeys';

vi.mock('@/services/course.service', async (importOriginal) => {
	const original = await importOriginal<typeof import('@/services/course.service')>();
	return {
		...original,
		courseService: {
			...original.courseService,
			getCurveConfig: vi.fn(),
		},
	};
});

const mockGetCurveConfig = vi.mocked(courseService.getCurveConfig);

describe('useGraduatedCurveConfig', () => {
	let queryClient: QueryClient;

	beforeEach(() => {
		queryClient = new QueryClient({
			defaultOptions: {
				queries: {
					retry: false,
				},
			},
		});
		mockGetCurveConfig.mockReset();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);

	it('fetches graduated curve config for keyId via courseService.getCurveConfig', async () => {
		const mockConfig: GraduatedCurveConfig = {
			keyId: 'creator-key-1',
			hasGraduatedCurve: true,
			defaultExponent: 1.0,
			milestones: [
				{ supplyThreshold: 10, exponent: 1.2, simulatedPrice: 2.5 },
				{ supplyThreshold: 50, exponent: 1.5, simulatedPrice: 5.0 },
			],
		};

		mockGetCurveConfig.mockResolvedValue(mockConfig);

		const { result } = renderHook(() => useGraduatedCurveConfig('creator-key-1'), { wrapper });

		await waitFor(() => expect(result.current.isSuccess).toBe(true));

		expect(result.current.data).toEqual(mockConfig);
		expect(mockGetCurveConfig).toHaveBeenCalledWith('creator-key-1');

		const query = queryClient
			.getQueryCache()
			.find({ queryKey: queryKeys.creators.curveConfig('creator-key-1') });
		expect(query).toBeDefined();
	});

	it('does not execute query if keyId is empty or undefined', () => {
		const { result } = renderHook(() => useGraduatedCurveConfig(undefined), { wrapper });

		expect(result.current.isFetching).toBe(false);
		expect(mockGetCurveConfig).not.toHaveBeenCalled();
	});
});
