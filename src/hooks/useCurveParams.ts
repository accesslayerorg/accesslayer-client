import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService } from '@/services/course.service';
import {
	DEFAULT_BONDING_CURVE_PARAMS,
	type BondingCurveParams,
} from '@/utils/bondingCurve.utils';
import {
	DEFAULT_CREATOR_ROYALTY_BPS,
	DEFAULT_PROTOCOL_FEE_BPS,
} from '@/utils/dynamicFeeRate.utils';

export interface CurveParamsResult {
	params: BondingCurveParams;
	currentSupply: number;
	protocolFeeBps: number;
	creatorFeeBps: number;
	isLoading: boolean;
	isError: boolean;
	usingDefaults: boolean;
}

export function useCurveParams(keyId?: string | null): CurveParamsResult {
	const enabled = Boolean(keyId);
	const query = useQuery({
		queryKey: queryKeys.curveParams.byKey(keyId ?? ''),
		queryFn: () => courseService.getCourse(keyId!),
		enabled,
		staleTime: 60_000,
		retry: false,
	});

	const course = query.data;
	const params: BondingCurveParams = {
		basePriceStroops:
			typeof course?.curveBasePriceStroops === 'number' &&
			course.curveBasePriceStroops > 0
				? course.curveBasePriceStroops
				: DEFAULT_BONDING_CURVE_PARAMS.basePriceStroops,
		growthFactor:
			typeof course?.curveGrowthFactor === 'number' &&
			course.curveGrowthFactor > 0
				? course.curveGrowthFactor
				: DEFAULT_BONDING_CURVE_PARAMS.growthFactor,
	};

	return {
		params,
		currentSupply: Math.max(0, course?.creatorShareSupply ?? 0),
		protocolFeeBps: course?.protocolFeeBps ?? DEFAULT_PROTOCOL_FEE_BPS,
		creatorFeeBps: course?.creatorFeeBps ?? DEFAULT_CREATOR_ROYALTY_BPS,
		isLoading: enabled && query.isLoading,
		isError: query.isError,
		usingDefaults: !course,
	};
}
