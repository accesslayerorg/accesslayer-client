import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	courseService,
	type GetCoursesParams,
	type PriceHistoryInterval,
} from '@/services/course.service';

export function useCreatorList(params?: GetCoursesParams) {
	return useQuery({
		queryKey: queryKeys.creators.list(params),
		queryFn: async () => [],
	});
}

export function useCreatorDetail(id: string) {
	return useQuery({
		queryKey: queryKeys.creators.detail(id),
		queryFn: () => courseService.getCourse(id),
		enabled: !!id,
	});
}

export function usePriceHistory(id: string, interval: PriceHistoryInterval) {
	return useQuery({
		queryKey: queryKeys.creators.priceHistory(id, interval),
		queryFn: () => courseService.getPriceHistory(id, interval),
		enabled: !!id,
	});
}
