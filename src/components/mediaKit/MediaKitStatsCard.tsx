import type { MediaKitStats } from '@/hooks/useMediaKit';

interface MediaKitStatsCardProps {
	stats: MediaKitStats;
	updatedAt: Date | null;
}

/** Key stats for a media kit, with the time they were last refreshed (#1475). */
export default function MediaKitStatsCard({ stats, updatedAt }: MediaKitStatsCardProps) {
	const items = [
		{ label: 'Key price', value: stats.priceLabel },
		{ label: 'Holders', value: stats.holdersLabel },
		{ label: '24h volume', value: stats.volume24hLabel },
		{ label: 'Key age', value: stats.ageLabel },
	];
	return (
		<section aria-labelledby="media-kit-stats-heading" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
			<h2 id="media-kit-stats-heading" className="font-grotesque text-lg font-black tracking-tight">
				Stats
			</h2>
			<dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
				{items.map(item => (
					<div key={item.label}>
						<dt className="text-[0.65rem] font-bold uppercase tracking-[0.22em] text-white/40">{item.label}</dt>
						<dd className="mt-1 font-mono text-lg font-bold text-white">{item.value}</dd>
					</div>
				))}
			</dl>
			<p className="mt-3 text-xs text-white/45" data-testid="media-kit-stats-updated">
				{updatedAt ? (
					<>
						Last updated <time dateTime={updatedAt.toISOString()}>{updatedAt.toLocaleString()}</time>
					</>
				) : (
					'Not refreshed yet'
				)}
			</p>
		</section>
	);
}
