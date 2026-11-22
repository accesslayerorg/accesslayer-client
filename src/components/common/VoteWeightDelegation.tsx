import { useState } from 'react';
import { ChevronDown, ChevronUp, Users, Wallet, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DelegatorInfo {
	walletAddress: string;
	delegatedWeight: string;
}

export interface VoteWeightData {
	ownWeight: string;
	delegatedWeight: string;
	totalEffectiveWeight: string;
	delegators: DelegatorInfo[];
	isDelegate: boolean;
}

interface VoteWeightDelegationProps {
	weightData: VoteWeightData;
	className?: string;
}

/**
 * #1178 — Displays vote weight breakdown in the governance vote modal.
 * Shows own weight, delegated weight, total effective weight, and an
 * expandable delegators list. Shows "Delegating As" indicator when the
 * connected wallet votes on behalf of delegators.
 */
export function VoteWeightDelegation({ weightData, className }: VoteWeightDelegationProps) {
	const [expanded, setExpanded] = useState(false);
	const hasDelegation = weightData.delegatedWeight !== '0';

	// No delegation section when delegated weight is zero
	if (!hasDelegation) {
		return (
			<div className={cn('rounded-lg border border-slate-700 bg-slate-800/50 p-3', className)}>
				<div className="flex items-center justify-between text-sm">
					<span className="text-slate-400">Vote Weight</span>
					<span className="font-semibold text-white">{weightData.ownWeight}</span>
				</div>
			</div>
		);
	}

	return (
		<div className={cn('rounded-lg border border-slate-700 bg-slate-800/50', className)}>
			<div className="space-y-2 p-3">
				<div className="flex items-center justify-between text-sm">
					<span className="flex items-center gap-1.5 text-slate-400">
						<Wallet className="h-3.5 w-3.5" />
						Own Weight
					</span>
					<span className="font-medium text-white">{weightData.ownWeight}</span>
				</div>
				<div className="flex items-center justify-between text-sm">
					<span className="flex items-center gap-1.5 text-slate-400">
						<Users className="h-3.5 w-3.5" />
						Delegated Weight
					</span>
					<span className="font-medium text-white">{weightData.delegatedWeight}</span>
				</div>
				<div className="flex items-center justify-between border-t border-slate-700 pt-2 text-sm">
					<span className="font-medium text-slate-300">Total Effective Weight</span>
					<span className="font-semibold text-amber-400">{weightData.totalEffectiveWeight}</span>
				</div>

				{weightData.isDelegate && (
					<div className="flex items-center gap-1.5 rounded bg-amber-500/10 px-2 py-1 text-xs text-amber-400">
						<Shield className="h-3 w-3" />
						Delegating As: {weightData.delegators.length} wallet{weightData.delegators.length !== 1 ? 's' : ''}
					</div>
				)}

				{/* Expandable delegators list */}
				{weightData.delegators.length > 0 && (
					<div>
						<button
							onClick={() => setExpanded(!expanded)}
							className="flex items-center gap-1 text-xs text-slate-400 hover:text-white"
							aria-expanded={expanded}
						>
							{expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
							{expanded ? 'Hide' : 'Show'} {weightData.delegators.length} delegator{weightData.delegators.length !== 1 ? 's' : ''}
						</button>
						{expanded && (
							<div className="mt-2 space-y-1.5">
								{weightData.delegators.map((d) => (
									<div
										key={d.walletAddress}
										className="flex items-center justify-between rounded bg-slate-800 px-2 py-1.5 text-xs"
									>
										<span className="text-slate-400">
											{d.walletAddress.slice(0, 6)}...{d.walletAddress.slice(-4)}
										</span>
										<span className="font-medium text-white">{d.delegatedWeight}</span>
									</div>
								))}
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
