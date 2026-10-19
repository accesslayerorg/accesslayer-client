import { useCallback, useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';
import { fetchAirdropsForWallet } from '@/services/airdrop.service';
import {
	buildAirdropClaimRecord,
	loadAirdropClaimHistory,
	saveAirdropClaimHistory,
	type AirdropAllocation,
	type AirdropClaimRecord,
} from '@/utils/airdropClaim.utils';

export type {
	AirdropAllocation,
	AirdropClaimRecord,
} from '@/utils/airdropClaim.utils';

const SIGN_LATENCY_MS = 900;

export interface ClaimAirdropSubmission {
	success: true;
	transactionHash: string;
	claimedAt: number;
}

export interface ClaimAirdropResult extends ClaimAirdropSubmission {
	record: AirdropClaimRecord;
}

export interface ClaimAllAirdropsResult {
	success: true;
	claimedCount: number;
	claimedAmount: number;
	records: AirdropClaimRecord[];
}

/**
 * Error thrown when a sequential Claim All flow fails partway through.
 * Carries the records for airdrops that were already claimed so they are
 * never lost from history.
 */
export class PartialAirdropClaimError extends Error {
	readonly completedRecords: AirdropClaimRecord[];

	constructor(message: string, completedRecords: AirdropClaimRecord[]) {
		super(message);
		this.name = 'PartialAirdropClaimError';
		this.completedRecords = completedRecords;
	}
}

/**
 * Fetches the airdrop allocations available to a wallet for the keys it
 * holds. Claimed status is derived from local claim history, not this
 * endpoint.
 */
export function useAirdropAllocations(wallet: string) {
	return useQuery<AirdropAllocation[]>({
		queryKey: queryKeys.airdrop.allocations(wallet),
		queryFn: () => fetchAirdropsForWallet(wallet),
		enabled: !!wallet,
	});
}

/**
 * Simulated claim history persisted per wallet in localStorage
 * (`accesslayer:airdrop_claim_history:${address}`) since no backend
 * claim-status endpoint exists yet. Survives page refreshes.
 */
export function useAirdropClaimHistory(address: string) {
	const [history, setHistory] = useState<AirdropClaimRecord[]>(() =>
		loadAirdropClaimHistory(address)
	);

	useEffect(() => {
		setHistory(loadAirdropClaimHistory(address));
	}, [address]);

	const appendHistory = useCallback(
		(records: AirdropClaimRecord[]) => {
			if (records.length === 0) return;
			setHistory(previous => {
				const known = new Set(previous.map(record => record.id));
				const next = [
					...records.filter(record => !known.has(record.id)),
					...previous,
				].sort((a, b) => b.timestamp - a.timestamp);
				saveAirdropClaimHistory(address, next);
				return next;
			});
		},
		[address]
	);

	return { history, appendHistory };
}

/**
 * Submits the `claim_airdrop` contract call for a single allocation.
 * Contract wiring does not exist yet, so latency is simulated.
 */
async function submitClaimAirdrop(
	airdrop: AirdropAllocation
): Promise<ClaimAirdropSubmission> {
	void airdrop;
	await new Promise<void>(resolve => window.setTimeout(resolve, SIGN_LATENCY_MS));
	return {
		success: true as const,
		transactionHash: Array.from({ length: 64 }, () =>
			Math.floor(Math.random() * 16).toString(16)
		).join(''),
		claimedAt: Date.now(),
	};
}

/**
 * Persists claim records to local history, merging with whatever is
 * already stored so a claim is never lost even when the caller's
 * `onAppended` callback is a no-op. Duplicate ids are dropped and the
 * result stays sorted newest first.
 */
function persistClaimRecords(
	address: string,
	records: AirdropClaimRecord[]
): void {
	if (records.length === 0) return;
	const existing = loadAirdropClaimHistory(address);
	const known = new Set(existing.map(record => record.id));
	const merged = [
		...records.filter(record => {
			if (known.has(record.id)) return false;
			known.add(record.id);
			return true;
		}),
		...existing,
	].sort((a, b) => b.timestamp - a.timestamp);
	saveAirdropClaimHistory(address, merged);
}

/**
 * Claims a single airdrop via the `claim_airdrop` contract call and
 * appends the received amount + claim date to local history.
 */
export function useClaimAirdropMutation(
	address: string,
	options?: { onAppended?: (records: AirdropClaimRecord[]) => void }
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'claim_airdrop', address],
		mutationFn: async (
			airdrop: AirdropAllocation
		): Promise<ClaimAirdropResult> => {
			const submitted = await submitClaimAirdrop(airdrop);
			return {
				...submitted,
				record: buildAirdropClaimRecord(
					airdrop,
					submitted.transactionHash,
					submitted.claimedAt
				),
			};
		},
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: result => {
			persistClaimRecords(address, [result.record]);
			options?.onAppended?.([result.record]);
			showToast.success('Airdrop claimed');
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.airdrop.allocations(address),
			});
		},
	});
}

export interface ClaimAllAirdropsVariables {
	airdrops: AirdropAllocation[];
}

/**
 * Runs one `claim_airdrop` contract call per allocation, in order.
 * Exported for direct sequencing tests. If a call fails mid-sequence, a
 * {@link PartialAirdropClaimError} is thrown carrying the records that
 * already succeeded so history stays accurate; a failure on the first
 * call rethrows the original error untouched.
 */
export async function sequenceClaimAirdropCalls(
	airdrops: AirdropAllocation[],
	submit: (airdrop: AirdropAllocation) => Promise<ClaimAirdropSubmission>
): Promise<AirdropClaimRecord[]> {
	const records: AirdropClaimRecord[] = [];
	for (const airdrop of airdrops) {
		try {
			const submitted = await submit(airdrop);
			records.push(
				buildAirdropClaimRecord(
					airdrop,
					submitted.transactionHash,
					submitted.claimedAt
				)
			);
		} catch (error) {
			if (records.length > 0) {
				throw new PartialAirdropClaimError(
					error instanceof Error
						? error.message
						: 'Claim All failed partway through',
					records
				);
			}
			throw error;
		}
	}
	return records;
}

/**
 * Claims every provided airdrop by sequencing one `claim_airdrop`
 * contract call per allocation, in order. See
 * {@link sequenceClaimAirdropCalls} for partial-failure behaviour.
 */
export function useClaimAllAirdropsMutation(
	address: string,
	options?: { onAppended?: (records: AirdropClaimRecord[]) => void }
) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'claim_airdrop_all', address],
		mutationFn: async (
			variables: ClaimAllAirdropsVariables
		): Promise<ClaimAllAirdropsResult> => {
			const records = await sequenceClaimAirdropCalls(
				variables.airdrops,
				submitClaimAirdrop
			);
			return {
				success: true as const,
				claimedCount: records.length,
				claimedAmount: records.reduce(
					(total, record) => total + record.amount,
					0
				),
				records,
			};
		},
		onError: error => {
			if (error instanceof PartialAirdropClaimError) {
				persistClaimRecords(address, error.completedRecords);
				options?.onAppended?.(error.completedRecords);
			}
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: result => {
			persistClaimRecords(address, result.records);
			options?.onAppended?.(result.records);
			showToast.success(
				`Claimed ${result.claimedCount} airdrop${result.claimedCount === 1 ? '' : 's'}`
			);
		},
		onSettled: () => {
			queryClient.invalidateQueries({
				queryKey: queryKeys.airdrop.allocations(address),
			});
		},
	});
}
