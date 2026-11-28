/**
 * React Query hooks for collections (#1481)
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import {
  fetchCollections,
  fetchCollectionDetail,
  fetchFeaturedCollections,
  fetchUserFollowedCollections,
  createCollection,
  addKeyToCollection,
  removeKeyFromCollection,
  reorderKeys,
  followCollection,
  unfollowCollection,
} from '@/services/collection.service';
import type {
  CreateCollectionInput,
  AddKeyInput,
} from '@/types/collection.types';
import showToast from '@/utils/toast.util';
import { getSignatureErrorMessage } from '@/utils/errorHandling.utils';

/**
 * Query: all published collections
 */
export function useCollections() {
  return useQuery({
    queryKey: queryKeys.collections.list(),
    queryFn: () => fetchCollections(),
    staleTime: 5 * 60_000,
  });
}

/**
 * Query: featured collections for homepage
 */
export function useFeaturedCollections() {
  return useQuery({
    queryKey: queryKeys.collections.featured(),
    queryFn: () => fetchFeaturedCollections(),
    staleTime: 5 * 60_000,
  });
}

/**
 * Query: single collection detail
 */
export function useCollectionDetail(slug: string) {
  return useQuery({
    queryKey: queryKeys.collections.detail(slug),
    queryFn: () => fetchCollectionDetail(slug),
    enabled: !!slug,
  });
}

/**
 * Query: user's followed collections
 */
export function useFollowedCollections(wallet: string) {
  return useQuery({
    queryKey: queryKeys.collections.followed(wallet),
    queryFn: () => fetchUserFollowedCollections(),
    enabled: !!wallet,
    staleTime: 5 * 60_000,
  });
}

/**
 * Mutation: create collection (editors only)
 */
export function useCreateCollectionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateCollectionInput) => createCollection(input),
    onError: error => {
      showToast.error(getSignatureErrorMessage(error));
    },
    onSuccess: () => {
      showToast.success('Collection created');
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collections.all(),
      });
    },
  });
}

/**
 * Mutation: add key to collection
 */
export function useAddKeyToCollectionMutation(collectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: AddKeyInput) =>
      addKeyToCollection(collectionId, input),
    onError: error => {
      showToast.error(getSignatureErrorMessage(error));
    },
    onSuccess: () => {
      showToast.success('Key added to collection');
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collections.detail(''),
      });
    },
  });
}

/**
 * Mutation: remove key from collection
 */
export function useRemoveKeyFromCollectionMutation(collectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyId: string) =>
      removeKeyFromCollection(collectionId, keyId),
    onError: error => {
      showToast.error(getSignatureErrorMessage(error));
    },
    onSuccess: () => {
      showToast.success('Key removed from collection');
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collections.detail(''),
      });
    },
  });
}

/**
 * Mutation: reorder keys in collection
 */
export function useReorderKeysMutation(collectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (keyIds: string[]) => reorderKeys(collectionId, keyIds),
    onError: error => {
      showToast.error(getSignatureErrorMessage(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collections.detail(''),
      });
    },
  });
}

/**
 * Mutation: follow collection
 */
export function useFollowCollectionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (collectionId: string) => followCollection(collectionId),
    onError: error => {
      showToast.error(getSignatureErrorMessage(error));
    },
    onSuccess: () => {
      showToast.success('Collection followed');
      // Invalidate all collection queries since follow state changed
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collections.all(),
      });
    },
  });
}

/**
 * Mutation: unfollow collection
 */
export function useUnfollowCollectionMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (collectionId: string) => unfollowCollection(collectionId),
    onError: error => {
      showToast.error(getSignatureErrorMessage(error));
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.collections.all(),
      });
    },
  });
}
