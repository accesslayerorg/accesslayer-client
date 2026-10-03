// src/services/keyFactory.service.ts
import { BaseApiService, type APIResponse } from './api.service';
import type { KeyFactoryDraft } from '@/utils/keyFactory.utils';

/**
 * Deployment status of a creator key, tracked from submission until the key
 * detail page can be opened (#959).
 */
export type KeyDeploymentStatus =
	| 'submitted'
	| 'pending'
	| 'confirmed'
	| 'failed';

/** Deployment receipt returned when a creator key is submitted (#959). */
export interface KeyDeploymentReceipt {
	/** Id of the newly created creator key. */
	keyId: string;
	/** Transaction hash of the factory deployment. */
	transactionHash: string;
	/** Current deployment status. */
	status: KeyDeploymentStatus;
	/** ISO timestamp the deployment was submitted at. */
	submittedAt?: string;
}

/** Payload sent to the factory to deploy a new creator key (#959). */
export interface DeployCreatorKeyPayload {
	/** Wallet deploying the key. */
	deployer: string;
	/** Wizard draft, normalised for the contract call. */
	draft: KeyFactoryDraft;
	/** Parsed whitelist addresses; empty when no whitelist was uploaded. */
	whitelist: string[];
}

class KeyFactoryService extends BaseApiService {
	/**
	 * Deploys a new creator key through the factory contract - POST /keys/deploy.
	 *
	 * The response carries the new key id so the wizard can redirect to its
	 * detail page, plus a status the client polls to track the deployment.
	 */
	async deployCreatorKey(
		payload: DeployCreatorKeyPayload
	): Promise<KeyDeploymentReceipt> {
		try {
			const response = await this.api.post<APIResponse<KeyDeploymentReceipt>>(
				'/keys/deploy',
				payload
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Polls the deployment status - GET /keys/deploy/:deploymentId.
	 *
	 * Resolves to `null` when the backend does not expose a deployment record
	 * (the client then falls back to treating the submission as final).
	 */
	async getDeploymentStatus(
		keyId: string
	): Promise<KeyDeploymentReceipt | null> {
		try {
			const response = await this.api.get<APIResponse<KeyDeploymentReceipt>>(
				`/keys/deploy/${keyId}`
			);
			return response.data.data ?? null;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const keyFactoryService = new KeyFactoryService();
