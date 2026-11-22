import { BaseApiService, type APIResponse } from './api.service';

export const ANNOUNCEMENT_CATEGORIES = [
	'update',
	'event',
	'milestone',
	'general',
] as const;

export type AnnouncementCategory = (typeof ANNOUNCEMENT_CATEGORIES)[number];

export interface CreatorAnnouncement {
	id: string;
	title: string;
	category: AnnouncementCategory;
	/** IPFS hash of the announcement body. */
	contentHash: string;
	createdAt: string;
}

class AnnouncementService extends BaseApiService {
	/**
	 * Pins announcement body text to IPFS and resolves with its content hash (#1159).
	 * POST /ipfs/pin
	 */
	async uploadAnnouncementContent(content: string): Promise<string> {
		try {
			const response = await this.api.post<APIResponse<{ hash: string }>>(
				'/ipfs/pin',
				{ content }
			);
			return response.data.data.hash;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Announcements a creator has posted to key holders (#1159).
	 * GET /creators/:creatorId/announcements
	 */
	async getCreatorAnnouncements(
		creatorId: string
	): Promise<CreatorAnnouncement[]> {
		try {
			const response = await this.api.get<
				APIResponse<CreatorAnnouncement[]>
			>(`/creators/${creatorId}/announcements`);
			return response.data.data ?? [];
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const announcementService = new AnnouncementService();
