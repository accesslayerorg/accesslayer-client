import React, { useState } from 'react';
import {
	useStakingVaultStore,
	selectSharePercentage,
	selectUserKeyBreakdown,
	type DepositEntry,
} from '@/hooks/useStakingVaultStore';
import { Button } from '@/components/ui/button';
import { formatNumber } from '@/utils/numberFormat.utils';
import { cn } from '@/lib/utils';
import {
	Vault,
	ArrowDownToLine,
	ArrowUpFromLine,
	Gift,
	CheckCircle2,
	AlertCircle,
	Loader2,
	Percent,
	Layers,
	X,
} from 'lucide-react';

export interface MultiKeyStakingVaultProps {
	className?: string;
}

export const MultiKeyStakingVault: React.FC<MultiKeyStakingVaultProps> = ({
	className,
}) => {
	const {
		vaultKeys,
		position,
		txStatus,
		txMessage,
		depositKeys,
		withdrawShares,
		claimRewards,
		getWithdrawPreview,
		clearTxStatus,
	} = useStakingVaultStore();

	const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');

	// Deposit form state: map of creatorId -> amount string
	const [depositAmounts, setDepositAmounts] = useState<Record<string, string>>({
		'alex-rivers': '',
		'elena-rostova': '',
		'marcus-vance': '',
		'sarah-chen': '',
	});

	// Withdraw form state
	const [withdrawAmountText, setWithdrawAmountText] = useState<string>('450');

	const sharePercentage = selectSharePercentage(position);
	const userKeyBreakdown = selectUserKeyBreakdown(vaultKeys, position);

	const parsedWithdrawShares = Number(withdrawAmountText) || 0;
	const withdrawPreview = getWithdrawPreview(parsedWithdrawShares);

	const handleDepositChange = (creatorId: string, val: string) => {
		setDepositAmounts(prev => ({ ...prev, [creatorId]: val }));
	};

	const handleSetMaxDeposit = (creatorId: string, maxHolding: number) => {
		setDepositAmounts(prev => ({ ...prev, [creatorId]: String(maxHolding) }));
	};

	const handleDepositSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const entries: DepositEntry[] = Object.entries(depositAmounts)
			.map(([creatorId, val]) => ({
				creatorId,
				amount: Number(val) || 0,
			}))
			.filter(entry => entry.amount > 0);

		const success = await depositKeys(entries);
		if (success) {
			setDepositAmounts({
				'alex-rivers': '',
				'elena-rostova': '',
				'marcus-vance': '',
				'sarah-chen': '',
			});
		}
	};

	const handleWithdrawSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		const success = await withdrawShares(parsedWithdrawShares);
		if (success) {
			setWithdrawAmountText('');
		}
	};

	const handleSetWithdrawPercent = (percent: number) => {
		const targetShares = Math.floor((position.sharesOwned * percent) / 100);
		setWithdrawAmountText(String(targetShares));
	};

	const totalDepositingKeys = Object.values(depositAmounts).reduce(
		(sum, val) => sum + (Number(val) || 0),
		0
	);

	return (
		<div
			className={cn(
				'relative overflow-hidden rounded-2xl border border-white/10 bg-slate-950/80 p-6 backdrop-blur-md shadow-xl transition-all',
				className
			)}
			data-testid="multi-key-staking-vault"
		>
			{/* Vault Header */}
			<div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-white/10">
				<div className="flex items-center gap-3">
					<div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-inner">
						<Vault className="size-5" />
					</div>
					<div>
						<div className="flex items-center gap-2">
							<h3 className="font-grotesque text-xl font-bold text-white tracking-tight">
								Multi-Key Staking Vault
							</h3>
							<span className="rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 uppercase tracking-widest border border-emerald-500/30">
								Pooled Yield
							</span>
						</div>
						<p className="text-xs text-white/50 mt-0.5">
							Deposit multiple creator keys to earn proportional pooled staking rewards
						</p>
					</div>
				</div>

				{/* Tab Selector */}
				<div
					role="tablist"
					aria-label="Vault actions"
					className="inline-flex rounded-xl border border-white/10 bg-white/[0.04] p-1"
				>
					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'deposit'}
						onClick={() => setActiveTab('deposit')}
						className={cn(
							'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
							activeTab === 'deposit'
								? 'bg-amber-500 text-slate-950 shadow-sm'
								: 'text-white/60 hover:text-white'
						)}
						data-testid="tab-vault-deposit"
					>
						<ArrowDownToLine className="size-3.5" />
						<span>Deposit Keys</span>
					</button>

					<button
						type="button"
						role="tab"
						aria-selected={activeTab === 'withdraw'}
						onClick={() => setActiveTab('withdraw')}
						className={cn(
							'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all',
							activeTab === 'withdraw'
								? 'bg-amber-500 text-slate-950 shadow-sm'
								: 'text-white/60 hover:text-white'
						)}
						data-testid="tab-vault-withdraw"
					>
						<ArrowUpFromLine className="size-3.5" />
						<span>Withdraw Shares</span>
					</button>
				</div>
			</div>

			{/* Transaction Status Alert Banner (#968) */}
			{txStatus !== 'idle' && (
				<div
					role="alert"
					className={cn(
						'mt-4 flex items-center justify-between gap-3 rounded-xl border p-3 text-xs transition-all animate-in fade-in duration-200',
						txStatus === 'submitting' &&
							'border-amber-500/30 bg-amber-500/10 text-amber-200',
						txStatus === 'success' &&
							'border-emerald-500/30 bg-emerald-500/10 text-emerald-200',
						txStatus === 'error' &&
							'border-rose-500/30 bg-rose-500/10 text-rose-200'
					)}
					data-testid="vault-tx-status"
				>
					<div className="flex items-center gap-2">
						{txStatus === 'submitting' && (
							<Loader2 className="size-4 animate-spin text-amber-400 shrink-0" />
						)}
						{txStatus === 'success' && (
							<CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
						)}
						{txStatus === 'error' && (
							<AlertCircle className="size-4 text-rose-400 shrink-0" />
						)}
						<span className="font-medium">{txMessage}</span>
					</div>
					<button
						type="button"
						onClick={clearTxStatus}
						className="opacity-60 hover:opacity-100 p-0.5"
						aria-label="Dismiss transaction notification"
					>
						<X className="size-3.5" />
					</button>
				</div>
			)}

			{/* Vault Position & Accrued Rewards Panel (#968) */}
			<div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-4" data-testid="vault-position-panel">
				{/* Card 1: User Share & Total Shares */}
				<div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2">
					<div className="flex items-center justify-between text-xs text-white/50">
						<span className="uppercase tracking-wider font-semibold text-[10px]">
							Your Pool Share
						</span>
						<Percent className="size-3.5 text-amber-400" />
					</div>
					<div className="flex items-baseline gap-2">
						<span
							className="font-jakarta text-2xl font-black text-amber-300 tracking-tight"
							data-testid="user-share-percentage"
						>
							{sharePercentage}%
						</span>
						<span className="text-xs text-white/40">of vault</span>
					</div>
					<p className="text-[11px] text-white/50 font-mono">
						{formatNumber(position.sharesOwned)} / {formatNumber(position.totalVaultShares)} shares
					</p>
				</div>

				{/* Card 2: Pooled Keys Breakdown */}
				<div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-2 md:col-span-1">
					<div className="flex items-center justify-between text-xs text-white/50">
						<span className="uppercase tracking-wider font-semibold text-[10px]">
							Pooled Key Breakdown
						</span>
						<Layers className="size-3.5 text-cyan-400" />
					</div>
					<div className="space-y-1 text-xs" data-testid="user-key-breakdown">
						{userKeyBreakdown.map(item => (
							<div
								key={item.creatorId}
								className="flex items-center justify-between text-[11px] text-white/70"
							>
								<span className="truncate">{item.creatorName}:</span>
								<span className="font-semibold text-white font-mono">
									{item.userOwnedKeys} keys
								</span>
							</div>
						))}
					</div>
				</div>

				{/* Card 3: Accrued Staking Rewards */}
				<div
					className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col justify-between"
					data-testid="vault-rewards-card"
				>
					<div>
						<div className="flex items-center justify-between text-xs text-emerald-400">
							<span className="uppercase tracking-wider font-semibold text-[10px]">
								Accrued Rewards
							</span>
							<Gift className="size-3.5" />
						</div>
						<div className="mt-2 flex items-baseline gap-2">
							<span
								className="font-jakarta text-2xl font-black text-emerald-300"
								data-testid="accrued-rewards-amount"
							>
								{position.accruedRewardsXlm.toFixed(2)} XLM
							</span>
							<span className="text-xs text-emerald-300/60 font-mono">
								(${position.accruedRewardsUsd.toFixed(2)} USD)
							</span>
						</div>
					</div>

					<Button
						type="button"
						size="sm"
						disabled={position.accruedRewardsXlm <= 0 || txStatus === 'submitting'}
						onClick={claimRewards}
						className="mt-3 w-full rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
						data-testid="claim-rewards-btn"
					>
						Claim Rewards
					</Button>
				</div>
			</div>

			{/* Main Action Forms: Deposit or Withdraw */}
			<div className="mt-6 pt-5 border-t border-white/10">
				{/* Tab: Multi-Key Deposit Form (#968) */}
				{activeTab === 'deposit' && (
					<form onSubmit={handleDepositSubmit} className="space-y-4" data-testid="vault-deposit-form">
						<div>
							<h4 className="font-semibold text-sm text-white">
								Select Keys & Amounts to Deposit
							</h4>
							<p className="text-xs text-white/50 mt-0.5">
								Deposit any combination of creator keys from your wallet into the pooled vault
							</p>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{vaultKeys.map(k => {
								const currentVal = depositAmounts[k.creatorId] || '';
								return (
									<div
										key={k.creatorId}
										className="rounded-xl border border-white/5 bg-white/[0.02] p-3 transition-colors hover:border-white/10"
									>
										<div className="flex items-center justify-between text-xs mb-2">
											<span className="font-semibold text-white truncate">
												{k.creatorName} ({k.symbol})
											</span>
											<span className="text-[11px] text-white/40">
												Balance: {k.userWalletHolding}
											</span>
										</div>

										<div className="flex items-center gap-2">
											<input
												type="number"
												min="0"
												max={k.userWalletHolding}
												value={currentVal}
												onChange={e => handleDepositChange(k.creatorId, e.target.value)}
												placeholder="0"
												className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500/50"
												data-testid={`deposit-input-${k.creatorId}`}
											/>
											<button
												type="button"
												onClick={() => handleSetMaxDeposit(k.creatorId, k.userWalletHolding)}
												className="rounded-md bg-white/10 px-2 py-1.5 text-[10px] font-semibold text-white/70 hover:bg-white/20 hover:text-white"
												data-testid={`deposit-max-btn-${k.creatorId}`}
											>
												MAX
											</button>
										</div>
									</div>
								);
							})}
						</div>

						<div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/5">
							<div className="text-xs text-white/60">
								Total depositing:{' '}
								<span className="font-semibold text-white font-mono">
									{totalDepositingKeys} keys
								</span>{' '}
								(≈ {totalDepositingKeys * 10} shares)
							</div>

							<Button
								type="submit"
								disabled={totalDepositingKeys <= 0 || txStatus === 'submitting'}
								className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6"
								data-testid="vault-deposit-submit-btn"
							>
								{txStatus === 'submitting' ? 'Depositing...' : 'Confirm Deposit'}
							</Button>
						</div>
					</form>
				)}

				{/* Tab: Withdraw Form with Proportional Return Preview (#968) */}
				{activeTab === 'withdraw' && (
					<form onSubmit={handleWithdrawSubmit} className="space-y-4" data-testid="vault-withdraw-form">
						<div>
							<h4 className="font-semibold text-sm text-white">
								Withdraw Shares & Receive Proportional Keys
							</h4>
							<p className="text-xs text-white/50 mt-0.5">
								Burn vault shares to claim back your proportional percentage of each pooled key
							</p>
						</div>

						<div className="rounded-xl border border-white/5 bg-white/[0.02] p-4 space-y-3">
							<div className="flex items-center justify-between text-xs">
								<span className="text-white/60">Shares to withdraw</span>
								<span className="text-white/40">
									Owned: {formatNumber(position.sharesOwned)} shares
								</span>
							</div>

							<div className="flex items-center gap-3">
								<input
									type="number"
									min="1"
									max={position.sharesOwned}
									value={withdrawAmountText}
									onChange={e => setWithdrawAmountText(e.target.value)}
									className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
									placeholder="0"
									data-testid="withdraw-shares-input"
								/>
							</div>

							{/* Percentage Shortcuts */}
							<div className="flex items-center gap-2 pt-1">
								{[25, 50, 75, 100].map(pct => (
									<button
										key={pct}
										type="button"
										onClick={() => handleSetWithdrawPercent(pct)}
										className="rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[10px] font-semibold text-white/70 hover:bg-white/10 hover:text-white"
										data-testid={`withdraw-pct-${pct}`}
									>
										{pct === 100 ? 'MAX' : `${pct}%`}
									</button>
								))}
							</div>
						</div>

						{/* Proportional Return Preview (#968 Acceptance Criteria) */}
						<div
							className="rounded-xl border border-white/10 bg-black/50 p-4 space-y-2.5"
							data-testid="withdraw-proportional-preview"
						>
							<div className="flex items-center justify-between text-xs">
								<span className="font-semibold uppercase tracking-wider text-[10px] text-amber-300">
									Proportional Return Preview
								</span>
								<span className="text-[11px] text-white/40">
									{parsedWithdrawShares} shares burnt
								</span>
							</div>

							<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
								{withdrawPreview.map(item => (
									<div
										key={item.creatorId}
										className="rounded-lg bg-white/[0.03] p-2.5 border border-white/5"
										data-testid={`withdraw-preview-${item.creatorId}`}
									>
										<div className="text-[11px] text-white/50 truncate">
											{item.creatorName}
										</div>
										<div className="mt-1 font-mono font-bold text-amber-200">
											+{item.returnedKeys} keys
										</div>
									</div>
								))}
							</div>
						</div>

						<div className="flex justify-end pt-2">
							<Button
								type="submit"
								disabled={
									parsedWithdrawShares <= 0 ||
									parsedWithdrawShares > position.sharesOwned ||
									txStatus === 'submitting'
								}
								className="rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6"
								data-testid="vault-withdraw-submit-btn"
							>
								{txStatus === 'submitting' ? 'Withdrawing...' : 'Confirm Withdraw'}
							</Button>
						</div>
					</form>
				)}
			</div>
		</div>
	);
};

export default MultiKeyStakingVault;
