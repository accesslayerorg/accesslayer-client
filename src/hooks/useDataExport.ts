import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { privacyService, type DataExport } from '@/services/privacy.service';
import showToast from '@/utils/toast.util';

const EXPORT_STATUS_KEY = ['privacy', 'export', 'status'] as const;

/** Poll interval while an export is pending (5 s). */
const POLL_INTERVAL_MS = 5_000;

/**
 * Manages data export lifecycle: request, poll status, expose download link.
 *
 * - Polls every 5 s while status is "pending" so the UI updates without reload.
 * - Stops polling once the export reaches "ready", "expired", or "failed".
 */
export function useDataExport() {
	const queryClient = useQueryClient();

	const statusQuery = useQuery<DataExport | null>({
		queryKey: [...EXPORT_STATUS_KEY],
		queryFn: () => privacyService.getExportStatus(),
		staleTime: 0,
		refetchInterval: data => {
			if (!data || data.status === 'pending') return POLL_INTERVAL_MS;
			return false;
		},
	});

	const requestMutation = useMutation<DataExport, Error>({
		mutationFn: () => privacyService.requestDataExport(),
		onSuccess: export_ => {
			queryClient.setQueryData([...EXPORT_STATUS_KEY], export_);
			showToast.success(
				'Export requested. We will notify you when it is ready.'
			);
		},
		onError: () => {
			showToast.error('Failed to request data export. Please try again.');
		},
	});

	const exportData = statusQuery.data ?? null;
	const status = exportData?.status ?? null;

	return {
		/** Current export object, or null if none has been requested. */
		exportData,
		/** "pending" | "ready" | "expired" | "failed" | null */
		status,
		isLoading: statusQuery.isLoading,
		isError: statusQuery.isError,
		isRequesting: requestMutation.isPending,
		requestExport: () => requestMutation.mutate(),
		downloadUrl: exportData?.downloadUrl ?? null,
		expiresAt: exportData?.expiresAt ?? null,
	};
}
