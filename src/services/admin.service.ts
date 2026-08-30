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
