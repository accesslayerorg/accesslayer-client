export const STALE_THRESHOLD_MS = 5 * 60 * 1000;

interface StaleBadgeProps {
	dataUpdatedAt: number;
}

export default function StaleBadge({ dataUpdatedAt }: StaleBadgeProps) {
	const isStale = Date.now() - dataUpdatedAt > STALE_THRESHOLD_MS;

	if (!isStale) return null;

	return (
		<span
			role="status"
			aria-label="Data may be outdated"
			className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
		>
			Data may be outdated
		</span>
	);
}
