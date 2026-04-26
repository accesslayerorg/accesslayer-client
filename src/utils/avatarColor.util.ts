const stringHash = (value: string) => {
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
	}
	return hash;
};

export const getFallbackAvatarColors = (creatorId?: string | number | null) => {
	const normalizedId = String(creatorId ?? '').trim();
	const hash = stringHash(normalizedId || 'fallback-avatar');
	const baseHue = hash % 360;
	const accentHue = (baseHue + 28) % 360;

	return {
		background: `linear-gradient(135deg, hsl(${baseHue} 65% 28%), hsl(${accentHue} 72% 36%))`,
		textColor: 'rgba(255, 255, 255, 0.95)',
	};
};
