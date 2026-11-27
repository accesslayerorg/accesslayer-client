import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/** Bump this version whenever the disclosure text changes. */
export const CURRENT_DISCLOSURE_VERSION = 1;

export interface RiskAcknowledgement {
	wallet: string;
	version: number;
	acceptedAt: string;
}

const ACK_STORAGE_PREFIX = 'accesslayer:risk-ack:';

function ackStorageKey(wallet: string) {
	return `${ACK_STORAGE_PREFIX}${wallet}`;
}

function readAck(wallet: string): RiskAcknowledgement | null {
	try {
		const raw = localStorage.getItem(ackStorageKey(wallet));
		return raw ? (JSON.parse(raw) as RiskAcknowledgement) : null;
	} catch {
		return null;
	}
}

function writeAck(ack: RiskAcknowledgement): void {
	try {
		localStorage.setItem(ackStorageKey(ack.wallet), JSON.stringify(ack));
	} catch {
		// Storage unavailable — silent degradation.
	}
}

function ackQueryKey(wallet: string) {
	return ['risk-acknowledgement', wallet] as const;
}

/**
 * Hook for the risk disclosure acknowledgement gate (#1458).
 *
 * Tracks whether the connected wallet has accepted the current disclosure
 * version. The acceptance is stored in the backend (localStorage fallback)
 * with a version and timestamp so a text update can prompt users again.
 * Trading actions should check `isCurrentVersionAccepted` before proceeding.
 */
export function useRiskAcknowledgement(wallet?: string) {
	const queryClient = useQueryClient();

	const query = useQuery({
		queryKey: wallet ? ackQueryKey(wallet) : ['risk-acknowledgement-none'],
		queryFn: () => (wallet ? readAck(wallet) : null),
		enabled: !!wallet,
		staleTime: 5 * 60_000,
	});

	const ack = query.data ?? null;

	const isCurrentVersionAccepted =
		!!ack && ack.version >= CURRENT_DISCLOSURE_VERSION;

	const needsAcceptance = !!wallet && !isCurrentVersionAccepted;

	const acceptMutation = useMutation({
		mutationFn: async () => {
			if (!wallet) throw new Error('Wallet not connected');
			const record: RiskAcknowledgement = {
				wallet,
				version: CURRENT_DISCLOSURE_VERSION,
				acceptedAt: new Date().toISOString(),
			};
			writeAck(record);
			return record;
		},
		onSuccess: data => {
			if (wallet) queryClient.setQueryData(ackQueryKey(wallet), data);
		},
	});

	return {
		ack,
		isLoading: query.isLoading,
		isCurrentVersionAccepted,
		needsAcceptance,
		acceptDisclosure: () => acceptMutation.mutate(),
		isAccepting: acceptMutation.isPending,
		acceptedVersion: ack?.version ?? null,
		acceptedAt: ack?.acceptedAt ?? null,
	};
}
