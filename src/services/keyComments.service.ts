import { BaseApiService, type APIResponse } from './api.service';

export interface KeyComment {
	id: string;
	keyId: string;
	authorAddress: string;
	authorName?: string | null;
	content: string;
	parentId?: string | null;
	createdAt: string;
	authorKeyBalance?: number;
	replies?: KeyComment[];
}

export interface KeyCommentsPage {
	comments: KeyComment[];
	nextCursor: string | null;
}

export interface CreateKeyCommentInput {
	content: string;
	parentId?: string;
}

class KeyCommentsService extends BaseApiService {
	async getCommentsPage(
		keyId: string,
		cursor?: string | null
	): Promise<KeyCommentsPage> {
		try {
			const response = await this.api.get<APIResponse<KeyCommentsPage>>(
				`/keys/${keyId}/comments`,
				{ params: cursor ? { cursor } : {} }
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async createComment(
		keyId: string,
		input: CreateKeyCommentInput
	): Promise<KeyComment> {
		try {
			const response = await this.api.post<APIResponse<KeyComment>>(
				`/keys/${keyId}/comments`,
				input
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	async hideComment(commentId: string): Promise<KeyComment> {
		try {
			const response = await this.api.patch<APIResponse<KeyComment>>(
				`/comments/${commentId}`,
				{ hidden: true }
			);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const keyCommentsService = new KeyCommentsService();
