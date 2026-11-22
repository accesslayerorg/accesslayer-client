import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { autoInvestService } from '@/services/autoInvest.service';
import { queryKeys } from '@/lib/queryKeys';
import type { AutoInvestRule, AutoInvestSettings } from '@/types/autoInvest';

/**
 * Fetch all auto-invest rules
 */
export function useAutoInvestRules() {
	return useQuery({
		queryKey: queryKeys.autoInvest.rules(),
		queryFn: () => autoInvestService.getRules(),
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

/**
 * Create a new auto-invest rule
 */
export function useCreateAutoInvestRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (
			rule: Omit<AutoInvestRule, 'id' | 'createdAt' | 'updatedAt'>
		) => autoInvestService.createRule(rule),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.autoInvest.rules(),
			});
		},
	});
}

/**
 * Update an auto-invest rule
 */
export function useUpdateAutoInvestRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({
			ruleId,
			updates,
		}: {
			ruleId: string;
			updates: Partial<AutoInvestRule>;
		}) => autoInvestService.updateRule(ruleId, updates),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.autoInvest.rules(),
			});
		},
	});
}

/**
 * Delete an auto-invest rule
 */
export function useDeleteAutoInvestRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (ruleId: string) => autoInvestService.deleteRule(ruleId),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.autoInvest.rules(),
			});
		},
	});
}

/**
 * Toggle auto-invest rule enabled/disabled
 */
export function useToggleAutoInvestRule() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: ({ ruleId, enabled }: { ruleId: string; enabled: boolean }) =>
			autoInvestService.toggleRule(ruleId, enabled),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.autoInvest.rules(),
			});
		},
	});
}

/**
 * Fetch auto-invest history
 */
export function useAutoInvestHistory(limit: number = 50) {
	return useQuery({
		queryKey: queryKeys.autoInvest.history(limit),
		queryFn: () => autoInvestService.getHistory(limit),
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

/**
 * Fetch auto-invest settings
 */
export function useAutoInvestSettings() {
	return useQuery({
		queryKey: queryKeys.autoInvest.settings(),
		queryFn: () => autoInvestService.getSettings(),
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}

/**
 * Update auto-invest settings
 */
export function useUpdateAutoInvestSettings() {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (settings: Partial<AutoInvestSettings>) =>
			autoInvestService.updateSettings(settings),
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.autoInvest.settings(),
			});
		},
	});
}
