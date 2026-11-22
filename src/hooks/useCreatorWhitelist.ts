// src/hooks/useCreatorWhitelist.ts
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	creatorWhitelistService,
	type AllowlistImportReport,
	type CreatorWhitelistConfig,
	type WhitelistEntry,
} from '@/services/creatorWhitelist.service';
import type { Course } from '@/services/course.service';
import showToast from '@/utils/toast.util';

function errorMessage(error: unknown): string {
	return error instanceof Error
		? error.message
		: 'Something went wrong. Please try again.';
}

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

	const setModeMutation = useMutation({
		mutationFn: (enabled: boolean) =>
			creatorWhitelistService.set_whitelist_mode(keyId!, enabled),
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
							}
						: old
			);
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.whitelist(keyId ?? ''),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(keyId ?? ''),
			});
			showToast.success(
				updated.isWhitelistEnabled
					? 'Early access whitelist enabled'
					: 'Early access whitelist disabled'
			);
		},
		onError: (error: unknown) => {
			const message =
				error instanceof Error
					? error.message
					: 'Failed to update whitelist mode';
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
		setWhitelistMode: setModeMutation.mutateAsync,
		isAdding: addMutation.isPending,
		isRemoving: removeMutation.isPending,
		isDisabling: disableMutation.isPending || setModeMutation.isPending,
	};
}

export function useAllowlistImport(keyId: string) {
	const queryClient = useQueryClient();
	const [validatedFile, setValidatedFile] = useState<{
		file: File;
		report: AllowlistImportReport;
	} | null>(null);

	const dryRunMutation = useMutation({
		mutationFn: ({ file }: { file: File }) =>
			creatorWhitelistService.importCsv(keyId, file, true),
		onSuccess: (report, { file }) => setValidatedFile({ file, report }),
		onError: (error: unknown) => {
			showToast.error(errorMessage(error));
		},
	});

	const applyMutation = useMutation({
		mutationFn: (file: File) => {
			if (
				!validatedFile ||
				validatedFile.file !== file ||
				validatedFile.report.fatalErrors !== 0
			) {
				throw new Error('Run a successful dry run before applying this CSV.');
			}
			return creatorWhitelistService.importCsv(keyId, file, false);
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.whitelist(keyId),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.detail(keyId),
			});
			showToast.success('Whitelist CSV applied');
		},
		onError: (error: unknown) => {
			showToast.error(errorMessage(error));
		},
	});

	return {
		report: validatedFile?.report ?? null,
		canApply: validatedFile?.report.fatalErrors === 0,
		dryRun: (file: File) => {
			setValidatedFile(null);
			return dryRunMutation.mutateAsync({ file });
		},
		apply: (file: File) => applyMutation.mutateAsync(file),
		reset: () => {
			setValidatedFile(null);
			dryRunMutation.reset();
			applyMutation.reset();
		},
		isDryRunning: dryRunMutation.isPending,
		isApplying: applyMutation.isPending,
	};
}
