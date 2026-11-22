import { renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCurveParams } from '@/hooks/useCurveParams';
import { courseService, type Course } from '@/services/course.service';
import {
	DEFAULT_BONDING_CURVE_PARAMS,
} from '@/utils/bondingCurve.utils';
import {
	DEFAULT_CREATOR_ROYALTY_BPS,
	DEFAULT_PROTOCOL_FEE_BPS,
} from '@/utils/dynamicFeeRate.utils';

vi.mock('@/services/course.service', () => ({
	courseService: { getCourse: vi.fn(), getCourses: vi.fn() },
}));

const getCourse = vi.mocked(courseService.getCourse);

function course(overrides: Partial<Course> = {}): Course {
	return {
		id: 'key-1',
		title: 'Key',
		description: '',
		price: 1,
		instructorId: 'creator',
		category: 'Art',
		level: 'BEGINNER',
		...overrides,
	};
}

describe('useCurveParams (#1411)', () => {
	let client: QueryClient;

	beforeEach(() => {
		vi.clearAllMocks();
		client = new QueryClient({
			defaultOptions: { queries: { retry: false } },
		});
	});

	const wrapper = ({ children }: { children: React.ReactNode }) =>
		React.createElement(QueryClientProvider, { client }, children);

	it('uses defaults when no key ID is supplied', () => {
		const { result } = renderHook(() => useCurveParams(), { wrapper });
		expect(result.current.params).toEqual(DEFAULT_BONDING_CURVE_PARAMS);
		expect(result.current.usingDefaults).toBe(true);
		expect(result.current.currentSupply).toBe(0);
		expect(result.current.protocolFeeBps).toBe(DEFAULT_PROTOCOL_FEE_BPS);
		expect(result.current.creatorFeeBps).toBe(DEFAULT_CREATOR_ROYALTY_BPS);
		expect(getCourse).not.toHaveBeenCalled();
	});

	it('loads live curve parameters and falls back for missing fields', async () => {
		getCourse.mockResolvedValue(
			course({
				curveBasePriceStroops: 5_000_000,
				curveGrowthFactor: 1.05,
				creatorShareSupply: 42,
				protocolFeeBps: 250,
			})
		);
		const { result } = renderHook(() => useCurveParams('key-1'), { wrapper });
		await waitFor(() => expect(result.current.usingDefaults).toBe(false));

		expect(result.current.params).toEqual({
			basePriceStroops: 5_000_000,
			growthFactor: 1.05,
		});
		expect(result.current.currentSupply).toBe(42);
		expect(result.current.protocolFeeBps).toBe(250);
		expect(result.current.creatorFeeBps).toBe(DEFAULT_CREATOR_ROYALTY_BPS);
	});
});
