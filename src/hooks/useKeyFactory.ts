import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { keyFactoryService } from '@/services/keyFactory.service';
import type { KeyFactoryDraft } from '@/utils/keyFactory.utils';
import { parseWhitelistInput } from '@/utils/keyFactory.utils';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import { isKeyFactoryWhitelisted } from '@/utils/factoryAccess';

/** How often the wizard re-checks a submitted deployment. */
export const DEPLOYMENT_POLL_INTERVAL_MS = 5_000;

/**
 * Whether the connected wallet may deploy a new creator key (#959).
 *
 * Fail-closed client-side gate: no wallet, or a wallet missing from the
 * configured allowlist, returns `false` and the wizard is not rendered. The
 * factory contract still authorizes the deployment itself.
 */
export function useCreatorKeyEligibility(address?: string) {
	return {
		address,
		isWhitelisted: isKeyFactoryWhitelisted(address),
	};
}

/**
 * Deployment status of a submitted creator key (#959).
 *
 * Polls while the deployment is still `submitted`/`pending` and stops once it
 * is confirmed or failed, so the wizard can show live progress and then route
 * the creator to the new key's detail page.
 */
export function useKeyDeploymentStatus(
	keyId: string | undefined,
	enabled = true
) {
	return useQuery({
		queryKey: queryKeys.creators.keyDeployment(keyId ?? ''),
		queryFn: () => keyFactoryService.getDeploymentStatus(keyId!),
		enabled: Boolean(keyId) && enabled,
		refetchInterval: query => {
			const status = query.state.data?.status;
			return status === 'confirmed' || status === 'failed'
				? false
				: DEPLOYMENT_POLL_INTERVAL_MS;
		},
		retry: false,
	});
}

export interface DeployCreatorKeyVariables {
	draft: KeyFactoryDraft;
}

/**
 * Submits a creator key deployment through the factory contract (#959).
 *
 * On success the creators list is invalidated (the new key shows up in the
 * marketplace) and a toast confirms the submission; the wizard then polls
 * {@link useKeyDeploymentStatus} and redirects to the new key's detail page
 * once the deployment is confirmed.
 */
export function useDeployCreatorKeyMutation(deployer: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'deploy_creator_key', deployer],
		mutationFn: ({ draft }: DeployCreatorKeyVariables) =>
			keyFactoryService.deployCreatorKey({
				deployer,
				draft,
				whitelist: parseWhitelistInput(draft.whitelistInput).addresses,
			}),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: queryKeys.creators.all,
			});
			showToast.success('Deployment submitted');
		},
	});
}
