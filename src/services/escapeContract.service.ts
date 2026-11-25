/**
 * Simulated emergency escape-hatch contract service.
 *
 * Exposes the minimal contract reads/writes required by the escape hatch flow:
 * - read `escape_enabled` and the pause start (`pauseStartedAt`)
 * - submit `escape_redeem` for a holder's key position
 *
 * The on-chain wiring is not present in the client yet, so status is kept in
 * memory and `escape_redeem` simulates signing latency. Tests and local
 * development can seed state via the exported setters.
 */

export const ESCAPE_AVAILABILITY_DELAY_MS = 7 * 24 * 60 * 60 * 1000;

export interface EscapeStatus {
	/** Whether the protocol emergency pause is active. */
	protocolPaused: boolean;
	/** Timestamp (ms or ISO string) when the pause started; null when not paused. */
	pauseStartedAt: string | number | null;
	/** Contract flag indicating the escape hatch is open for withdrawals. */
	escapeEnabled: boolean;
	/**
	 * Optional explicit timestamp when escape becomes available. When omitted it
	 * is derived from `pauseStartedAt + ESCAPE_AVAILABILITY_DELAY_MS`.
	 */
	escapeAvailableAt?: string | number | null;
	/**
	 * Delay before escape opens, in milliseconds. Defaults to
	 * `ESCAPE_AVAILABILITY_DELAY_MS` when omitted.
	 */
	escapeDelayMs?: number;
}

export interface EscapeRedeemParams {
	keyId: string;
	quantity: number;
	address: string;
}

export interface EscapeRedeemResult {
	success: boolean;
	txHash: string;
}

const SIGN_LATENCY_MS = 800;

let escapeStatusState: EscapeStatus = {
	protocolPaused: false,
	pauseStartedAt: null,
	escapeEnabled: false,
	escapeAvailableAt: null,
	escapeDelayMs: ESCAPE_AVAILABILITY_DELAY_MS,
};

function randomTxHash(): string {
	let hash = '';
	for (let i = 0; i < 64; i += 1) {
		hash += Math.floor(Math.random() * 16).toString(16);
	}
	return `0x${hash}`;
}

export function getEscapeDelayMs(status: EscapeStatus): number {
	return typeof status.escapeDelayMs === 'number' && status.escapeDelayMs >= 0
		? status.escapeDelayMs
		: ESCAPE_AVAILABILITY_DELAY_MS;
}

export function resolveEscapeAvailableAt(status: EscapeStatus): number | null {
	if (status.escapeAvailableAt != null) {
		const explicit =
			typeof status.escapeAvailableAt === 'number'
				? status.escapeAvailableAt
				: new Date(status.escapeAvailableAt).getTime();
		return Number.isFinite(explicit) ? explicit : null;
	}
	if (status.pauseStartedAt == null) return null;
	const pauseStart =
		typeof status.pauseStartedAt === 'number'
			? status.pauseStartedAt
			: new Date(status.pauseStartedAt).getTime();
	if (!Number.isFinite(pauseStart)) return null;
	return pauseStart + getEscapeDelayMs(status);
}

export function deriveEscapeEnabled(
	status: EscapeStatus,
	now = Date.now()
): boolean {
	if (status.escapeEnabled) return true;
	const availableAt = resolveEscapeAvailableAt(status);
	return availableAt != null && now >= availableAt;
}

class EscapeContractService {
	async getEscapeStatus(): Promise<EscapeStatus> {
		const snapshot = { ...escapeStatusState };
		return {
			...snapshot,
			escapeEnabled: deriveEscapeEnabled(snapshot),
		};
	}

	/** Submit `escape_redeem` for a holding (simulated). */
	async escape_redeem(
		params: EscapeRedeemParams
	): Promise<EscapeRedeemResult> {
		const { keyId, quantity, address } = params;
		if (!keyId) throw new Error('A key id is required to redeem.');
		if (!address) throw new Error('Connect a wallet to redeem.');
		if (!Number.isFinite(quantity) || quantity <= 0) {
			throw new Error('A positive quantity is required to redeem.');
		}

		const status = await this.getEscapeStatus();
		if (!status.escapeEnabled) {
			throw new Error('Escape mode is not active.');
		}

		await new Promise<void>(resolve =>
			window.setTimeout(resolve, SIGN_LATENCY_MS)
		);

		return { success: true, txHash: randomTxHash() };
	}

	/** Seed status for tests/local development. */
	setEscapeStatus(next: Partial<EscapeStatus>): void {
		escapeStatusState = { ...escapeStatusState, ...next };
	}

	/** Reset to the default (inactive) state. */
	resetEscapeStatus(): void {
		escapeStatusState = {
			protocolPaused: false,
			pauseStartedAt: null,
			escapeEnabled: false,
			escapeAvailableAt: null,
			escapeDelayMs: ESCAPE_AVAILABILITY_DELAY_MS,
		};
	}
}

export const escapeContractService = new EscapeContractService();
