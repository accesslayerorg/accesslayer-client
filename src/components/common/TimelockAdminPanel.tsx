import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import {
	useTimelockStore,
	isAuthorizedAdminWallet,
	selectPendingActions,
	selectHistoryActions,
	type TimelockAction,
} from '@/hooks/useTimelockStore';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Shield, Clock, CheckCircle2, Play, Ban } from 'lucide-react';
import toast from 'react-hot-toast';

export interface TimelockAdminPanelProps {
	walletAddress?: string;
	className?: string;
}

function formatCountdown(ms: number): string {
	if (ms <= 0) return 'Ready to execute';
	const totalSeconds = Math.floor(ms / 1000);
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;

	if (hours > 0) {
		return `${hours}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s remaining`;
	}
	if (minutes > 0) {
		return `${minutes}m ${seconds.toString().padStart(2, '0')}s remaining`;
	}
	return `${seconds}s remaining`;
}

export const TimelockAdminPanel: React.FC<TimelockAdminPanelProps> = ({
	walletAddress,
	className,
}) => {
	const { address } = useAccount();
	const activeAddress = walletAddress ?? address;
	const isAuthorized = isAuthorizedAdminWallet(activeAddress);

	const [activeTab, setActiveTab] = useState<'pending' | 'history'>('pending');
	const [currentTime, setCurrentTime] = useState<number>(Date.now());

	const actions = useTimelockStore(state => state.actions);
	const executeAction = useTimelockStore(state => state.executeAction);
	const cancelAction = useTimelockStore(state => state.cancelAction);
	const isSubmitting = useTimelockStore(state => state.isSubmitting);

	const pendingActions = selectPendingActions({ actions });
	const historyActions = selectHistoryActions({ actions });

	// Tick timer every second for accurate live countdowns
	useEffect(() => {
		const interval = window.setInterval(() => {
			setCurrentTime(Date.now());
		}, 1000);
		return () => window.clearInterval(interval);
	}, []);

	// Role check: Admin only (#964)
	if (!isAuthorized) {
		return null;
	}

	const handleExecute = async (action: TimelockAction) => {
		const success = await executeAction(action.id, currentTime);
		if (success) {
			toast.success(`Action "${action.title}" executed on-chain.`);
		} else {
			toast.error('Failed to execute action. Delay may not have elapsed.');
		}
	};

	const handleCancel = async (action: TimelockAction) => {
		const success = await cancelAction(action.id);
		if (success) {
			toast.success(`Action "${action.title}" cancelled.`);
		} else {
			toast.error('Failed to cancel action.');
		}
	};

	return (
		<div
			className={cn(
				'relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 p-6 backdrop-blur-md transition-all shadow-xl',
				className
			)}
			data-testid="timelock-admin-panel"
		>
			{/* Header */}
			<div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
				<div className="flex items-center gap-3">
					<div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
						<Shield className="size-5" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="font-grotesque text-lg font-bold text-white tracking-tight">
								Timelock Governance
							</h3>
							<span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-widest border border-amber-500/30">
								Admin Key Management
							</span>
						</div>
						<p className="text-xs text-white/50 mt-0.5">
							Manage proposed timelocked actions awaiting on-chain execution buffer
						</p>
					</div>
				</div>

				{/* Tab Selector */}
				<div
					role="tablist"
					aria-label="Timelock action categories"
					className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1"
				>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'pending'}
						onClick={() => setActiveTab('pending')}
						className={cn(
							'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
							activeTab === 'pending'
								? 'bg-amber-500 text-slate-950 shadow-sm'
								: 'text-white/60 hover:text-white'
						)}
						data-testid="tab-pending-actions"
					>
						<Clock className="size-3.5" />
						<span>Pending Actions</span>
						<span
							className={cn(
								'ml-1 rounded-full px-1.5 py-0.2 text-[10px]',
								activeTab === 'pending'
									? 'bg-slate-950/20 text-slate-950'
									: 'bg-white/10 text-white/80'
							)}
						>
							{pendingActions.length}
						</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'history'}
						onClick={() => setActiveTab('history')}
						className={cn(
							'flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all',
							activeTab === 'history'
								? 'bg-amber-500 text-slate-950 shadow-sm'
								: 'text-white/60 hover:text-white'
						)}
						data-testid="tab-history-actions"
					>
						<CheckCircle2 className="size-3.5" />
						<span>Action History</span>
						<span
							className={cn(
								'ml-1 rounded-full px-1.5 py-0.2 text-[10px]',
								activeTab === 'history'
									? 'bg-slate-950/20 text-slate-950'
									: 'bg-white/10 text-white/80'
							)}
						>
							{historyActions.length}
						</span>
					</button>
				</div>
			</div>

			{/* Tab 1: Pending Actions List */}
			{activeTab === 'pending' && (
				<div className="mt-5 space-y-4" data-testid="pending-actions-list">
					{pendingActions.length === 0 ? (
						<div className="py-12 text-center text-white/40 text-sm">
							No pending timelocked actions found.
						</div>
					) : (
						pendingActions.map(action => {
							const remainingMs = Math.max(
								0,
								action.earliestExecutionTime - currentTime
							);
							const isReady = remainingMs === 0;

							return (
								<div
									key={action.id}
									className="group rounded-xl border border-white/10 bg-white/[0.02] p-4 transition-all hover:border-white/20 hover:bg-white/[0.04]"
									data-testid={`timelock-action-${action.id}`}
								>
									<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
										<div className="space-y-1">
											<div className="flex flex-wrap items-center gap-2">
												<span className="rounded-md bg-blue-500/10 px-2 py-0.5 font-mono text-[10px] font-semibold text-blue-300 border border-blue-500/20">
													{action.actionType}
												</span>
												<h4 className="font-semibold text-sm text-white">
													{action.title}
												</h4>
											</div>
											<p className="text-xs text-white/60">
												{action.description}
											</p>
										</div>

										{/* Countdown Badge */}
										<div className="shrink-0 flex items-center gap-1.5">
											{isReady ? (
												<span className="flex items-center gap-1.5 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
													<CheckCircle2 className="size-3.5" />
													Ready to execute
												</span>
											) : (
												<span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-2.5 py-1 text-xs font-semibold text-amber-300 border border-amber-500/30">
													<Clock className="size-3.5 animate-pulse" />
													{formatCountdown(remainingMs)}
												</span>
											)}
										</div>
									</div>

									{/* Proposed Parameters */}
									<div className="mt-3 rounded-lg border border-white/5 bg-black/40 p-3">
										<div className="text-[11px] font-bold text-white/40 uppercase tracking-wider mb-1.5">
											Proposed Parameters
										</div>
										<div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
											{Object.entries(action.parameters).map(([key, val]) => (
												<div
													key={key}
													className="flex items-center justify-between gap-2 overflow-hidden rounded bg-white/[0.03] px-2 py-1"
												>
													<span className="text-white/50 truncate">{key}:</span>
													<span className="text-amber-200/90 truncate font-semibold">
														{String(val)}
													</span>
												</div>
											))}
										</div>
									</div>

									{/* Footer with Execution Info & Controls */}
									<div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-white/5">
										<div className="text-xs text-white/40">
											Earliest Execution:{' '}
											<span className="text-white/70 font-mono">
												{new Date(action.earliestExecutionTime).toLocaleString()}
											</span>
										</div>

										<div className="flex items-center gap-2">
											<Button
												type="button"
												variant="ghost"
												size="sm"
												disabled={isSubmitting}
												onClick={() => handleCancel(action)}
												className="rounded-lg text-xs text-rose-300 hover:text-rose-200 hover:bg-rose-500/10 border border-rose-500/20"
												data-testid={`timelock-cancel-btn-${action.id}`}
											>
												<Ban className="size-3.5 mr-1" />
												Cancel Action
											</Button>

											<Button
												type="button"
												size="sm"
												disabled={!isReady || isSubmitting}
												onClick={() => handleExecute(action)}
												title={
													!isReady
														? 'Action cannot be executed until timelock delay elapses'
														: undefined
												}
												className={cn(
													'rounded-lg text-xs font-semibold',
													isReady
														? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md'
														: 'opacity-50 cursor-not-allowed'
												)}
												data-testid={`timelock-execute-btn-${action.id}`}
											>
												<Play className="size-3.5 mr-1" />
												Execute Action
											</Button>
										</div>
									</div>
								</div>
							);
						})
					)}
				</div>
			)}

			{/* Tab 2: Action History */}
			{activeTab === 'history' && (
				<div className="mt-5 space-y-3" data-testid="history-actions-list">
					{historyActions.length === 0 ? (
						<div className="py-12 text-center text-white/40 text-sm">
							No executed or cancelled action history found.
						</div>
					) : (
						historyActions.map(action => (
							<div
								key={action.id}
								className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-xs space-y-2"
								data-testid={`timelock-history-${action.id}`}
							>
								<div className="flex items-center justify-between gap-2">
									<div className="flex items-center gap-2">
										<span
											className={cn(
												'rounded-md px-2 py-0.5 text-[10px] font-bold uppercase',
												action.status === 'executed'
													? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
													: 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
											)}
										>
											{action.status}
										</span>
										<span className="font-semibold text-white text-sm">
											{action.title}
										</span>
									</div>
									<span className="text-white/40 font-mono text-[11px]">
										{action.executedAt
											? `Executed: ${new Date(action.executedAt).toLocaleString()}`
											: `Cancelled: ${new Date(action.cancelledAt ?? action.proposedAt).toLocaleString()}`}
									</span>
								</div>

								<p className="text-white/60">{action.description}</p>

								{/* Parameters */}
								<div className="flex flex-wrap gap-2 pt-1 font-mono text-[11px]">
									{Object.entries(action.parameters).map(([k, v]) => (
										<span
											key={k}
											className="rounded bg-white/[0.04] px-2 py-0.5 text-white/60"
										>
											{k}: <span className="text-white/80">{String(v)}</span>
										</span>
									))}
								</div>
							</div>
						))
					)}
				</div>
			)}
		</div>
	);
};

export default TimelockAdminPanel;
