import {
	useInfiniteQuery,
	useMutation,
	useQuery,
	useQueryClient,
	type InfiniteData,
} from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useMemo } from 'react';
import {
	fetchCreatorBundlesPage,
	type BundlesPage,
	type CreateBundleRequest,
	type BuyMarketplaceBundleResult,
	type MarketplaceBundle,
} from '@/services/bundle.service';
import { marketplaceBundleService } from '@/services/bundle.service';
import { courseService } from '@/services/course.service';
import { submitCreatorContractCall } from '@/hooks/useCreatorContractActions';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import { resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';
import type { BundleKeyOption } from '@/utils/bundle.utils';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

const creatorBundlesAllKey = (creatorId: string) => ['bundles', creatorId] as const;
const creatorBundlesListKey = (creatorId: string) =>
	['bundles', creatorId, 'list'] as const;

// =========================================================================
// Creator-side bundle hooks (existing on `dev`)
// =========================================================================

/**
 * Cursor-paginated bundles for a creator.
 *
 * Disabled until `creatorId` is known, matching the `enabled: Boolean(id)`
 * convention used by the other creator-scoped queries.
 */
export function useCreatorBundles(creatorId: string | undefined) {
	return useInfiniteQuery({
		queryKey: creatorBundlesListKey(creatorId ?? ''),
		queryFn: ({ pageParam }) =>
			fetchCreatorBundlesPage(
				creatorId!,
				pageParam as string | null | undefined
			),
		initialPageParam: null as string | null,
		getNextPageParam: lastPage => lastPage.nextCursor ?? undefined,
		enabled: Boolean(creatorId),
	});
}

/**
 * Keys a creator can put into a bundle, derived from the creator's own keys and
 * priced in XLM so the create form can compute a bundle's list price and the
 * price floor it must respect.
 */
export function useBundleKeyOptions(creatorId: string | undefined) {
	const query = useQuery({
		queryKey: queryKeys.creators.list(),
		queryFn: () => courseService.getCourses(),
		enabled: Boolean(creatorId),
		staleTime: 5 * 60_000,
	});

	const options = useMemo<BundleKeyOption[]>(() => {
		if (!creatorId) return [];

		const seen = new Set<string>();
		const result: BundleKeyOption[] = [];

		for (const course of query.data ?? []) {
			if (course.instructorId !== creatorId || seen.has(course.id)) continue;

			const priceStroops = resolveCreatorKeyPriceStroops(course);
			if (priceStroops == null) continue;

			seen.add(course.id);
			result.push({
				id: course.id,
				title: course.title,
				priceXlm: priceStroops / STROOPS_PER_XLM,
			});
		}

		return result.sort((a, b) => a.title.localeCompare(b.title));
	}, [creatorId, query.data]);

	return { ...query, options };
}

/**
 * Submits `create_bundle` with the selected keys, the discounted bundle price
 * and the expiry timestamp.
 *
 * Invalidates the creator's bundles on success so the new bundle appears in the
 * active list with a zero purchase count.
 */
export function useCreateBundleMutation(creatorId: string) {
	const queryClient = useQueryClient();

	return useMutation({
		mutationKey: ['contract', 'create_bundle', creatorId],
		mutationFn: (request: CreateBundleRequest) =>
			submitCreatorContractCall('create_bundle', { creatorId, ...request }),
		onError: error => {
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			void queryClient.invalidateQueries({
				queryKey: creatorBundlesAllKey(creatorId),
			});
			showToast.success('Bundle created');
		},
	});
}

/**
 * Stamps a cancellation onto the cached bundle across every loaded page.
 * Exported for testing the optimistic cache patch in isolation.
 */
export function markBundleCancelled(
	data: InfiniteData<BundlesPage, string | null> | undefined,
	bundleId: string,
	cancelledAt: string
): InfiniteData<BundlesPage, string | null> | undefined {
	if (!data) return data;

	let changed = false;
	const pages = data.pages.map(page => {
		let pageChanged = false;
		const bundles = page.bundles.map(bundle => {
			if (bundle.id !== bundleId) return bundle;
			pageChanged = true;
			return { ...bundle, cancelledAt };
		});
		if (pageChanged) changed = true;
		return pageChanged ? { ...page, bundles } : page;
	});

	return changed ? { ...data, pages } : data;
}

/**
 * Submits `cancel_bundle` for a single bundle.
 *
 * The cached bundle is stamped as cancelled before the call resolves so it
 * leaves the active list immediately, rolling back if the call fails. The
 * query is then invalidated to pick up the authoritative state.
 */
export function useCancelBundleMutation(creatorId: string) {
	const queryClient = useQueryClient();
	const listKey = creatorBundlesListKey(creatorId);

	return useMutation({
		mutationKey: ['contract', 'cancel_bundle', creatorId],
		mutationFn: (bundleId: string) =>
			submitCreatorContractCall('cancel_bundle', { creatorId, bundleId }),
		onMutate: async bundleId => {
			await queryClient.cancelQueries({ queryKey: listKey });
			const previous = queryClient.getQueryData<InfiniteData<BundlesPage, string | null>>(
				listKey
			);
			queryClient.setQueryData<InfiniteData<BundlesPage, string | null>>(
				listKey,
				markBundleCancelled(previous, bundleId, new Date().toISOString())
			);
			return { previous };
		},
		onError: (error, _bundleId, context) => {
			if (context?.previous) {
				queryClient.setQueryData(listKey, context.previous);
			}
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: () => {
			showToast.success('Bundle cancelled');
		},
		onSettled: () => {
			void queryClient.invalidateQueries({ queryKey: listKey });
		},
	});
}

// =========================================================================
// Buyer-side marketplace bundle hooks (issue #981 / #1274)
// =========================================================================

export function useMarketplaceBundles() {
	return useQuery({
		queryKey: queryKeys.bundles.marketplace.list(),
		queryFn: () => marketplaceBundleService.listBundles(),
	});
}

export function useMarketplaceBundle(id: string | undefined) {
	return useQuery({
		queryKey: queryKeys.bundles.marketplace.detail(id ?? ''),
		queryFn: () => marketplaceBundleService.getBundle(id!),
		enabled: !!id,
	});
}

export interface BuyMarketplaceBundleVariables {
	id: string;
	walletAddress?: string;
}

function removePurchasedBundleFromList(
	current: MarketplaceBundle[] | undefined,
	bundleId: string
): MarketplaceBundle[] | undefined {
	if (!Array.isArray(current)) return current;
	return current.filter(bundle => bundle?.id !== bundleId);
}

/**
 * Atomic bundle purchase: the contract call is submitted first and the
 * marketplace record is recorded only after it succeeds. The cached list is
 * patched immediately so a purchased bundle stops being discoverable.
 */
export function useBuyMarketplaceBundle(hookWalletAddress?: string) {
	const queryClient = useQueryClient();
	const listKey = queryKeys.bundles.marketplace.list();

	return useMutation<
		BuyMarketplaceBundleResult,
		Error,
		BuyMarketplaceBundleVariables,
		{ previousList?: MarketplaceBundle[] }
	>({
		mutationKey: ['contract', 'buy_bundle'],
		mutationFn: async ({ id, walletAddress }) => {
			const address = walletAddress ?? hookWalletAddress;
			const contractArgs = address
				? { bundleId: id, walletAddress: address }
				: { bundleId: id };
			await submitCreatorContractCall('buy_bundle', contractArgs);
			if (address) {
				return marketplaceBundleService.buyBundle(id, { walletAddress: address });
			}
			return marketplaceBundleService.buyBundle(id);
		},
		onMutate: async ({ id }) => {
			await queryClient.cancelQueries({ queryKey: listKey });
			const previousList = queryClient.getQueryData<MarketplaceBundle[]>(listKey);
			queryClient.setQueryData<MarketplaceBundle[]>(
				listKey,
				removePurchasedBundleFromList(previousList, id) ?? []
			);
			return { previousList };
		},
		onError: (error, _variables, context) => {
			if (context?.previousList) {
				queryClient.setQueryData(listKey, context.previousList);
			}
			showToast.error(getSignatureErrorMessage(error));
		},
		onSuccess: (_result, { id, walletAddress }) => {
			const address = walletAddress ?? hookWalletAddress;
			const detailKey = queryKeys.bundles.marketplace.detail(id);
			const previousDetail = queryClient.getQueryData<MarketplaceBundle | null>(detailKey);

			queryClient.setQueryData<MarketplaceBundle[]>(
				listKey,
				current => removePurchasedBundleFromList(current, id) ?? []
			);
			queryClient.setQueryData<MarketplaceBundle | null>(detailKey, current => {
				const base = current ?? previousDetail;
				if (!base || base.id !== id) return current;
				return {
					...base,
					purchased: true,
					isPurchased: true,
					purchasedAt: new Date().toISOString(),
				};
			});

			void queryClient.invalidateQueries({
				queryKey: queryKeys.bundles.marketplace.detail(id),
			});
			void queryClient.invalidateQueries({
				queryKey: queryKeys.bundles.marketplace.list(),
			});
			void queryClient.invalidateQueries({ queryKey: ['wallet'] });
			if (address) {
				void queryClient.invalidateQueries({
					queryKey: queryKeys.wallet.holdings(address),
				});
			}
			void queryClient.invalidateQueries({ queryKey: queryKeys.creators.all });
		},
	});
}
