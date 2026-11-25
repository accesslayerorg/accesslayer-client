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

export type AnnouncementStatus = 'draft' | 'scheduled' | 'published';

export interface ScheduledAnnouncement {
	id: string;
	keyId: string;
	title: string;
	category: AnnouncementCategory;
	content: string;
	scheduledAt: string; // ISO 8601 UTC
	status: AnnouncementStatus;
	createdAt: string;
	updatedAt?: string;
}

export interface ScheduleAnnouncementInput {
	keyId: string;
	title: string;
	category: AnnouncementCategory;
	content: string;
	scheduledAt: string; // ISO 8601 UTC
	status?: 'draft' | 'scheduled';
}

export interface UpdateScheduledAnnouncementInput {
	title?: string;
	category?: AnnouncementCategory;
	content?: string;
	scheduledAt?: string; // ISO 8601 UTC
	status?: AnnouncementStatus;
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

	/**
	 * Lists scheduled and draft announcements for a key (#1380).
	 * GET /keys/:keyId/announcements/scheduled
	 */
	async getScheduledAnnouncements(
		keyId: string
	): Promise<ScheduledAnnouncement[]> {
		try {
			const response = await this.api.get<
				APIResponse<ScheduledAnnouncement[]>
			>(`/keys/${encodeURIComponent(keyId)}/announcements/scheduled`);
			return response.data?.data ?? [];
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Schedules an announcement for a future date/time (#1380).
	 * POST /keys/:keyId/announcements/scheduled
	 */
	async scheduleAnnouncement(
		input: ScheduleAnnouncementInput
	): Promise<ScheduledAnnouncement> {
		try {
			const response = await this.api.post<
				APIResponse<ScheduledAnnouncement>
			>(`/keys/${encodeURIComponent(input.keyId)}/announcements/scheduled`, input);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Reschedules or edits an existing scheduled announcement (#1380).
	 * PATCH /announcements/scheduled/:id
	 */
	async updateScheduledAnnouncement(
		id: string,
		input: UpdateScheduledAnnouncementInput
	): Promise<ScheduledAnnouncement> {
		try {
			const response = await this.api.patch<
				APIResponse<ScheduledAnnouncement>
			>(`/announcements/scheduled/${encodeURIComponent(id)}`, input);
			return response.data.data;
		} catch (error) {
			throw this.handleError(error);
		}
	}

	/**
	 * Cancels a scheduled announcement (#1380).
	 * DELETE /announcements/scheduled/:id
	 */
	async cancelScheduledAnnouncement(id: string): Promise<void> {
		try {
			await this.api.delete(`/announcements/scheduled/${encodeURIComponent(id)}`);
		} catch (error) {
			throw this.handleError(error);
		}
	}
}

export const announcementService = new AnnouncementService();
