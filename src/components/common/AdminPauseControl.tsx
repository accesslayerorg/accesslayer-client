/**
 * AdminPauseControl (#953)
 *
 * Emergency pause / unpause toggle for the Access Layer contract.
 * Per the spec:
 *  - Only rendered/visible to authorised admin wallets.
 *  - Allows toggling the contract pause state.
 */

import React from 'react';
import { useAccount } from 'wagmi';
import { Shield, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
	useContractPausedStore,
	selectIsPaused,
	isAuthorizedAdminWallet,
} from '@/hooks/useContractPausedStore';
import toast from 'react-hot-toast';

export interface AdminPauseControlProps {
	/** Optional wallet address override (otherwise uses wagmi's useAccount). */
	walletAddress?: string;
	className?: string;
}

const AdminPauseControl: React.FC<AdminPauseControlProps> = ({
	walletAddress,
	className,
}) => {
	const { address } = useAccount();
	const activeAddress = walletAddress ?? address;

	const isPaused = useContractPausedStore(selectIsPaused);
	const togglePause = useContractPausedStore(state => state.togglePause);

	// Only visible to authorised admin wallets
	if (!isAuthorizedAdminWallet(activeAddress)) {
		return null;
	}

	const handleToggle = () => {
		const nextState = !isPaused;
		togglePause();
		if (nextState) {
			toast.error('Emergency pause activated. All trading disabled.');
		} else {
			toast.success('Contract unpaused. Trading resumed.');
		}
	};

	return (
		<div
			data-testid="admin-pause-panel"
			className={cn(
				'flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3',
				'rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 sm:px-4',
				className
			)}
		>
			<div className="flex items-center gap-2.5">
				<div className="flex size-7 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
					{isPaused ? (
						<ShieldAlert className="size-4 text-red-400" aria-hidden="true" />
					) : (
						<Shield className="size-4 text-amber-400" aria-hidden="true" />
					)}
				</div>
				<div>
					<p className="text-xs font-bold tracking-wide uppercase text-amber-300">
						Admin Controls
					</p>
					<p className="text-xs text-white/70">
						Contract status:{' '}
						<span
							className={cn(
								'font-semibold',
								isPaused ? 'text-red-400' : 'text-emerald-400'
							)}
						>
							{isPaused ? 'Paused (Trading Suspended)' : 'Active (Trading Open)'}
						</span>
					</p>
				</div>
			</div>

			<Button
				type="button"
				size="sm"
				variant={isPaused ? 'default' : 'destructive'}
				onClick={handleToggle}
				data-testid="admin-pause-toggle"
				aria-label={isPaused ? 'Unpause contract' : 'Emergency pause contract'}
				className={cn(
					'rounded-lg font-bold text-xs',
					isPaused
						? 'bg-emerald-600 hover:bg-emerald-500 text-white'
						: 'bg-red-600 hover:bg-red-500 text-white'
				)}
			>
				{isPaused ? (
					<>
						<ShieldCheck className="mr-1.5 size-3.5" aria-hidden="true" />
						Resume Contract
					</>
				) : (
					<>
						<ShieldAlert className="mr-1.5 size-3.5" aria-hidden="true" />
						Emergency Pause
					</>
				)}
			</Button>
		</div>
	);
};

export default AdminPauseControl;
