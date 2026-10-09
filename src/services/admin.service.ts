// src/services/admin.service.ts
import { BaseApiService, ApiError, type APIResponse } from './api.service';

/**
 * A single approved contract address permitted to call the price oracle.
 */
export interface OracleCaller {
	address: string;
	/** ISO timestamp recorded by the server when the caller was approved. */
	addedAt?: string;
}

/** Current protocol treasury state. Monetary values are exact Stellar stroops. */
export interface TreasuryBalance {
	accumulatedFeesStroops: string;
	updatedAt?: string;
}

export interface TreasuryDistributionRecipient {
	address: string;
	amountStroops: string;
}

export interface TreasuryDistribution {
	id: string;
	epoch: number;
	totalDistributedStroops: string;
	recipients: TreasuryDistributionRecipient[];
	distributedAt: string;
	transactionHash: string;
}

export interface TreasuryFeeCollectedEvent {
	id: string;
	creatorAddress: string;
	traderAddress: string;
	amountStroops: string;
	collectedAt: string;
	transactionHash: string;
}

export interface TreasuryDistributionInput {
	admin: string;
	totalAmountStroops: string;
	recipients: TreasuryDistributionRecipient[];
}

export interface TreasuryDistributionSubmission {
	epoch: number;
	transactionHash: string;
}

export interface AclContract {
	address: string;
	functions: string[];
	addedAt: string;
}

export interface AclHistoryEvent {
	id: string;
	type: 'add' | 'remove' | 'update';
	address: string;
	functions?: string[];
	timestamp: string;
	admin: string;
}

export type AdminAction =
	| 'upgrade-proxy'
	| 'emergency-freeze'
	| string;

export interface UpgradeProxyStatus {
	/**
	 * The current logic/implementation address the proxy points to, or null
	 * when the backend has no data yet.
	 */
	logicAddress: string | null;
	/** Whether the emergency freeze is currently active. */
	isFrozen: boolean;
}

export interface PendingUpgrade {
	id: string;
	/** The new logic address proposed for the upgrade. */
	newImplementation: string;
	/** ISO timestamp or epoch when the timelock ends and the upgrade can be executed. */
	timelockEndsAt: string | number;
	/** Current signatures collected toward the multi-sig threshold. */
	signatures: MultiSigSignature[];
	requiredSignatures: number;
	totalSigners: number;
	/** Off-chain payload signed by admin wallets before execution. */
	payload: string;
	createdAt: string;
}

export interface UpgradeHistoryEvent {
	id: string;
	/** The logic address before the upgrade. */
	previousImplementation: string;
	/** The logic address after the upgrade. */
	newImplementation: string;
	/** ISO timestamp when the upgrade was executed. */
	executedAt: string;
	/** The admin wallet that executed the upgrade. */
	admin: string;
}

export type MultiSigActionType = 'deprecate-key' | string;

export interface MultiSigSignature {
	/** The connected admin wallet that produced this signature. */
	signer: string;
	signature: string;
	signedAt: string;
}

export interface MultiSigAction {
	id: string;
	type: MultiSigActionType;
	title: string;
	description?: string;
	/** Stable payload shown to admins and signed by their connected wallet. */
	payload: string;
	createdAt: string;
	requiredSignatures: number;
	totalSigners: number;
	signatures: MultiSigSignature[];
	/** Present on completed actions returned by the server. */
	executedAt?: string;
}

export type TimelockActionStatus = 'pending' | 'executed' | 'cancelled';

export interface TimelockAction {
	id: string;
	type: string;
	params: unknown;
	eta: string;
	status: TimelockActionStatus;
	queuedAt?: string;
	executedAt?: string;
	cancelledAt?: string;
	cancellable: boolean;
	cancellationDeadline?: string;
}

type MultiSigActionsResponse =
	| MultiSigAction[]
	| {
			actions?: MultiSigAction[];
			data?: MultiSigAction[];
	  };

