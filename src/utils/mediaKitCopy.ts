import type { MediaKitStats } from '@/hooks/useMediaKit';

/** The key page a media kit's QR code and links point to. */
export function keyPageUrl(keyId: string, origin: string): string {
	return `${origin.replace(/\/$/, '')}/keys/${encodeURIComponent(keyId)}`;
}

export function pressPageUrl(handle: string, origin: string): string {
	return `${origin.replace(/\/$/, '')}/k/${encodeURIComponent(handle)}/press`;
}

export interface CopyBlock {
	id: string;
	label: string;
	text: string;
}

/** Copy-ready text for press and partners (#1475). */
export function buildCopyBlocks(
	stats: MediaKitStats,
	opts: { bio?: string | null; talkingPoints?: string[] | null; keyUrl: string }
): CopyBlock[] {
	const blocks: CopyBlock[] = [
		{
			id: 'one-liner',
			label: 'One-liner',
			text: `${stats.keyName} is on AccessLayer: ${stats.holdersLabel} holders, key price ${stats.priceLabel}. ${opts.keyUrl}`,
		},
		{
			id: 'stats',
			label: 'Stats',
			text: [
				`Key price: ${stats.priceLabel}`,
				`Holders: ${stats.holdersLabel}`,
				`24h volume: ${stats.volume24hLabel}`,
				`Key age: ${stats.ageLabel}`,
			].join('\n'),
		},
	];
	if (opts.bio) blocks.push({ id: 'bio', label: 'Bio', text: opts.bio });
	if (opts.talkingPoints?.length)
		blocks.push({
			id: 'talking-points',
			label: 'Talking points',
			text: opts.talkingPoints.map(p => `• ${p}`).join('\n'),
		});
	return blocks;
}
