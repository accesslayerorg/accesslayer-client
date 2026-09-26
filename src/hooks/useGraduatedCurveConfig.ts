import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { courseService, type GraduatedCurveConfig } from '@/services/course.service';

export function useGraduatedCurveConfig(keyId: string | undefined) {
	return useQuery<GraduatedCurveConfig>({
		queryKey: queryKeys.creators.curveConfig(keyId ?? ''),
		queryFn: () => courseService.getCurveConfig(keyId!),
		enabled: Boolean(keyId),
		staleTime: 60_000,
		retry: false,
	});
}
