import React from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface CreatorProfileErrorStateProps {
	/** Optional specific error object or message */
	error?: Error | string | null;
	/** Callback function to retry fetching creator profile data */
	onRetry?: () => void;
	/** Whether a retry fetch operation is currently in-flight */
	isRetrying?: boolean;
	/** Custom title override */
	title?: string;
	/** Custom message override */
	message?: string;
}

export const CreatorProfileErrorState: React.FC<CreatorProfileErrorStateProps> = ({
	error,
	onRetry,
	isRetrying = false,
	title = 'Unable to load this creator profile',
	message,
}) => {
	const errorMessage =
		message ||
		(error instanceof Error
			? error.message
			: typeof error === 'string'
				? error
				: "We couldn't load the latest profile details due to a network error. Check your connection and try again.");

	return (
		<div
			role="alert"
			aria-live="polite"
			className="marketplace-card-surface flex min-h-[18rem] flex-col items-center justify-center rounded-[2rem] border border-red-500/20 bg-red-500/5 p-6 text-center shadow-[0_24px_80px_-60px_rgba(8,17,31,0.95)] md:p-8"
		>
			<div className="mb-4 rounded-full border border-red-400/25 bg-red-500/10 p-3 text-red-200">
				<AlertCircle className="size-6" aria-hidden="true" />
			</div>
			<h2 className="font-grotesque text-2xl font-black tracking-tight text-white">
				{title}
			</h2>
			<p className="mt-2 max-w-md font-jakarta text-sm leading-relaxed text-white/60">
				{errorMessage}
			</p>
			{onRetry && (
				<Button
					type="button"
					variant="outline"
					onClick={onRetry}
					disabled={isRetrying}
					className="mt-5 rounded-xl border-white/10 bg-white/5 px-5 font-bold text-white transition-all hover:border-amber-500/30 hover:bg-amber-500/10"
				>
					<RefreshCw
						className={isRetrying ? 'size-4 animate-spin' : 'size-4'}
						aria-hidden="true"
					/>
					{isRetrying ? 'Retrying...' : 'Retry'}
				</Button>
			)}
		</div>
	);
};

export default CreatorProfileErrorState;