function toMultiSigAction(raw: unknown): MultiSigAction | null {
	if (!raw || typeof raw !== 'object') return null;
	const value = raw as Record<string, unknown>;
	const id = typeof value.id === 'string' ? value.id : undefined;
	if (!id) return null;

	const rawSignatures = Array.isArray(value.signatures)
		? value.signatures
		: [];
	const signatures = rawSignatures.reduce<MultiSigSignature[]>(
		(result, item) => {
			if (!item || typeof item !== 'object') return result;
			const signature = item as Record<string, unknown>;
			const signer =
				typeof signature.signer === 'string'
					? signature.signer
					: typeof signature.address === 'string'
						? signature.address
						: '';
			if (!signer || typeof signature.signature !== 'string') return result;
			result.push({
				signer,
				signature: signature.signature,
				signedAt:
					typeof signature.signedAt === 'string'
						? signature.signedAt
						: new Date().toISOString(),
			});
			return result;
		},
		[]
	);

	return {
		id,
		type: typeof value.type === 'string' ? value.type : 'governance',
		title: typeof value.title === 'string' ? value.title : 'Admin action',
		description:
			typeof value.description === 'string' ? value.description : undefined,
		payload:
			typeof value.payload === 'string'
				? value.payload
				: `admin-action:${id}`,
		createdAt:
			typeof value.createdAt === 'string'
				? value.createdAt
				: new Date().toISOString(),
		requiredSignatures: Math.max(
			2,
			typeof value.requiredSignatures === 'number'
				? value.requiredSignatures
				: typeof value.required === 'number'
					? value.required
					: 2
		),
		totalSigners: Math.max(
			3,
			typeof value.totalSigners === 'number'
				? value.totalSigners
				: typeof value.total === 'number'
					? value.total
					: 3
		),
		signatures,
		executedAt:
			typeof value.executedAt === 'string' ? value.executedAt : undefined,
	};
}

function toMultiSigActions(raw: unknown): MultiSigAction[] {
	const candidates = Array.isArray(raw)
		? raw
		: raw && typeof raw === 'object'
			? ((raw as Record<string, unknown>).actions ??
				(raw as Record<string, unknown>).data)
			: [];
	if (!Array.isArray(candidates)) return [];
	return candidates
		.map(toMultiSigAction)
		.filter((action): action is MultiSigAction => action !== null);
}

function toTimelockAction(raw: unknown): TimelockAction | null {
	if (!raw || typeof raw !== 'object') return null;
	const value = raw as Record<string, unknown>;
	if (
		typeof value.id !== 'string' ||
		typeof value.type !== 'string' ||
		(value.status !== 'pending' &&
			value.status !== 'executed' &&
			value.status !== 'cancelled')
	) {
		return null;
	}

	const eta = value.eta;
	if (typeof eta !== 'string' && typeof eta !== 'number') return null;

	return {
		id: value.id,
		type: value.type,
		params: value.params ?? {},
		eta: typeof eta === 'number' ? new Date(eta * 1000).toISOString() : eta,
		status: value.status,
		queuedAt: typeof value.queuedAt === 'string' ? value.queuedAt : undefined,
		executedAt:
			typeof value.executedAt === 'string' ? value.executedAt : undefined,
		cancelledAt:
			typeof value.cancelledAt === 'string' ? value.cancelledAt : undefined,
		cancellable: value.cancellable === true,
		cancellationDeadline:
			typeof value.cancellationDeadline === 'string'
				? value.cancellationDeadline
				: undefined,
	};
}

function toTimelockActions(raw: unknown): TimelockAction[] {
	const candidates = Array.isArray(raw)
		? raw
		: raw && typeof raw === 'object'
			? ((raw as Record<string, unknown>).actions ??
				(raw as Record<string, unknown>).data)
			: [];
	if (!Array.isArray(candidates)) return [];
	return candidates
		.map(toTimelockAction)
		.filter((action): action is TimelockAction => action !== null);
}

