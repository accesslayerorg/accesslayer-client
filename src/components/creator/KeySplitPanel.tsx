import { useState, useMemo, useEffect } from 'react';
import { Scissors, Clock, X, CheckCircle } from 'lucide-react';

interface KeySplitPanelProps {
	currentSupply: number;
	currentPrice: number;
	pendingSplit?: {
		ratio: number;
		eta: number;
		proposedAt: number;
	};
	onProposeSplit?: (ratio: number) => Promise<void>;
	onCancelSplit?: () => Promise<void>;
	className?: string;
}

const PRESET_RATIOS = [2, 3, 5];

/**
 * Key split proposal and execution panel (#1182).
 * Allows creators to propose a supply split with impact preview,
 * view pending split with timelock countdown, and cancel before execution.
 */
export function KeySplitPanel({
	currentSupply,
	currentPrice,
	pendingSplit,
	onProposeSplit,
	onCancelSplit,
	className = '',
}: KeySplitPanelProps) {
	const [selectedRatio, setSelectedRatio] = useState<number>(2);
	const [customRatio, setCustomRatio] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState('');
	const [now, setNow] = useState(Date.now());

	useEffect(() => {
		const interval = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(interval);
	}, []);

	const effectiveRatio = customRatio ? Math.max(1, Math.floor(Number(customRatio) || 1)) : selectedRatio;

	const impact = useMemo(() => ({
		postSplitSupply: currentSupply * effectiveRatio,
		priceAdjustment: currentPrice / effectiveRatio,
	}), [currentSupply, currentPrice, effectiveRatio]);

	const pendingEta = pendingSplit ? Math.max(pendingSplit.eta - now, 0) : 0;
	const pendingHours = Math.floor(pendingEta / 3600000);
	const pendingMinutes = Math.floor((pendingEta % 3600000) / 60000);
	const pendingSeconds = Math.floor((pendingEta % 60000) / 1000);
	const canCancel = pendingSplit && now < pendingSplit.eta;

	const handlePropose = async () => {
		if (!onProposeSplit || isSubmitting) return;
		setIsSubmitting(true);
		try {
			await onProposeSplit(effectiveRatio);
			setToastMessage(`Split proposed: ${effectiveRatio}x — awaiting 24h timelock`);
			setShowToast(true);
			setTimeout(() => setShowToast(false), 4000);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleCancel = async () => {
		if (!onCancelSplit || isSubmitting) return;
		setIsSubmitting(true);
		try {
			await onCancelSplit();
			setToastMessage('Split cancelled');
			setShowToast(true);
			setTimeout(() => setShowToast(false), 4000);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div data-testid="key-split-panel" className={`rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md ${className}`}>
			<div className="flex items-center gap-3 mb-6">
				<div className="flex size-10 items-center justify-center rounded-xl bg-purple-400/10 text-purple-400">
					<Scissors className="size-5" />
				</div>
				<div>
					<h2 className="font-grotesque text-xl font-black tracking-tight text-white">Split Key Supply</h2>
					<p className="text-xs text-white/60">Propose a supply split with a 24-hour timelock</p>
				</div>
			</div>

			{/* Pending split card */}
			{pendingSplit && (
				<div data-testid="pending-split-card" className="mb-6 rounded-xl border border-amber-400/20 bg-amber-400/[0.05] p-4">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Clock className="size-4 text-amber-400" />
							<span className="text-sm font-semibold text-amber-300">
								Pending Split: {pendingSplit.ratio}x
							</span>
						</div>
						{canCancel && (
							<button
								data-testid="cancel-split-button"
								onClick={handleCancel}
								disabled={isSubmitting}
								className="flex items-center gap-1 rounded-lg border border-red-400/30 bg-red-400/10 px-3 py-1.5 text-xs font-semibold text-red-300 hover:bg-red-400/20 disabled:opacity-50"
							>
								<X className="size-3" />
								Cancel
							</button>
						)}
					</div>
					<div className="mt-2 text-xs text-white/60">
						Execution in:{' '}
						<span className="font-mono tabular-nums text-amber-300">
							{pendingHours}h {pendingMinutes}m {pendingSeconds}s
						</span>
					</div>
				</div>
			)}

			{/* Ratio selector */}
			<div className="mb-4">
				<label className="block text-xs font-semibold text-white/70 mb-2">Split Ratio</label>
				<div className="flex gap-2">
					{PRESET_RATIOS.map((r) => (
						<button
							key={r}
							data-testid={`ratio-${r}x`}
							onClick={() => { setSelectedRatio(r); setCustomRatio(''); }}
							className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
								selectedRatio === r && !customRatio
									? 'bg-purple-500 text-white'
									: 'bg-white/[0.05] text-white/70 hover:bg-white/[0.1]'
							}`}
						>
							{r}x
						</button>
					))}
					<input
						type="number"
						min="2"
						placeholder="Custom"
						value={customRatio}
						onChange={(e) => setCustomRatio(e.target.value)}
						data-testid="custom-ratio-input"
						className="w-20 rounded-lg border border-white/10 bg-white/[0.05] px-3 py-2 text-sm text-white placeholder-white/30 focus:border-purple-400 focus:outline-none"
					/>
				</div>
			</div>

			{/* Impact preview */}
			<div data-testid="impact-preview" className="mb-6 rounded-xl border border-white/10 bg-white/[0.03] p-4">
				<div className="text-xs font-semibold text-white/70 mb-2">Impact Preview</div>
				<div className="grid grid-cols-3 gap-4 text-center">
					<div>
						<div className="text-lg font-bold text-white">{currentSupply.toLocaleString()}</div>
						<div className="text-[10px] text-white/50">Current Supply</div>
					</div>
					<div>
						<div className="text-lg font-bold text-purple-300">{impact.postSplitSupply.toLocaleString()}</div>
						<div className="text-[10px] text-white/50">Post-Split Supply</div>
					</div>
					<div>
						<div className="text-lg font-bold text-amber-300">{impact.priceAdjustment.toFixed(6)}</div>
						<div className="text-[10px] text-white/50">New Price</div>
					</div>
				</div>
			</div>

			{/* Propose button */}
			<button
				data-testid="propose-split-button"
				onClick={handlePropose}
				disabled={isSubmitting || Boolean(pendingSplit)}
				className="w-full rounded-xl bg-purple-500 py-3 text-sm font-bold text-white hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{isSubmitting ? 'Submitting…' : pendingSplit ? 'Split Already Pending' : `Propose ${effectiveRatio}x Split`}
			</button>

			{/* Toast */}
			{showToast && (
				<div data-testid="split-toast" className="mt-4 flex items-center gap-2 rounded-lg border border-green-400/20 bg-green-400/10 p-3">
					<CheckCircle className="size-4 text-green-400" />
					<span className="text-sm text-green-300">{toastMessage}</span>
				</div>
			)}
		</div>
	);
}

export default KeySplitPanel;
