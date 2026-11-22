export interface FeatureFlagConfig {
	enabled?: boolean;
	rolloutPercentage?: number;
}

export type FeatureFlags = Record<string, FeatureFlagConfig>;

function stableBucket(value: string): number {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return (hash >>> 0) % 100;
}

export function isFeatureEnabled(
	flags: FeatureFlags,
	name: string,
	subjectId: string
): boolean {
	const flag = flags[name];
	if (!flag || flag.enabled === false) return false;
	if (flag.rolloutPercentage === undefined) return flag.enabled === true;

	const percentage = Math.max(0, Math.min(100, flag.rolloutPercentage));
	return stableBucket(`${name}:${subjectId}`) < percentage;
}

export function parseFeatureFlags(raw: string | undefined): FeatureFlags {
	if (!raw) return {};
	try {
		const parsed: unknown = JSON.parse(raw);
		if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
		return parsed as FeatureFlags;
	} catch {
		return {};
	}
}
