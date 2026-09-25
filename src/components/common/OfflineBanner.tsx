import { useOfflineStatus } from '@/hooks/useOfflineStatus';

export default function OfflineBanner() {
	const isOffline = useOfflineStatus();

	if (!isOffline) return null;

	return (
		<div
			role="alert"
			aria-live="polite"
			className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center bg-amber-500 px-4 py-2 text-center text-sm font-medium text-white"
		>
			You are offline &mdash; showing cached data
		</div>
	);
}
