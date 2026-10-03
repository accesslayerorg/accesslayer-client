// src/hooks/useCreatorWhitelist.ts
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	creatorWhitelistService,
	type CreatorWhitelistConfig,
	type WhitelistEntry,
} from '@/services/creatorWhitelist.service';
import type { Course } from '@/services/course.service';
import showToast from '@/utils/toast.util';

export function useCreatorWhitelist(
	keyId: string | undefined,
	initialCourse?: Course | null
) {
	const queryClient = useQueryClient();

	const initialWhitelist = initialCourse?.whitelist;
	const initialIsEnabled =
		initialCourse?.isWhitelistEnabled ??
		initialCourse?.whitelistEnabled ??
		(initialWhitelist && initialWhitelist.length > 0 ? true : undefined);

	const query = useQuery<CreatorWhitelistConfig>({
		queryKey: queryKeys.creators.whitelist(keyId ?? ''),
		queryFn: () =>
			creatorWhitelistService.getWhitelist(keyId!, {
				isWhitelistEnabled: initialIsEnabled,
				entries: initialWhitelist,
			}),
		enabled: Boolean(keyId),
		staleTime: 15_000,
	});

	const addMutation = useMutation({
		mutationFn: (addresses: string[]) =>
			creatorWhitelistService.addAddresses(keyId!, addresses),
		onSuccess: updated => {
			queryClient.setQueryData(
				queryKeys.creators.whitelist(keyId ?? ''),
				updated
			);
			queryClient.setQueryData(
				queryKeys.creators.detail(keyId ?? ''),
				(old: Course | undefined) =>
					old
						? {
								...old,
								isWhitelistEnabled: updated.isWhitelistEnabled,
								whitelistEnabled: updated.isWhitelistEnabled,
								whitelist: updated.entries,
							}
						: old
			);
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.whitelist(keyId ?? ''),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(keyId ?? ''),
			});
			const count = updated.entries.length;
			showToast.success(
				`Whitelist updated (${count} wallet${count === 1 ? '' : 's'} approved)`
			);
		},
		onError: (error: unknown) => {
			const message =
				error instanceof Error
					? error.message
					: 'Failed to add address to whitelist';
			showToast.error(message);
		},
	});

	const removeMutation = useMutation({
		mutationFn: (address: string) =>
			creatorWhitelistService.removeAddress(keyId!, address),
		onSuccess: updated => {
			queryClient.setQueryData(
				queryKeys.creators.whitelist(keyId ?? ''),
				updated
			);
			queryClient.setQueryData(
				queryKeys.creators.detail(keyId ?? ''),
				(old: Course | undefined) =>
					old
						? {
								...old,
								isWhitelistEnabled: updated.isWhitelistEnabled,
								whitelistEnabled: updated.isWhitelistEnabled,
								whitelist: updated.entries,
							}
						: old
			);
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.whitelist(keyId ?? ''),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(keyId ?? ''),
			});
			showToast.success('Wallet removed from whitelist');
		},
		onError: (error: unknown) => {
			const message =
				error instanceof Error
					? error.message
					: 'Failed to remove address from whitelist';
			showToast.error(message);
		},
	});

	const disableMutation = useMutation({
		mutationFn: () => creatorWhitelistService.disableWhitelist(keyId!),
		onSuccess: updated => {
			queryClient.setQueryData(
				queryKeys.creators.whitelist(keyId ?? ''),
				updated
			);
			queryClient.setQueryData(
				queryKeys.creators.detail(keyId ?? ''),
				(old: Course | undefined) =>
					old
						? {
								...old,
								isWhitelistEnabled: false,
								whitelistEnabled: false,
							}
						: old
			);
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.whitelist(keyId ?? ''),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(keyId ?? ''),
			});
			showToast.success('Early access whitelist disabled');
		},
		onError: (error: unknown) => {
			const message =
				error instanceof Error
					? error.message
					: 'Failed to disable whitelist';
			showToast.error(message);
		},
	});

	// Derive values with fallback to initialCourse props
	const entries: WhitelistEntry[] =
		query.data?.entries ?? initialCourse?.whitelist ?? [];
	const isWhitelistEnabled: boolean =
		query.data?.isWhitelistEnabled ??
		initialCourse?.isWhitelistEnabled ??
		initialCourse?.whitelistEnabled ??
		true;

	return {
		entries,
		isWhitelistEnabled,
		isLoading: query.isLoading,
		isError: query.isError,
		addAddresses: addMutation.mutateAsync,
		removeAddress: removeMutation.mutateAsync,
		disableWhitelist: disableMutation.mutateAsync,
		isAdding: addMutation.isPending,
		isRemoving: removeMutation.isPending,
		isDisabling: disableMutation.isPending,
	};
}
