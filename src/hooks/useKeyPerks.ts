import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';

export interface KeyPerk {
	id: string;
	keyId: string;
	title: string;
	description: string;
	minBalance: number;
	quantityLimit: number | null;
	quantityClaimed: number;
	expired: boolean;
	sortOrder: number;
}

export interface CreatePerkInput {
	title: string;
	description: string;
	minBalance: number;
	quantityLimit: number | null;
}

const PERKS_STORAGE_KEY_PREFIX = 'accesslayer:key-perks:';

function storageKey(keyId: string) {
	return `${PERKS_STORAGE_KEY_PREFIX}${keyId}`;
}

function readPerks(keyId: string): KeyPerk[] {
	try {
		const raw = localStorage.getItem(storageKey(keyId));
		if (!raw) return [];
		return JSON.parse(raw) as KeyPerk[];
	} catch {
		return [];
	}
}

function writePerks(keyId: string, perks: KeyPerk[]): void {
	try {
		localStorage.setItem(storageKey(keyId), JSON.stringify(perks));
	} catch {
		// Storage unavailable — silent degradation.
	}
}

function claimsKey(keyId: string, wallet: string) {
	return `accesslayer:perk-claims:${keyId}:${wallet}`;
}

function readClaims(keyId: string, wallet: string): Set<string> {
	try {
		const raw = localStorage.getItem(claimsKey(keyId, wallet));
		if (!raw) return new Set();
		return new Set(JSON.parse(raw) as string[]);
	} catch {
		return new Set();
	}
}

function writeClaims(keyId: string, wallet: string, claims: Set<string>): void {
	try {
		localStorage.setItem(claimsKey(keyId, wallet), JSON.stringify([...claims]));
	} catch {
		// Storage unavailable — silent degradation.
	}
}

function perksQueryKey(keyId: string) {
	return ['key-perks', keyId] as const;
}

function claimsQueryKey(keyId: string, wallet: string) {
	return ['key-perk-claims', keyId, wallet] as const;
}

export interface PerkEligibility {
	perkId: string;
	eligible: boolean;
	/** How many more keys the wallet needs to unlock this perk. */
	balanceGap: number;
	claimed: boolean;
}

/**
 * Hook for reading and mutating creator perks and eligibility (#1451).
 *
 * Returns the perks list for a key, the connected wallet's eligibility per
 * perk, and mutations for creators (add/reorder/expire) and holders (claim).
 */
export function useKeyPerks(keyId: string, wallet?: string) {
	const queryClient = useQueryClient();

	const perksQuery = useQuery({
		queryKey: perksQueryKey(keyId),
		queryFn: () => readPerks(keyId),
		enabled: !!keyId,
		staleTime: 30_000,
	});

	const claimsQuery = useQuery({
		queryKey: wallet ? claimsQueryKey(keyId, wallet) : ['key-perk-claims', 'none'],
		queryFn: () => (wallet ? readClaims(keyId, wallet) : new Set<string>()),
		enabled: !!keyId && !!wallet,
	});

	const perks = useMemo(() => perksQuery.data ?? [], [perksQuery.data]);
	const claims = useMemo(() => claimsQuery.data ?? new Set<string>(), [claimsQuery.data]);

	const addPerkMutation = useMutation({
		mutationFn: async (input: CreatePerkInput) => {
			const existing = readPerks(keyId);
			const perk: KeyPerk = {
				id: `${Date.now()}`,
				keyId,
				...input,
				quantityClaimed: 0,
				expired: false,
				sortOrder: existing.length,
			};
			const updated = [...existing, perk];
			writePerks(keyId, updated);
			return updated;
		},
		onSuccess: data => queryClient.setQueryData(perksQueryKey(keyId), data),
	});

	const updatePerkMutation = useMutation({
		mutationFn: async (patch: Partial<KeyPerk> & { id: string }) => {
			const existing = readPerks(keyId);
			const updated = existing.map(p => (p.id === patch.id ? { ...p, ...patch } : p));
			writePerks(keyId, updated);
			return updated;
		},
		onSuccess: data => queryClient.setQueryData(perksQueryKey(keyId), data),
	});

	const reorderPerksMutation = useMutation({
		mutationFn: async (orderedIds: string[]) => {
			const existing = readPerks(keyId);
			const map = new Map(existing.map(p => [p.id, p]));
			const updated = orderedIds
				.map((id, i) => {
					const perk = map.get(id);
					return perk ? { ...perk, sortOrder: i } : null;
				})
				.filter(Boolean) as KeyPerk[];
			writePerks(keyId, updated);
			return updated;
		},
		onSuccess: data => queryClient.setQueryData(perksQueryKey(keyId), data),
	});

	const expirePerkMutation = useMutation({
		mutationFn: async (perkId: string) => {
			const existing = readPerks(keyId);
			const updated = existing.map(p => (p.id === perkId ? { ...p, expired: true } : p));
			writePerks(keyId, updated);
			return updated;
		},
		onSuccess: data => queryClient.setQueryData(perksQueryKey(keyId), data),
	});

	const claimPerkMutation = useMutation({
		mutationFn: async (perkId: string) => {
			if (!wallet) throw new Error('Wallet not connected');
			// Increment claimed quantity.
			const existingPerks = readPerks(keyId);
			const updatedPerks = existingPerks.map(p => {
				if (p.id !== perkId) return p;
				return {
					...p,
					quantityClaimed: p.quantityClaimed + 1,
				};
			});
			writePerks(keyId, updatedPerks);
			queryClient.setQueryData(perksQueryKey(keyId), updatedPerks);

			const existingClaims = readClaims(keyId, wallet);
			existingClaims.add(perkId);
			writeClaims(keyId, wallet, existingClaims);
			return existingClaims;
		},
		onSuccess: data => {
			if (wallet) queryClient.setQueryData(claimsQueryKey(keyId, wallet), data);
		},
	});

	/** Build eligibility data for the connected wallet given its current balance. */
	const buildEligibility = useCallback(
		(walletBalance: number): PerkEligibility[] => {
			return perks.map(perk => {
				const eligible =
					!perk.expired &&
					walletBalance >= perk.minBalance &&
					(perk.quantityLimit === null ||
						perk.quantityClaimed < perk.quantityLimit);
				const balanceGap = Math.max(0, perk.minBalance - walletBalance);
				const claimed = claims.has(perk.id);
				return { perkId: perk.id, eligible, balanceGap, claimed };
			});
		},
		[perks, claims]
	);

	const sortedPerks = useMemo(
		() => [...perks].sort((a, b) => a.sortOrder - b.sortOrder),
		[perks]
	);

	return {
		perks: sortedPerks,
		claims,
		isLoading: perksQuery.isLoading,
		buildEligibility,
		addPerk: (input: CreatePerkInput) => addPerkMutation.mutate(input),
		updatePerk: (patch: Partial<KeyPerk> & { id: string }) =>
			updatePerkMutation.mutate(patch),
		reorderPerks: (orderedIds: string[]) => reorderPerksMutation.mutate(orderedIds),
		expirePerk: (id: string) => expirePerkMutation.mutate(id),
		claimPerk: (id: string) => claimPerkMutation.mutate(id),
		isAddingPerk: addPerkMutation.isPending,
		isClaimingPerk: claimPerkMutation.isPending,
	};
}
