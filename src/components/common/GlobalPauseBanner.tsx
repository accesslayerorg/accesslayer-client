import { AlertTriangle } from 'lucide-react';
import { useGlobalPause } from '@/hooks/useGlobalPause';

const formatDateTime = (iso: string) => {
	const date = new Date(iso);
	return Number.isNaN(date.getTime()) ? null : date.toLocaleString();
};

const GlobalPauseBanner: React.FC = () => {
	const { paused, pauseActivatedAt, pauseReason, resumeAt } = useGlobalPause();

	if (!paused) return null;

	const pausedSince = pauseActivatedAt ? formatDateTime(pauseActivatedAt) : null;
	const resumeLabel = resumeAt
		? (formatDateTime(resumeAt) ?? 'Until Further Notice')
		: 'Until Further Notice';

	return (
		<div
			role="alert"
			aria-live="assertive"
			data-testid="global-pause-banner"
			className="fixed inset-x-0 top-0 z-[100] flex flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-red-600 px-4 py-3 text-center text-sm font-bold text-white shadow-lg"
		>
			<AlertTriangle className="size-5 shrink-0" aria-hidden="true" />
			<span>Platform paused — all trading is suspended.</span>
			{pauseReason && (
				<span className="font-normal text-white/90" data-testid="global-pause-reason">
					Reason: {pauseReason}
				</span>
			)}
			<span className="font-normal text-white/90" data-testid="global-pause-resume">
				Expected resume: {resumeLabel}
			</span>
			{pausedSince && (
				<span className="text-xs font-normal text-white/80">
					Paused since {pausedSince}
				</span>
			)}
			<span className="text-xs font-normal text-white/80">
				Check our{' '}
				<a
					href="https://status.accesslayer.org"
					className="underline underline-offset-2"
				>
					status page
				</a>{' '}
				for updates.
			</span>
		</div>
	);
};

export default GlobalPauseBanner;
