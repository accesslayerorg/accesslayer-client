const stringHash = (value: string) => {
	let hash = 0;
	for (let i = 0; i < value.length; i += 1) {
		hash = (hash * 31 + value.charCodeAt(i)) >>> 0;
	}
	return hash;
};

export const getCreatorGradientFallback = (
	identifier?: string | number | null
) => {
	const normalizedIdentifier = String(identifier ?? 'creator-fallback').trim() || 'creator-fallback';
	const hash = stringHash(normalizedIdentifier);
	const baseHue = hash % 360;
	const accentHue = (baseHue + 28) % 360;

	// Use darker mid-lightness HSL values so white text remains readable over
	// the gradient. The chosen lightness range keeps contrast high enough for
	// WCAG AA against white overlay text.
	return `linear-gradient(135deg, hsl(${baseHue} 65% 28%), hsl(${accentHue} 72% 36%))`;
};

export const getFallbackAvatarColors = (creatorId?: string | number | null) => {
	return {
		background: getCreatorGradientFallback(creatorId),
		textColor: 'rgba(255, 255, 255, 0.95)',
	};
};
