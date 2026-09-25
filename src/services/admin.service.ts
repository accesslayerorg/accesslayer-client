// src/services/admin.service.ts
import { BaseApiService, type APIResponse } from './api.service';

/**
 * A single approved contract address permitted to call the price oracle.
 */
export interface OracleCaller {
	address: string;
	/** ISO timestamp recorded by the server when the caller was approved. */
	addedAt?: string;
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
			typeof value.payload === 'string' ? value.payload : `admin-action:${id}`,
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
				raw && typeof raw === 'object' && 'action' in raw
					? raw.action
					: raw
			);
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/** Execute an action after the server has verified the signature threshold. */
	async executeMultiSigAction(actionId: string): Promise<MultiSigAction | null> {
		try {
			const response = await this.api.post<
				APIResponse<MultiSigAction | { action?: MultiSigAction }>
			>(`/admin/multisig/actions/${encodeURIComponent(actionId)}/execute`);
			const raw = response.data.data;
			return toMultiSigAction(
				raw && typeof raw === 'object' && 'action' in raw
					? raw.action
					: raw
			);
		} catch (error) {
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
