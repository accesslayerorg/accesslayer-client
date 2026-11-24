import React, { useState, useMemo } from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { calculateApprovedBudget, calculateNextRunTime } from '@/utils/dca.utils';
import type { DcaFrequency } from '@/types/dca.types';
import { Sparkles, Clock, ArrowRight } from 'lucide-react';

export interface DcaPlanModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	defaultCreatorKeyId?: string;
	defaultCreatorName?: string;
	userWallet: string;
	onPlanCreated?: () => void;
	onCreatePlan: (input: {
		creatorKeyId: string;
		creatorName: string;
		creatorAvatar?: string;
		wallet: string;
		amountPerPurchaseXlm: number;
		frequency: DcaFrequency;
		endDate?: string | null;
		totalCapXlm?: number | null;
		maxSlippagePercent: number;
		approvedBudgetXlm: number;
	}) => Promise<unknown>;
}

const AVAILABLE_KEYS = [
	{ id: 'alice-key', name: 'Alice Stellar', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop' },
	{ id: 'bob-key', name: 'Bob Horizons', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop' },
	{ id: 'charlie-key', name: 'Charlie Soroban', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop' },
];

export const DcaPlanModal: React.FC<DcaPlanModalProps> = ({
	open,
	onOpenChange,
	defaultCreatorKeyId,
	defaultCreatorName,
	userWallet,
	onPlanCreated,
	onCreatePlan,
}) => {
	const [selectedKeyId, setSelectedKeyId] = useState(defaultCreatorKeyId ?? AVAILABLE_KEYS[0].id);
	const [amountXlm, setAmountXlm] = useState<number>(20);
	const [frequency, setFrequency] = useState<DcaFrequency>('daily');
	const [totalCapXlm, setTotalCapXlm] = useState<string>('');
	const [endDate, setEndDate] = useState<string>('');
	const [maxSlippagePercent, setMaxSlippagePercent] = useState<number>(1.0);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [hasApprovedSpending, setHasApprovedSpending] = useState(false);

	const selectedKey = useMemo(() => {
		const found = AVAILABLE_KEYS.find((k) => k.id === selectedKeyId);
		if (found) return found;
		return {
			id: selectedKeyId,
			name: defaultCreatorName || selectedKeyId,
			avatar: undefined,
		};
	}, [selectedKeyId, defaultCreatorName]);

	const parsedTotalCap = totalCapXlm.trim() ? parseFloat(totalCapXlm) : null;

	const { approvedBudgetXlm, estimatedRuns } = useMemo(() => {
		return calculateApprovedBudget({
			amountPerPurchaseXlm: amountXlm > 0 ? amountXlm : 1,
			frequency,
			endDate: endDate || null,
			totalCapXlm: parsedTotalCap,
		});
	}, [amountXlm, frequency, endDate, parsedTotalCap]);

	const nextRunPreview = useMemo(() => {
		const dateStr = calculateNextRunTime(frequency);
		return new Date(dateStr).toLocaleString(undefined, {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
		});
	}, [frequency]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!hasApprovedSpending || amountXlm <= 0) return;

		setIsSubmitting(true);
		try {
			await onCreatePlan({
				creatorKeyId: selectedKey.id,
				creatorName: selectedKey.name,
				creatorAvatar: selectedKey.avatar,
				wallet: userWallet,
				amountPerPurchaseXlm: amountXlm,
				frequency,
				endDate: endDate || null,
				totalCapXlm: parsedTotalCap,
				maxSlippagePercent,
				approvedBudgetXlm,
			});
			onPlanCreated?.();
			onOpenChange(false);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="max-w-lg border-white/10 bg-[#0b1728] text-white p-6"
				data-testid="dca-plan-modal"
			>
				<DialogHeader className="space-y-1.5 text-left">
					<div className="flex items-center gap-2">
						<span className="rounded-md bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-400 border border-amber-500/30">
							Recurring Strategy
						</span>
						<DialogTitle className="text-xl font-bold">
							Create Dollar-Cost Averaging Plan
						</DialogTitle>
					</div>
					<DialogDescription className="text-xs text-white/60">
						Automate recurring purchases on schedule via the keeper service without manual trading.
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="mt-4 space-y-4">
					{/* Key Select */}
					<div className="space-y-1.5">
						<label className="text-xs font-semibold text-white/70">Select Creator Key</label>
						<select
							value={selectedKeyId}
							onChange={(e) => setSelectedKeyId(e.target.value)}
							className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
							data-testid="dca-key-select"
						>
							{AVAILABLE_KEYS.map((k) => (
								<option key={k.id} value={k.id} className="bg-[#0b1728] text-white">
									{k.name} ({k.id})
								</option>
							))}
						</select>
					</div>

					{/* Purchase Amount & Frequency */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-white/70">
								Amount per purchase (XLM)
							</label>
							<input
								type="number"
								min="1"
								step="1"
								value={amountXlm}
								onChange={(e) => setAmountXlm(Math.max(1, parseFloat(e.target.value) || 0))}
								className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm font-mono text-white focus:border-amber-400 focus:outline-none"
								data-testid="dca-amount-input"
								required
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-white/70">Frequency</label>
							<select
								value={frequency}
								onChange={(e) => setFrequency(e.target.value as DcaFrequency)}
								className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
								data-testid="dca-frequency-select"
							>
								<option value="daily" className="bg-[#0b1728]">Daily</option>
								<option value="weekly" className="bg-[#0b1728]">Weekly</option>
								<option value="monthly" className="bg-[#0b1728]">Monthly</option>
							</select>
						</div>
					</div>

					{/* Optional End Date & Total Cap */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-white/70">
								Total Budget Cap (XLM, optional)
							</label>
							<input
								type="number"
								min="1"
								step="any"
								placeholder="Unlimited"
								value={totalCapXlm}
								onChange={(e) => setTotalCapXlm(e.target.value)}
								className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm font-mono text-white focus:border-amber-400 focus:outline-none"
								data-testid="dca-cap-input"
							/>
						</div>

						<div className="space-y-1.5">
							<label className="text-xs font-semibold text-white/70">
								End Date (optional)
							</label>
							<input
								type="date"
								value={endDate}
								onChange={(e) => setEndDate(e.target.value)}
								className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2.5 text-sm text-white focus:border-amber-400 focus:outline-none"
								data-testid="dca-end-date-input"
							/>
						</div>
					</div>

					{/* Max Slippage Setting */}
					<div className="space-y-1.5">
						<div className="flex justify-between items-center text-xs">
							<span className="font-semibold text-white/70">Max Slippage Protection</span>
							<span className="font-mono text-amber-300 font-bold">{maxSlippagePercent}%</span>
						</div>
						<div className="flex gap-2">
							{[0.5, 1.0, 2.5, 5.0].map((val) => (
								<button
									key={val}
									type="button"
									onClick={() => setMaxSlippagePercent(val)}
									className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${
										maxSlippagePercent === val
											? 'bg-amber-400 text-slate-950 font-bold'
											: 'border border-white/10 bg-white/[0.03] text-white/70 hover:bg-white/[0.08]'
									}`}
								>
									{val}%
								</button>
							))}
						</div>
						<p className="text-[11px] text-white/40">
							Purchases will skip if price impact or slippage exceeds this threshold. 3 consecutive failures will automatically pause the plan.
						</p>
					</div>

					{/* Schedule and Budget Approval Summary */}
					<div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.05] p-4 space-y-2.5">
						<div className="flex items-center justify-between text-xs">
							<span className="text-white/70 flex items-center gap-1.5">
								<Clock className="h-3.5 w-3.5 text-amber-400" /> Next Run Time
							</span>
							<span className="font-mono font-bold text-amber-300" data-testid="dca-next-run-preview">
								{nextRunPreview}
							</span>
						</div>
						<div className="flex items-center justify-between text-xs">
							<span className="text-white/70 flex items-center gap-1.5">
								<Sparkles className="h-3.5 w-3.5 text-amber-400" /> Estimated Runs
							</span>
							<span className="font-mono text-white/90">
								~{estimatedRuns} orders
							</span>
						</div>
						<div className="flex items-center justify-between text-sm border-t border-amber-500/10 pt-2 font-medium">
							<span className="text-white/90">Total Approved Budget</span>
							<span className="font-mono font-bold text-amber-300 text-base" data-testid="dca-approved-budget">
								{approvedBudgetXlm} XLM
							</span>
						</div>
					</div>

					{/* Spending Approval Consent (#1470) */}
					<label
						className="flex items-start gap-3 rounded-xl border border-white/10 bg-white/[0.02] p-3 text-xs text-white/80 cursor-pointer hover:bg-white/[0.04]"
						data-testid="dca-spending-approval-container"
					>
						<input
							type="checkbox"
							checked={hasApprovedSpending}
							onChange={(e) => setHasApprovedSpending(e.target.checked)}
							className="mt-0.5 rounded border-white/30 text-amber-400 focus:ring-amber-400"
							data-testid="dca-spending-approval-checkbox"
						/>
						<span>
							I approve a spending allowance of <strong>{approvedBudgetXlm} XLM</strong> from my connected wallet to fund this recurring DCA plan through the keeper contract.
						</span>
					</label>

					<DialogFooter className="mt-6 flex flex-row items-center justify-between gap-3">
						<Button
							type="button"
							variant="ghost"
							onClick={() => onOpenChange(false)}
							disabled={isSubmitting}
							className="text-white/70 hover:text-white"
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={!hasApprovedSpending || amountXlm <= 0 || isSubmitting}
							data-testid="dca-submit-button"
							className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold"
						>
							<span className="flex items-center gap-1.5">
								{isSubmitting ? 'Creating Plan…' : 'Approve & Create Plan'}
								<ArrowRight className="h-4 w-4" />
							</span>
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
};

export default DcaPlanModal;
