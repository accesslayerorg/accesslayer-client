/**
 * ContractPausedBanner (#953)
 *
 * Full-width banner shown at the top of the app when the contract emergency
 * pause is active. Dismissed automatically when the contract is unpaused
 * (the store polling handles this).
 *
 * When paused:
 *  - Renders a prominent red/amber banner with an explanation.
 *  - All trade action buttons elsewhere are disabled (enforced by callers
 *    reading `selectIsPaused` from the store).
 *
 * When not paused (or still checking): renders nothing.
 */

import { AnimatePresence, motion } from 'framer-motion';
import { ShieldAlert } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	useContractPausedStore,
	selectIsPaused,
} from '@/hooks/useContractPausedStore';

interface ContractPausedBannerProps {
	className?: string;
}

const ContractPausedBanner: React.FC<ContractPausedBannerProps> = ({
	className,
}) => {
	const isPaused = useContractPausedStore(selectIsPaused);

	return (
		<AnimatePresence>
			{isPaused && (
				<motion.div
					key="contract-paused-banner"
					role="alert"
					aria-live="assertive"
					aria-atomic="true"
					initial={{ opacity: 0, y: -12 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: -12 }}
					transition={{ duration: 0.25 }}
					className={cn(
						'relative z-50 w-full overflow-hidden',
						'border-b border-red-500/40 bg-gradient-to-r from-red-900/80 via-red-800/70 to-orange-900/60',
						'backdrop-blur-md',
						className
					)}
				>
					{/* Subtle animated shimmer to draw attention */}
					<div
						aria-hidden="true"
						className="pointer-events-none absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(255,255,255,0.04)_50%,transparent_100%)] animate-[shimmer_2s_linear_infinite]"
					/>

					<div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
						<div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-red-500/20">
							<ShieldAlert
								className="size-4 text-red-300"
								aria-hidden="true"
							/>
						</div>

						<div className="min-w-0 flex-1">
							<p className="text-sm font-bold text-red-100">
								Trading suspended — contract paused
							</p>
							<p className="mt-0.5 text-xs leading-relaxed text-red-200/75">
								The Access Layer contract has been temporarily paused by
								the admin. All buy, sell, stake, and transfer actions are
								disabled until it is unpaused. Read-only browsing
								continues normally.
							</p>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
};

export default ContractPausedBanner;
