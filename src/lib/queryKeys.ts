/**
 * Centralized React Query key factory.
 *
 * Using factory functions keeps key shapes consistent and makes it
 * trivial to invalidate a whole family of queries (e.g. all creator
 * profile queries with `queryClient.invalidateQueries({ queryKey:
 * queryKeys.creatorProfile.all() })`).
 */

import type { GetCoursesParams } from '@/services/course.service';

export const queryKeys = {
	creatorProfile: {
		all: () => ['creatorProfile'] as const,
		byId: (creatorId: string) => ['creatorProfile', creatorId] as const,
	},
	creators: {
		all: ['creators'] as const,
		list: (params?: GetCoursesParams) =>
			['creators', 'list', params ?? null] as const,
		infiniteList: (params?: Omit<GetCoursesParams, 'page'>) =>
			['creators', 'infiniteList', params ?? null] as const,
		detail: (id: string) => ['creators', 'detail', id] as const,
		holders: (creatorId: string) =>
			['creators', creatorId, 'holders'] as const,
		activity: (creatorId: string) =>
			['creators', creatorId, 'activity'] as const,
	},
	wallet: {
		holdings: (address: string) => ['wallet', address, 'holdings'] as const,
		activity: (address: string) => ['wallet', address, 'activity'] as const,
	},
	notifications: {
		all: () => ['notifications'] as const,
		list: (userId: string) => ['notifications', userId, 'list'] as const,
	},
} as const;
