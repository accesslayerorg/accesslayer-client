import { STROOPS_PER_XLM } from '@/constants/stellar';
import type { HeldKeyPosition } from '@/utils/portfolioValue.utils';
import type { KeyReserve } from '@/utils/keyReserve.utils';

export interface EscapePayoutEstimate {
	perKeyStroops: number | null;
	totalStroops: number | null;
}

/**
 * Resolve the total key supply used for pro-rata reserve share estimates.
 * Prefers `currentSupply`, falls back to `creatorShareSupply`.
 */
export function resolveHoldingSupply(holding: HeldKeyPosition): number | null {
	const supply = holding.currentSupply ?? holding.creatorShareSupply;
	if (supply == null || !Number.isFinite(supply) || supply <= 0) {
		return null;
	}
	return supply;
}

/**
 * Estimate the reserve-backed payout for a holding during escape redemption.
 *
 * The escape hatch pays only the holder's pro-rata share of the protocol
 * reserve: `reserveStroops / totalSupply * quantity` (fees and yield are not
 * included).
 */
export function estimateEscapePayout(
	holding: Pick<
		HeldKeyPosition,
		'quantity' | 'currentSupply' | 'creatorShareSupply'
	>,
	reserve: Pick<KeyReserve, 'reserveStroops'> | null | undefined
): EscapePayoutEstimate {
	const quantity =
		typeof holding.quantity === 'number' && Number.isFinite(holding.quantity)
			? holding.quantity
			: 0;
	const supply = resolveHoldingSupply(holding as HeldKeyPosition);
	const reserveStroops = reserve?.reserveStroops;

	if (
		quantity <= 0 ||
		supply == null ||
		supply <= 0 ||
		reserveStroops == null ||
		!Number.isFinite(reserveStroops) ||
		reserveStroops < 0
	) {
		return { perKeyStroops: null, totalStroops: null };
	}

	const perKeyStroops = reserveStroops / supply;
	return {
		perKeyStroops,
		totalStroops: perKeyStroops * quantity,
	};
}

export function formatStroopsAsXlm(stroops: number | null | undefined): string {
	if (stroops == null || !Number.isFinite(stroops)) return '—';
	const xlm = stroops / STROOPS_PER_XLM;
	return `${new Intl.NumberFormat('en-US', {
		minimumFractionDigits: 2,
		maximumFractionDigits: 7,
	}).format(xlm)} XLM`;
}

export function formatCountdown(ms: number): string {
	const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
	const days = Math.floor(totalSeconds / 86400);
	const hours = Math.floor((totalSeconds % 86400) / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	const hh = String(hours).padStart(2, '0');
	const mm = String(minutes).padStart(2, '0');
	const ss = String(seconds).padStart(2, '0');

	if (days > 0) {
		return `${days}d ${hh}:${mm}:${ss}`;
	}
	return `${hh}:${mm}:${ss}`;
}
