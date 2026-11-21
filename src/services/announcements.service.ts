// src/services/announcements.service.ts
import { BaseApiService, type APIResponse } from './api.service';
import {
	normalizeAnnouncementCategory,
	type Announcement,
	type AnnouncementPage,
} from '@/utils/announcements.utils';
import {
	toActionAttribution,
	type ActionAttributionDto,
} from '@/utils/actionAttribution.utils';

interface AnnouncementDto extends ActionAttributionDto {
	id: string;
	title: string;
	category?: string;
	publishedAt?: string;
	published_at?: string;
	summary?: string;
	excerpt?: string;
}

function toAnnouncement(dto: AnnouncementDto): Announcement {
	return {
		id: dto.id,
		title: dto.title,
		category: normalizeAnnouncementCategory(dto.category),
		publishedAt: dto.publishedAt ?? dto.published_at ?? new Date().toISOString(),
		summary: dto.summary ?? dto.excerpt ?? '',
		postedBy: toActionAttribution(dto),
	};
}

class AnnouncementsService extends BaseApiService {
	/** Paginated announcements for a creator (#1175). */
	async getAnnouncements(
		creatorId: string,
		page = 1,
		limit = 10
	): Promise<AnnouncementPage> {
		try {
			const response = await this.api.get<
				APIResponse<{ announcements: AnnouncementDto[]; nextPage?: number | null }>
			>(`/announcements/${creatorId}`, { params: { page, limit } });

			const payload = response.data?.data;
			return {
				announcements: (payload?.announcements ?? []).map(toAnnouncement),
				nextPage:
					payload?.nextPage === undefined || payload?.nextPage === null
						? null
						: payload.nextPage,
			};
		} catch {
			// An empty feed is a valid state — never block the detail page.
			return { announcements: [], nextPage: null };
		}
	}

	/**
	 * Full announcement body, loaded from IPFS on expand (#1175).
	 * Returns a plain string so the item can render it as markdown/text.
	 */
	async getAnnouncementContent(announcementId: string): Promise<string> {
		try {
			const response = await this.api.get<APIResponse<{ content?: string } | string>>(
				`/announcements/${announcementId}/content`
			);
			const data = response.data?.data;
			return typeof data === 'string' ? data : (data?.content ?? '');
		} catch {
			return '';
		}
	}
}

export const announcementsService = new AnnouncementsService();

export async function fetchAnnouncementsPage(
	creatorId: string,
	page = 1,
	limit = 10
): Promise<AnnouncementPage> {
	return announcementsService.getAnnouncements(creatorId, page, limit);
}

export async function fetchAnnouncementContent(
	announcementId: string
): Promise<string> {
	return announcementsService.getAnnouncementContent(announcementId);
}
