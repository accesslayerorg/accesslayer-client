/**
 * API service for curated key collections (#1481)
 */

import { apiClient } from '@/services/api.service';
import type {
  Collection,
  CreateCollectionInput,
  UpdateCollectionInput,
  AddKeyInput,
  CollectionKey,
} from '@/types/collection.types';

/**
 * Fetch all published collections.
 */
export async function fetchCollections(): Promise<Collection[]> {
  const response = await apiClient.get('/collections', {
    params: { published: true },
  });
  return response.data;
}

/**
 * Fetch a single collection by slug.
 */
export async function fetchCollectionDetail(slug: string): Promise<Collection> {
  const response = await apiClient.get(`/collections/${slug}`);
  return response.data;
}

/**
 * Fetch featured collections for homepage display.
 */
export async function fetchFeaturedCollections(): Promise<Collection[]> {
  const response = await apiClient.get('/collections/featured', {
    params: { limit: 5 },
  });
  return response.data;
}

/**
 * Create a new collection (editor-only).
 */
export async function createCollection(
  input: CreateCollectionInput
): Promise<Collection> {
  const response = await apiClient.post('/collections', input);
  return response.data;
}

/**
 * Update an existing collection.
 */
export async function updateCollection(
  id: string,
  input: UpdateCollectionInput
): Promise<Collection> {
  const response = await apiClient.patch(`/collections/${id}`, input);
  return response.data;
}

/**
 * Add a key to a collection.
 * Returns the new CollectionKey with auto-assigned order.
 */
export async function addKeyToCollection(
  collectionId: string,
  input: AddKeyInput
): Promise<CollectionKey> {
  const response = await apiClient.post(
    `/collections/${collectionId}/keys`,
    input
  );
  return response.data;
}

/**
 * Remove a key from a collection.
 */
export async function removeKeyFromCollection(
  collectionId: string,
  keyId: string
): Promise<void> {
  await apiClient.delete(`/collections/${collectionId}/keys/${keyId}`);
}

/**
 * Reorder keys in a collection.
 * keyIds array determines the new order.
 */
export async function reorderKeys(
  collectionId: string,
  keyIds: string[]
): Promise<CollectionKey[]> {
  const response = await apiClient.post(
    `/collections/${collectionId}/reorder`,
    { keyIds }
  );
  return response.data;
}

/**
 * Follow a collection.
 */
export async function followCollection(collectionId: string): Promise<void> {
  await apiClient.post(`/collections/${collectionId}/follow`);
}

/**
 * Unfollow a collection.
 */
export async function unfollowCollection(collectionId: string): Promise<void> {
  await apiClient.delete(`/collections/${collectionId}/follow`);
}

/**
 * Fetch user's followed collections.
 */
export async function fetchUserFollowedCollections(): Promise<Collection[]> {
  const response = await apiClient.get('/user/followed-collections');
  return response.data;
}
