import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	fetchContentGateConfig,
	setContentGate,
} from '@/services/contentGate.service';
import type { ContentGateConfig } from '@/types/contentGate';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

export interface UseContentGateConfigResult {
	/** The key's current gate configuration. */
	config: ContentGateConfig;
	isLoading: boolean;
	isError: boolean;
	/** Refetches the configuration from the server. */
	refetch: () => void;
}

/**
 * Loads a key's content gate configuration (#1221).
 *
 * The panel opens on the stored configuration, so the creator sees what is
 * live before changing it.
 */
export function useContentGateConfig(
	keyId: string
): UseContentGateConfigResult {
	const { data, isLoading, isError, refetch } = useQuery({
		queryKey: queryKeys.creators.gateConfig(keyId),
		queryFn: () => fetchContentGateConfig(keyId),
		enabled: Boolean(keyId),
		staleTime: 15_000,
	});

	return {
		config: data ?? { gateType: 'none', thresholdAmount: null },
		isLoading,
		isError,
		refetch: () => {
			void refetch();
		},
	};
}

/**
 * Saves a key's content gate configuration via the `set_gate` contract call.
 *
 * On success the cached configuration is updated so the panel reflects the new
 * gate immediately, and a toast confirms the save.
 */
export function useSetContentGateMutation(
	keyId: string,
	wallet?: string
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'set_gate', keyId, wallet ?? ''],
		mutationFn: (config: ContentGateConfig) =>
			setContentGate(keyId, config, wallet),
		onSuccess: (_result, config) => {
			queryClient.setQueryData(
				queryKeys.creators.gateConfig(keyId),
				config
			);
			showToast.success('Content gate updated');
		},
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
	});
}
