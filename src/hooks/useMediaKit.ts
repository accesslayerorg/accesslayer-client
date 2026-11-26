import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/queryKeys';
import { useCreatorDetail } from '@/hooks/useCreators';
import type { Course } from '@/services/course.service';
import {
	defaultMediaKit,
	getMediaKitSettings,
	getPublicMediaKit,
	saveMediaKitSettings,
	type MediaKitInput,
	type MediaKitSettings,
} from '@/services/mediaKit.service';
import {
	formatDisplayKeyPrice,
	resolveCreatorKeyPriceStroops,
} from '@/utils/keyPriceDisplay.utils';
import { formatHolderCount } from '@/utils/numberFormat.utils';
import { resolveCreatorKeyHolderCount } from '@/utils/creatorProfile.utils';

/**
 * The figures a media kit shows. They use the same resolvers and formatters as
 * the key page's stat row (CreatorDetailPage), so the two always agree.
 */
export interface MediaKitStats {
	keyName: string;
	avatarUrl: string | null;
	priceLabel: string;
	holdersLabel: string;
	volume24hLabel: string;
	/** Whole days since the key was created; null when the API does not say. */
	ageDays: number | null;
	ageLabel: string;
}

export function mediaKitStats(
	creator: Course | undefined,
	now: number = Date.now()
): MediaKitStats | null {
	if (!creator) return null;
	const created = creator.createdAt ? Date.parse(creator.createdAt) : NaN;
	const ageDays = Number.isFinite(created)
		? Math.max(0, Math.floor((now - created) / 86_400_000))
		: null;
	return {
		keyName: creator.title,
		avatarUrl: creator.thumbnail ?? null,
		priceLabel: formatDisplayKeyPrice(resolveCreatorKeyPriceStroops(creator)),
		holdersLabel: formatHolderCount(resolveCreatorKeyHolderCount(creator)),
		volume24hLabel: formatDisplayKeyPrice(creator.volume24h ?? 0),
		ageDays,
		ageLabel:
			ageDays === null ? '—' : ageDays === 1 ? '1 day' : `${ageDays} days`,
	};
}

/**
 * A key's media kit (#1475): its settings, a save action, and live stats with
 * the time they were last refreshed.
 */
export function useMediaKit(keyId: string) {
	const queryClient = useQueryClient();
	const detail = useCreatorDetail(keyId);
	const settings = useQuery<MediaKitSettings>({
		queryKey: queryKeys.mediaKit.settings(keyId),
		queryFn: () =>
			getMediaKitSettings(keyId) ??
			defaultMediaKit(keyId, detail.data?.socialHandle ?? detail.data?.title ?? keyId),
		enabled: Boolean(keyId) && !detail.isLoading,
	});
	const save = useMutation({
		mutationFn: async (input: MediaKitInput) => saveMediaKitSettings(input),
		onSuccess: saved => {
			queryClient.setQueryData(queryKeys.mediaKit.settings(keyId), saved);
			void queryClient.invalidateQueries({ queryKey: queryKeys.mediaKit.all() });
		},
	});
	return {
		settings: settings.data ?? null,
		isLoading: detail.isLoading || settings.isLoading,
		stats: mediaKitStats(detail.data),
		statsUpdatedAt: detail.dataUpdatedAt ? new Date(detail.dataUpdatedAt) : null,
		creator: detail.data,
		save,
	};
}

/** The public media kit for a handle; `data` is null when it is not public. */
export function usePublicMediaKit(handle: string) {
	return useQuery({
		queryKey: queryKeys.mediaKit.public(handle),
		queryFn: () => getPublicMediaKit(handle),
		enabled: Boolean(handle),
	});
}
