import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { queryKeys } from '@/lib/queryKeys';
import {
	escapeContractService,
	resolveEscapeAvailableAt,
	deriveEscapeEnabled,
	type EscapeStatus,
} from '@/services/escapeContract.service';

export interface UseEscapeStatusResult {
	status: EscapeStatus | null;
	isLoading: boolean;
	isError: boolean;
	error: unknown;
	refetch: () => void;
	/** True while the protocol emergency pause is active. */
	isProtocolPaused: boolean;
	/** True when the escape hatch is open for withdrawals. */
	isEscapeModeActive: boolean;
	/** Timestamp (ms) when escape becomes/ became available, if known. */
	escapeAvailableAt: number | null;
	/** Milliseconds remaining until escape availability (0 once open/unknown). */
	msUntilEscapeAvailable: number;
	/** ISO/epoch pause start value as reported by the contract service. */
	pauseStartedAt: string | number | null;
}

const POLL_INTERVAL_MS = 15_000;
const COUNTDOWN_TICK_MS = 1_000;

export function useEscapeStatus(): UseEscapeStatusResult {
	const query = useQuery({
		queryKey: queryKeys.escape.status(),
		queryFn: () => escapeContractService.getEscapeStatus(),
		refetchInterval: POLL_INTERVAL_MS,
		staleTime: 5_000,
	});

	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const id = window.setInterval(
			() => setNow(Date.now()),
			COUNTDOWN_TICK_MS
		);
		return () => window.clearInterval(id);
	}, []);

	const status = query.data ?? null;
	const escapeAvailableAt = status ? resolveEscapeAvailableAt(status) : null;
	const isEscapeModeActive = status ? deriveEscapeEnabled(status, now) : false;
	const isProtocolPaused = Boolean(status?.protocolPaused);
	const msUntilEscapeAvailable =
		escapeAvailableAt != null ? Math.max(0, escapeAvailableAt - now) : 0;

	return {
		status,
		isLoading: query.isLoading,
		isError: query.isError,
		error: query.error,
		refetch: () => {
			void query.refetch();
		},
		isProtocolPaused,
		isEscapeModeActive,
		escapeAvailableAt,
		msUntilEscapeAvailable,
		pauseStartedAt: status?.pauseStartedAt ?? null,
	};
}
