import { useQuery } from '@tanstack/react-query';
import type { Course } from '@/services/course.service';

export function useFollowingCreators() {
	return useQuery<Course[]>({
		queryKey: ['following-creators'],
		queryFn: async () => [],
	});
}
