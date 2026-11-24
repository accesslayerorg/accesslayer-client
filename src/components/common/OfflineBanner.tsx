import { WifiOff } from 'lucide-react';
import { useOfflineStatus } from '@/hooks/useOfflineStatus';

export default function OfflineBanner() {
	const isOffline = useOfflineStatus();

	if (!isOffline) return null;

	return (
		<div
			role="alert"
			aria-live="polite"
			className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-2 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-slate-950 shadow-md"
		>
			<WifiOff className="size-4 shrink-0 text-slate-950" aria-hidden="true" />
			<span>
				You are offline &mdash; showing cached read-only data. Trading and signing are disabled.
			</span>
		</div>
	);
}