/** Raw server shapes the callers endpoint may return, normalised on read. */
type OracleCallersResponse =
	OracleCaller[] | string[] | { callers?: OracleCaller[] };

function toOracleCallers(raw: unknown): OracleCaller[] {
	if (!Array.isArray(raw)) return [];

	return raw.reduce<OracleCaller[]>((callers, item) => {
		if (typeof item === 'string') {
			const address = item.trim();
			if (address) callers.push({ address });
			return callers;
		}

		if (
			item &&
			typeof item === 'object' &&
			'address' in item &&
			typeof (item as OracleCaller).address === 'string' &&
			(item as OracleCaller).address.trim()
		) {
			callers.push({
				address: (item as OracleCaller).address.trim(),
				addedAt: (item as OracleCaller).addedAt,
			});
		}

		return callers;
	}, []);
}

class AdminService extends BaseApiService {
	/**
	 * List the contract addresses currently approved to call the price
	 * oracle - GET /admin/oracle/callers.
	 */
	async getOracleCallers(): Promise<OracleCaller[]> {
		try {
			const response = await this.api.get<
				APIResponse<OracleCallersResponse>
			>('/admin/oracle/callers');

			const raw = response.data.data;
			const candidates =
				raw && typeof raw === 'object' && !Array.isArray(raw)
					? raw.callers
					: raw;

			return toOracleCallers(candidates);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Approve a new contract address to call the price oracle -
	 * POST /admin/oracle/callers.
	 */
	async addOracleCaller(address: string): Promise<OracleCaller> {
		try {
			const response = await this.api.post<APIResponse<OracleCaller>>(
				'/admin/oracle/callers',
				{ address }
			);

			return response.data.data ?? { address };
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Revoke a previously approved contract address -
	 * DELETE /admin/oracle/callers/:address.
	 */
	async removeOracleCaller(address: string): Promise<void> {
		try {
			await this.api.delete(
				`/admin/oracle/callers/${encodeURIComponent(address)}`
			);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** List sensitive governance actions waiting for the 2-of-3 threshold. */
	async getPendingMultiSigActions(): Promise<MultiSigAction[]> {
		try {
			const response = await this.api.get<
				APIResponse<MultiSigActionsResponse>
			>('/admin/multisig/actions/pending');
			return toMultiSigActions(response.data.data);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** List completed multi-sig actions for the governance audit trail. */
	async getMultiSigHistory(): Promise<MultiSigAction[]> {
		try {
			const response = await this.api.get<
				APIResponse<MultiSigActionsResponse>
			>('/admin/multisig/actions/history');
			return toMultiSigActions(response.data.data);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Submit a signature created by the connected admin wallet. */
	async signMultiSigAction(
		actionId: string,
		signature: string,
		signer: string
	): Promise<MultiSigAction | null> {
		try {
			const response = await this.api.post<
				APIResponse<MultiSigAction | { action?: MultiSigAction }>
			>(`/admin/multisig/actions/${encodeURIComponent(actionId)}/sign`, {
				signature,
				signer,
			});
			const raw = response.data.data;
			return toMultiSigAction(
				raw && typeof raw === 'object' && 'action' in raw ? raw.action : raw
			);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Execute an action after the server has verified the signature threshold. */
	async executeMultiSigAction(
		actionId: string
	): Promise<MultiSigAction | null> {
		try {
			const response = await this.api.post<
				APIResponse<MultiSigAction | { action?: MultiSigAction }>
			>(`/admin/multisig/actions/${encodeURIComponent(actionId)}/execute`);
			const raw = response.data.data;
			return toMultiSigAction(
				raw && typeof raw === 'object' && 'action' in raw ? raw.action : raw
			);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** List protocol actions waiting for their timelock ETA. */
	async getPendingTimelockActions(): Promise<TimelockAction[]> {
		try {
			const response = await this.api.get<APIResponse<unknown>>(
				'/admin/timelock/actions/pending'
			);
			return toTimelockActions(response.data.data);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** List executed and cancelled protocol actions for the audit trail. */
	async getTimelockHistory(): Promise<TimelockAction[]> {
		try {
			const response = await this.api.get<APIResponse<unknown>>(
				'/admin/timelock/actions/history'
			);
			return toTimelockActions(response.data.data);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Ask the authenticated admin API to submit the on-chain cancel action. */
	async cancelTimelockAction(actionId: string): Promise<void> {
		try {
			await this.api.post(
				`/admin/timelock/actions/${encodeURIComponent(actionId)}/cancel`
			);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async getAclWhitelist(): Promise<AclContract[]> {
		try {
			const response = await this.api.get<APIResponse<AclContract[]>>(
				'/admin/acl/whitelist'
			);
			return response.data.data ?? [];
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async addAclContract(
		address: string,
		functions: string[]
	): Promise<AclContract> {
		try {
			const response = await this.api.post<APIResponse<AclContract>>(
				'/admin/acl/whitelist',
				{ address, functions }
			);
			return (
				response.data.data ?? {
					address,
					functions,
					addedAt: new Date().toISOString(),
				}
			);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async removeAclContract(address: string): Promise<void> {
		try {
			await this.api.delete(
				`/admin/acl/whitelist/${encodeURIComponent(address)}`
			);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async getAclHistory(): Promise<AclHistoryEvent[]> {
		try {
			const response =
				await this.api.get<APIResponse<AclHistoryEvent[]>>(
					'/admin/acl/history'
				);
			return response.data.data ?? [];
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async getUpgradeProxyStatus(): Promise<UpgradeProxyStatus> {
		// TODO(#1032): Backend endpoint GET /admin/proxy/status is not yet implemented.
		// When the endpoint exists, call `this.api.get<APIResponse<UpgradeProxyStatus>>('/admin/proxy/status')`
		// and return the parsed status. Until then, return a safe empty state so the
		// panel renders without fake data.
		return { logicAddress: null, isFrozen: false };
	}

	async getPendingUpgrade(): Promise<PendingUpgrade | null> {
		// TODO(#1032): Backend endpoint GET /admin/proxy/pending-upgrade is not yet implemented.
		// When the endpoint exists, call `this.api.get<APIResponse<PendingUpgrade>>('/admin/proxy/pending-upgrade')`
		// and return the parsed proposal. Until then, return null (no pending upgrade).
		return null;
	}

	async executeUpgrade(
		signature: string,
		signer: string
	): Promise<UpgradeHistoryEvent | null> {
		// TODO(#1032): Backend endpoint POST /admin/proxy/execute is not yet implemented.
		// When the endpoint exists, call `this.api.post('/admin/proxy/execute', { signature, signer })`
		// and return the parsed result. Until then, throw so the UI can surface the error.
		void signature;
		void signer;
		throw new ApiError(
			'Upgrade execution is not yet available — the backend endpoint POST /admin/proxy/execute has not been implemented.',
			501
		);
	}

	async toggleEmergencyFreeze(
		isFrozen: boolean,
		signature: string,
		signer: string
	): Promise<UpgradeProxyStatus> {
		// TODO(#1032): Backend endpoint POST /admin/proxy/freeze is not yet implemented.
		// When the endpoint exists, call `this.api.post('/admin/proxy/freeze', { isFrozen, signature, signer })`
		// and return the updated status. Until then, throw so the UI can surface the error.
		void isFrozen;
		void signature;
		void signer;
		throw new ApiError(
			'Emergency freeze toggle is not yet available — the backend endpoint POST /admin/proxy/freeze has not been implemented.',
			501
		);
	}

	async getUpgradeHistory(): Promise<UpgradeHistoryEvent[]> {
		// TODO(#1032): Backend endpoint GET /admin/proxy/history is not yet implemented.
		// When the endpoint exists, call `this.api.get<APIResponse<UpgradeHistoryEvent[]>>('/admin/proxy/history')`
		// and return the parsed history. Until then, return an empty array.
		return [];
	}

	/** Read the on-chain protocol fee pool via the admin API. */
	async getTreasuryBalance(): Promise<TreasuryBalance> {
		try {
			const response = await this.api.get<APIResponse<TreasuryBalance>>(
				'/admin/treasury'
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Read completed treasury distributions with recipient breakdowns. */
	async getTreasuryDistributions(): Promise<TreasuryDistribution[]> {
		try {
			const response = await this.api.get<
				APIResponse<TreasuryDistribution[]>
			>('/admin/treasury/distributions');
			return response.data.data ?? [];
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Read recent on-chain FeeCollected event records. */
	async getTreasuryFeeEvents(): Promise<TreasuryFeeCollectedEvent[]> {
		try {
			const response = await this.api.get<
				APIResponse<TreasuryFeeCollectedEvent[]>
			>('/admin/treasury/fees');
			return response.data.data ?? [];
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Request a treasury distribution. The admin API must authorize the wallet,
	 * submit the contract transaction, and return its confirmed transaction hash.
	 */
	async distributeTreasuryFees(
		input: TreasuryDistributionInput
	): Promise<TreasuryDistributionSubmission> {
		try {
			const response = await this.api.post<
				APIResponse<TreasuryDistributionSubmission>
			>('/admin/treasury/distributions', input);
			const result = response.data.data;
			if (
				!result ||
				!Number.isSafeInteger(result.epoch) ||
				result.epoch < 0 ||
				typeof result.transactionHash !== 'string' ||
				result.transactionHash.trim() === ''
			) {
				throw new ApiError(
					'Treasury distribution was not confirmed by the server.',
					502
				);
			}
			return result;
		} catch (error) {
			if (error instanceof ApiError) throw error;
			throw this.handleError(error);
		}
	}
}

export const adminService = new AdminService();

/**
 * Convenience wrappers exposing the service calls as plain functions so they
 * can be swapped via `vi.spyOn` from component tests without needing to mock
 * the service class instance itself.
 */
export async function fetchOracleCallers(): Promise<OracleCaller[]> {
	return adminService.getOracleCallers();
}

export async function createOracleCaller(
	address: string
): Promise<OracleCaller> {
	return adminService.addOracleCaller(address);
}

export async function deleteOracleCaller(address: string): Promise<void> {
	return adminService.removeOracleCaller(address);
}

export async function fetchAclWhitelist(): Promise<AclContract[]> {
	return adminService.getAclWhitelist();
}

export async function createAclContract(
	address: string,
	functions: string[]
): Promise<AclContract> {
	return adminService.addAclContract(address, functions);
}

export async function deleteAclContract(address: string): Promise<void> {
	return adminService.removeAclContract(address);
}

export async function fetchAclHistory(): Promise<AclHistoryEvent[]> {
	return adminService.getAclHistory();
}

export async function fetchUpgradeProxyStatus(): Promise<UpgradeProxyStatus> {
	return adminService.getUpgradeProxyStatus();
}

export async function fetchPendingUpgrade(): Promise<PendingUpgrade | null> {
	return adminService.getPendingUpgrade();
}

export async function executeUpgradeAction(
	signature: string,
	signer: string
): Promise<UpgradeHistoryEvent | null> {
	return adminService.executeUpgrade(signature, signer);
}

export async function toggleEmergencyFreezeAction(
	isFrozen: boolean,
	signature: string,
	signer: string
): Promise<UpgradeProxyStatus> {
	return adminService.toggleEmergencyFreeze(isFrozen, signature, signer);
}

export async function fetchUpgradeHistory(): Promise<UpgradeHistoryEvent[]> {
	return adminService.getUpgradeHistory();
}
