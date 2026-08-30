import { AlertTriangle } from 'lucide-react';

interface GlobalPauseBannerProps {
	pauseActivatedAt?: string;
}

const GlobalPauseBanner: React.FC<GlobalPauseBannerProps> = ({
	pauseActivatedAt,
}) => {
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
				resolve this.
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
