import { AlertTriangle } from 'lucide-react';
import { useGlobalPause } from '@/hooks/useGlobalPause';

const GlobalPauseBanner: React.FC = () => {
	const { paused, pauseActivatedAt } = useGlobalPause();

	if (!paused) return null;

	const formatted = pauseActivatedAt
		? new Date(pauseActivatedAt).toLocaleString()
		: null;

	return (
		<div
			role="alert"
			aria-live="assertive"
			className="fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-3 bg-red-600 px-4 py-3 text-center text-sm font-bold text-white shadow-lg"
		>
			<AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
			<span>
				Trading is temporarily suspended across all keys. We are working to
				resolve this. Check our <a href="https://status.accesslayer.org" className="underline underline-offset-2">status page</a> for updates.
				{formatted && (
					<span className="ml-2 text-xs font-normal text-white/80">
						Paused since {formatted}
					</span>
				)}
			</span>
		</div>
	);
};

export default GlobalPauseBanner;
