import { BaseApiService, type APIResponse } from './api.service';

export interface FeedPost {
	id: string;
	keyId: string;
	authorAddress: string;
	authorName?: string | null;
	content: string;
	imageUrl?: string | null;
	linkUrl?: string | null;
	isGated: boolean;
	minHoldingThreshold: number;
	createdAt: string;
	authorKeyBalance?: number;
	holderCount?: number;
}

export interface FeedPostsPage {
	posts: FeedPost[];
	nextCursor: string | null;
}

export interface CreateFeedPostInput {
	content: string;
	imageUrl?: string;
	linkUrl?: string;
	isGated?: boolean;
	minHoldingThreshold?: number;
}

class KeySocialFeedService extends BaseApiService {
	async getPostsPage(
		keyId: string,
		cursor?: string | null
	): Promise<FeedPostsPage> {
		try {
			const response = await this.api.get<APIResponse<FeedPostsPage>>(
				`/keys/${keyId}/feed`,
				{ params: cursor ? { cursor } : {} }
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async createPost(
		keyId: string,
		input: CreateFeedPostInput
	): Promise<FeedPost> {
		try {
			const response = await this.api.post<APIResponse<FeedPost>>(
				`/keys/${keyId}/feed`,
				input
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async hidePost(postId: string): Promise<FeedPost> {
		try {
			const response = await this.api.patch<APIResponse<FeedPost>>(
				`/feed/${postId}`,
				{ hidden: true }
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const keySocialFeedService = new KeySocialFeedService();
