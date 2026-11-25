import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
	apiKeyService,
	type ApiKey,
	type CreateApiKeyInput,
	type CreatedApiKey,
} from '@/services/apiKey.service';
import showToast from '@/utils/toast.util';

/** Keys owned by the authenticated user, for the developer settings page (#1322). */
export function useApiKeys() {
	return useQuery<ApiKey[]>({
		queryKey: queryKeys.apiKeys.list(),
		queryFn: () => apiKeyService.listApiKeys(),
		retry: false,
	});
}

/**
 * Creates a key and hands the one-time secret straight to `onSecretCreated`.
 *
 * The secret deliberately never becomes mutation data or query-cache data:
 * only the key metadata is written to the cache, so nothing can replay the
 * secret from React Query or browser storage later.
 */
export function useCreateApiKey(
	onSecretCreated: (created: CreatedApiKey) => void
) {
	const queryClient = useQueryClient();
	const queryKey = queryKeys.apiKeys.list();

	return useMutation({
		mutationFn: async (input: CreateApiKeyInput) => {
			const created = await apiKeyService.createApiKey(input);
			onSecretCreated(created);
			return created.apiKey;
		},
		onSuccess: apiKey => {
			queryClient.setQueryData<ApiKey[]>(queryKey, previous =>
				previous ? [apiKey, ...previous] : [apiKey]
			);
			showToast.success('API key created');
		},
		onError: () => {
			showToast.error('Could not create the API key. Try again.');
		},
	});
}

/**
 * Revokes a key and optimistically flags it as revoked so it leaves the active
 * list immediately. A failed request rolls the cached list back.
 */
export function useRevokeApiKey() {
	const queryClient = useQueryClient();
	const queryKey = queryKeys.apiKeys.list();

	return useMutation({
		mutationFn: (keyId: string) => apiKeyService.revokeApiKey(keyId),
		onMutate: async (keyId: string) => {
			await queryClient.cancelQueries({ queryKey });
			const previous = queryClient.getQueryData<ApiKey[]>(queryKey);

			queryClient.setQueryData<ApiKey[]>(queryKey, current =>
				current?.map(key =>
					key.id === keyId
						? {
								...key,
								status: 'revoked' as const,
								revokedAt: new Date().toISOString(),
							}
						: key
				)
			);

			return { previous };
		},
		onError: (_error, _keyId, context) => {
			if (context?.previous) {
				queryClient.setQueryData(queryKey, context.previous);
			}
			showToast.error('Could not revoke that API key. Try again.');
		},
		onSuccess: () => {
			showToast.success('API key revoked');
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey });
		},
	});
}
