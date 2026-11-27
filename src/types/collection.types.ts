/**
 * Types for curated key collections feature (#1481)
 */

export interface Collection {
  id: string;
  slug: string;
  title: string;
  description?: string;
  coverImage?: string;
  keyCount: number;
  isPublished: boolean;
  createdBy: string;
  keys: CollectionKey[];
  createdAt: string;
  updatedAt: string;
}

export interface CollectionKey {
  keyId: string;
  order: number;
  annotation?: string;
}

export interface CreateCollectionInput {
  title: string;
  description?: string;
  coverImage?: string;
}

export interface UpdateCollectionInput {
  title?: string;
  description?: string;
  coverImage?: string;
  isPublished?: boolean;
}

export interface AddKeyInput {
  keyId: string;
  annotation?: string;
}

export interface CollectionFollow {
  collectionId: string;
  userId: string;
  followedAt: string;
}
