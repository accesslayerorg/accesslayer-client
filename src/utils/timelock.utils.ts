/**
 * Timelock and countdown calculation utilities for bonding curve proposals.
 */

export interface TimelockCountdown {
	formatted: string;
	hours: number;
	minutes: number;
	seconds: number;
	isExpired: boolean;
	totalSecondsRemaining: number;
}

export const TIMELOCK_DURATION_HOURS = 48;
export const TIMELOCK_DURATION_MS = TIMELOCK_DURATION_HOURS * 60 * 60 * 1000;

/**
 * Calculates the ETA timestamp for a proposal given the proposal time and timelock duration.
 *
 * @param proposedAt - Proposal creation time (epoch ms or Date)
 * @param timelockHours - Timelock duration in hours (default: 48)
 * @returns ETA timestamp in epoch ms
 */
export function calculateProposalEta(
	proposedAt: number | Date,
	timelockHours: number = TIMELOCK_DURATION_HOURS
): number {
	const startMs =
		typeof proposedAt === 'number' ? proposedAt : proposedAt.getTime();
	return startMs + timelockHours * 60 * 60 * 1000;
}

/**
 * Formats remaining time until ETA into a breakdown and human-readable countdown string.
 *
 * @param eta - Target ETA timestamp (epoch ms or Date)
 * @param current - Current timestamp (epoch ms or Date, defaults to Date.now())
 * @returns TimelockCountdown object
 */
export function formatTimelockCountdown(
	eta: number | Date,
	current: number | Date = Date.now()
): TimelockCountdown {
	const etaMs = typeof eta === 'number' ? eta : eta.getTime();
	const currentMs = typeof current === 'number' ? current : current.getTime();
	const diffMs = etaMs - currentMs;

	if (diffMs <= 0) {
		return {
			formatted: '00h 00m 00s (Ready to execute)',
			hours: 0,
			minutes: 0,
			seconds: 0,
			isExpired: true,
			totalSecondsRemaining: 0,
		};
	}

	const totalSecondsRemaining = Math.floor(diffMs / 1000);
	const hours = Math.floor(totalSecondsRemaining / 3600);
	const minutes = Math.floor((totalSecondsRemaining % 3600) / 60);
	const seconds = totalSecondsRemaining % 60;

	const pad = (n: number) => n.toString().padStart(2, '0');
	const formatted = `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s remaining`;

	return {
		formatted,
		hours,
		minutes,
		seconds,
		isExpired: false,
		totalSecondsRemaining,
	};
}
