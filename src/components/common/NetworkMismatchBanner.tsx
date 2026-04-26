import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNetworkMismatch } from '@/hooks/useNetworkMismatch';

interface NetworkMismatchBannerProps {
	className?: string;
}

/**
 * Displays a warning banner when the connected wallet is on a different
 * network than the app's configured default chain.
 *
 * Renders nothing when there is no mismatch or no wallet is connected,
 * so it is safe to place unconditionally in any layout.
 */
const NetworkMismatchBanner: React.FC<NetworkMismatchBannerProps> = ({
	className,
}) => {
	const { isMismatch, expectedChainName } = useNetworkMismatch();

	if (!isMismatch) {
		return null;
	}

	return (
		<div
			role="alert"
			aria-live="polite"
			className={cn(
				'rounded-2xl border border-red-400/30 bg-gradient-to-r from-red-500/10 via-red-400/5 to-orange-400/10 p-4',
				className
			)}
		>
			<div className="flex items-start gap-3">
				<div className="mt-0.5 shrink-0 rounded-full bg-red-500/15 p-2 text-red-300">
					<AlertTriangle className="size-4" aria-hidden="true" />
				</div>
				<div className="min-w-0 flex-1">
					<div className="mb-1 inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-red-300/85">
						Network mismatch
					</div>
					<p className="font-jakarta text-sm font-bold text-red-100">
						Wrong network detected
					</p>
					<p className="mt-1 text-xs text-red-100/75">
						Your wallet is connected to an unsupported network. Switch to{' '}
						<span className="font-semibold text-red-100">
							{expectedChainName}
						</span>{' '}
						to enable trade actions. You can still browse the marketplace in
						read-only mode.
					</p>
				</div>
			</div>
		</div>
	);
};

export default NetworkMismatchBanner;
