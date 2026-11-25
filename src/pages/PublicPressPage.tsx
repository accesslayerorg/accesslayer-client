import { useParams } from 'react-router';
import Skeleton from '@/components/ui/skeleton';
import NotFoundPage from '@/pages/NotFoundPage';
import MediaKitStatsCard from '@/components/mediaKit/MediaKitStatsCard';
import MediaKitAssets from '@/components/mediaKit/MediaKitAssets';
import MediaKitCopyBlocks from '@/components/mediaKit/MediaKitCopyBlocks';
import MediaKitQrCode from '@/components/mediaKit/MediaKitQrCode';
import { useCreatorDetail } from '@/hooks/useCreators';
import { mediaKitStats, usePublicMediaKit } from '@/hooks/useMediaKit';
import { buildCopyBlocks, keyPageUrl } from '@/utils/mediaKitCopy';

/**
 * Public press page (#1475) at `/k/:handle/press`. Renders the 404 page when
 * the kit does not exist or its creator has visibility turned off, and shows
 * only the sections the creator enabled.
 */
export default function PublicPressPage() {
	const { handle = '' } = useParams<{ handle: string }>();
	const kitQuery = usePublicMediaKit(handle);
	const kit = kitQuery.data ?? null;
	const detail = useCreatorDetail(kit?.keyId ?? '');

	if (kitQuery.isLoading)
		return (
			<main className="min-h-screen bg-[#06111f] px-6 py-16">
				<Skeleton className="mx-auto h-40 max-w-4xl" />
			</main>
		);
	if (!kit) return <NotFoundPage />;

	const stats = mediaKitStats(detail.data);
	const keyUrl = keyPageUrl(kit.keyId, window.location.origin);
	// Stat-based blocks follow the stats toggle; bio and talking points are
	// already null when the creator hid them.
	const textBlocks = stats
		? buildCopyBlocks(stats, { bio: kit.bio, talkingPoints: kit.talkingPoints, keyUrl }).filter(
				b => kit.showStats || (b.id !== 'one-liner' && b.id !== 'stats')
			)
		: [];

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-4xl space-y-6">
				<header>
					<p className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-amber-300">Press kit</p>
					<h1 className="font-grotesque text-3xl font-black tracking-tight">{stats?.keyName ?? `@${kit.handle}`}</h1>
					{kit.bio && <p className="mt-2 max-w-2xl text-white/70" data-testid="press-bio">{kit.bio}</p>}
				</header>
				{kit.talkingPoints && (
					<section aria-labelledby="press-points-heading" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
						<h2 id="press-points-heading" className="font-grotesque text-lg font-black">Talking points</h2>
						<ul className="mt-2 list-disc space-y-1 pl-5 text-white/80">
							{kit.talkingPoints.map(p => <li key={p}>{p}</li>)}
						</ul>
					</section>
				)}
				{kit.showStats && stats && <MediaKitStatsCard stats={stats} updatedAt={detail.dataUpdatedAt ? new Date(detail.dataUpdatedAt) : null} />}
				{kit.showAssets && stats && (
					<MediaKitAssets
						data={{
							name: stats.keyName,
							handle: kit.handle,
							avatarUrl: stats.avatarUrl,
							priceLabel: stats.priceLabel,
							holdersLabel: `${stats.holdersLabel} holders`,
							keyUrl,
						}}
					/>
				)}
				{textBlocks.length > 0 && <MediaKitCopyBlocks blocks={textBlocks} />}
				{kit.showQrCode && <MediaKitQrCode url={keyUrl} handle={kit.handle} />}
				{kit.contactEmail && (
					<p className="text-sm text-white/70">
						Press contact: <a className="text-amber-300 hover:underline" href={`mailto:${kit.contactEmail}`}>{kit.contactEmail}</a>
					</p>
				)}
			</div>
		</main>
	);
}
