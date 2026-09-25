/**
 * Centralized React Query key factory.
 *
 * Using factory functions keeps key shapes consistent and makes it
 * trivial to invalidate a whole family of queries (e.g. all creator
 * profile queries with `queryClient.invalidateQueries({ queryKey:
 * queryKeys.creatorProfile.all() })`).
 */

import type { GetCoursesParams } from '@/services/course.service';
import type { VolumeWindow } from '@/services/leaderboard.service';

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
		twap: (creatorId: string) =>
			['creators', creatorId, 'twap', '24h'] as const,
		stats: (creatorId: string) =>
			['creators', creatorId, 'stats'] as const,
		curveConfig: (creatorId: string) =>
			['creators', creatorId, 'curve-config'] as const,
		discovery: {
			all: () => ['creators', 'discovery'] as const,
			trending: () => ['creators', 'discovery', 'trending'] as const,
			newListings: () => ['creators', 'discovery', 'newListings'] as const,
		},
	},
	wallet: {
		holdings: (address: string) => ['wallet', address, 'holdings'] as const,
		activity: (address: string) => ['wallet', address, 'activity'] as const,
		tradeHistory: (address: string) =>
			['wallet', address, 'tradeHistory'] as const,
	},
	notifications: {
		all: () => ['notifications'] as const,
		list: (userId: string) => ['notifications', userId, 'list'] as const,
	},
	alerts: {
		all: () => ['alerts'] as const,
		active: (userId: string) => ['alerts', userId, 'active'] as const,
	},
	leaderboard: {
		all: () => ['leaderboard'] as const,
		volume: (window: VolumeWindow = '24h') =>
			['leaderboard', 'volume', window] as const,
	},
	admin: {
		oracleCallers: () => ['admin', 'oracle', 'callers'] as const,
		multiSigPending: () => ['admin', 'multisig', 'pending'] as const,
		multiSigHistory: () => ['admin', 'multisig', 'history'] as const,
	},
	governance: {
		all: () => ['governance'] as const,
		proposals: (creatorId?: string) =>
			['governance', 'proposals', creatorId ?? null] as const,
		proposal: (id: string) => ['governance', 'proposal', id] as const,
	},
	staker: {
		protocolRevenue: (wallet: string) =>
			['staker', wallet, 'protocol-revenue'] as const,
	},
	search: {
		all: () => ['search'] as const,
		query: (q: string) => ['search', q] as const,
	},
} as const;
