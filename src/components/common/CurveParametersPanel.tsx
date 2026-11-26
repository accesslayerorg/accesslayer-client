import { useState, useEffect, useMemo, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
import { StableButtonContent } from '@/components/ui/stable-button-content';
import { cn } from '@/lib/utils';
import { useCurveProposal } from '@/hooks/useCurveProposal';
import {
	computeCurveImpactPreview,
	computeLinearCurvePrice,
} from '@/utils/bondingCurve.utils';
import { formatTimelockCountdown } from '@/utils/timelock.utils';

function formatXlm(value: number): string {
	return `${value.toFixed(value < 0.01 ? 4 : 2)} XLM`;
}

export interface CurveParametersPanelProps {
	creatorId: string;
	creatorName?: string;
	currentSupply?: number;
	className?: string;
	onProposeSuccess?: () => void;
	onCancelSuccess?: () => void;
}

export function CurveParametersPanel({
	creatorId,
	creatorName,
	currentSupply = 10,
	className,
	onProposeSuccess,
	onCancelSuccess,
}: CurveParametersPanelProps) {
	const {
		currentParams,
		pendingProposal,
		hasActiveProposal,
		isProposing,
		isCancelling,
		proposeCurveUpdate,
		cancelCurveUpdate,
	} = useCurveProposal(creatorId);

	const [slopeText, setSlopeText] = useState('');
	const [interceptText, setInterceptText] = useState('');
	const [touched, setTouched] = useState(false);
	const [currentTime, setCurrentTime] = useState(() => Date.now());

	// Update countdown timer every second when an active proposal is present
	useEffect(() => {
		if (!hasActiveProposal || !pendingProposal) return;
		const interval = setInterval(() => {
			setCurrentTime(Date.now());
		}, 1000);
		return () => clearInterval(interval);
	}, [hasActiveProposal, pendingProposal]);

	const parsedSlope = useMemo(() => {
		const val = parseFloat(slopeText.trim());
		return Number.isFinite(val) ? val : null;
	}, [slopeText]);

	const parsedIntercept = useMemo(() => {
		const val = parseFloat(interceptText.trim());
		return Number.isFinite(val) ? val : null;
	}, [interceptText]);

	const validationError = useMemo((): string | null => {
		if (!slopeText && !interceptText) return null;
		if (parsedSlope === null || parsedSlope < 0) {
			return 'Slope must be a non-negative number.';
		}
		if (parsedIntercept === null || parsedIntercept < 0) {
			return 'Intercept must be a non-negative number.';
		}
		return null;
	}, [slopeText, interceptText, parsedSlope, parsedIntercept]);

	const isValid =
		parsedSlope !== null &&
		parsedIntercept !== null &&
		parsedSlope >= 0 &&
		parsedIntercept >= 0 &&
		validationError === null;

	const impactPreview = useMemo(() => {
		if (!isValid || parsedSlope === null || parsedIntercept === null) {
			return null;
		}
		return computeCurveImpactPreview(currentSupply, currentParams, {
			slope: parsedSlope,
			intercept: parsedIntercept,
		});
	}, [isValid, currentSupply, currentParams, parsedSlope, parsedIntercept]);

	const countdown = useMemo(() => {
		if (!pendingProposal) return null;
		return formatTimelockCountdown(pendingProposal.eta, currentTime);
	}, [pendingProposal, currentTime]);

	const currentPriceAtSupply = useMemo(() => {
		return computeLinearCurvePrice(
			currentSupply,
			currentParams.slope,
			currentParams.intercept
		);
	}, [currentSupply, currentParams]);

	const handleProposeSubmit = async (e: FormEvent) => {
		e.preventDefault();
		setTouched(true);
		if (!isValid || parsedSlope === null || parsedIntercept === null) return;

		try {
			await proposeCurveUpdate({
				slope: parsedSlope,
				intercept: parsedIntercept,
			});
			setSlopeText('');
			setInterceptText('');
			setTouched(false);
			onProposeSuccess?.();
		} catch {
			// Toast handled in hook
		}
	};

	const handleCancelProposal = async () => {
		try {
			await cancelCurveUpdate();
			onCancelSuccess?.();
		} catch {
			// Toast handled in hook
		}
	};

	return (
		<section
			aria-labelledby="curve-panel-title"
			className={cn(
				'rounded-[2rem] border border-white/10 bg-white/[0.02] p-6 shadow-2xl backdrop-blur-md md:p-8 space-y-6',
				className
			)}
		>
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-white/10 pb-4">
				<div>
					<h3
						id="curve-panel-title"
						className="font-grotesque text-xl font-black tracking-tight text-white"
					>
						Bonding Curve Parameters
					</h3>
					<p className="font-jakarta text-sm text-white/60 mt-1">
						Manage price parameters for{' '}
						{creatorName ? `${creatorName}'s` : 'creator'} keys with a
						48-hour timelock safeguard.
					</p>
				</div>
				<div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-300">
					<span>48h Timelock Protection</span>
				</div>
			</div>

			{/* Current Curve Parameters Overview */}
			<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
				<div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
					<span className="font-jakarta text-xs uppercase tracking-wider text-white/50">
						Current Slope
					</span>
					<div
						data-testid="current-slope"
						className="mt-1 font-jakarta text-lg font-bold text-white tabular-nums"
					>
						{currentParams.slope} XLM / key
					</div>
					<span className="text-[11px] text-white/40">
						Price growth per key minted
					</span>
				</div>

				<div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
					<span className="font-jakarta text-xs uppercase tracking-wider text-white/50">
						Current Intercept
					</span>
					<div
						data-testid="current-intercept"
						className="mt-1 font-jakarta text-lg font-bold text-white tabular-nums"
					>
						{currentParams.intercept} XLM
					</div>
					<span className="text-[11px] text-white/40">
						Initial base price at 0 supply
					</span>
				</div>

				<div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
					<span className="font-jakarta text-xs uppercase tracking-wider text-white/50">
						Current Key Price
					</span>
					<div
						data-testid="current-price"
						className="mt-1 font-jakarta text-lg font-bold text-amber-400 tabular-nums"
					>
						{formatXlm(currentPriceAtSupply)}
					</div>
					<span
						data-testid="current-supply"
						className="text-[11px] text-white/40"
					>
						At current supply of {currentSupply} keys
					</span>
				</div>
			</div>

			{/* Pending Proposal Card */}
			{hasActiveProposal && pendingProposal && countdown && (
				<div
					data-testid="pending-proposal-card"
					role="region"
					aria-label="Pending Proposal"
					className="rounded-2xl border border-amber-500/30 bg-amber-500/[0.05] p-5 shadow-lg space-y-4"
				>
					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
						<div className="flex items-center gap-2">
							<span className="relative flex size-2.5">
								<span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
								<span className="relative inline-flex size-2.5 rounded-full bg-amber-500" />
							</span>
							<h4 className="font-jakarta text-sm font-bold text-amber-300 uppercase tracking-wider">
								Pending Proposal (48h Timelock Active)
							</h4>
						</div>
						<div
							data-testid="eta-countdown"
							aria-label="ETA Countdown"
							className="font-mono text-sm font-bold text-amber-200 tabular-nums bg-amber-500/20 px-3 py-1 rounded-lg"
						>
							{countdown.formatted}
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
						<div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
							<span className="text-xs text-white/50">
								Proposed Slope:
							</span>
							<div
								data-testid="proposed-slope"
								className="font-semibold text-white tabular-nums mt-0.5"
							>
								{pendingProposal.proposedSlope} XLM / key
							</div>
						</div>
						<div className="bg-white/[0.02] border border-white/5 p-3 rounded-xl">
							<span className="text-xs text-white/50">
								Proposed Intercept:
							</span>
							<div
								data-testid="proposed-intercept"
								className="font-semibold text-white tabular-nums mt-0.5"
							>
								{pendingProposal.proposedIntercept} XLM
							</div>
						</div>
					</div>

					<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2 border-t border-amber-500/20">
						<p className="text-xs text-white/60">
							This proposal can be reviewed by community holders before
							execution when the timelock expires.
						</p>
						<Button
							type="button"
							variant="destructive"
							data-testid="cancel-proposal-button"
							onClick={handleCancelProposal}
							disabled={isCancelling}
							aria-busy={isCancelling || undefined}
							className="self-start sm:self-auto shrink-0 bg-red-600 hover:bg-red-700 text-white"
						>
							<StableButtonContent
								isLoading={isCancelling}
								loadingLabel="Cancelling…"
							>
								Cancel Proposal
							</StableButtonContent>
						</Button>
					</div>
				</div>
			)}

			{/* Propose Update Form */}
			<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4">
				<h4 className="font-jakarta text-base font-bold text-white">
					Propose Parameter Update
				</h4>

				{hasActiveProposal ? (
					<p className="text-sm text-white/60">
						An active proposal is currently pending execution under the
						48-hour timelock. You must cancel the active proposal before
						submitting a new update.
					</p>
				) : (
					<form onSubmit={handleProposeSubmit} className="space-y-4">
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div className="space-y-1.5">
								<label
									htmlFor="new-slope"
									className="block font-jakarta text-xs font-semibold text-white/70"
								>
									New Slope (XLM / key)
								</label>
								<input
									id="new-slope"
									name="newSlope"
									type="number"
									step="any"
									placeholder="e.g. 0.002"
									value={slopeText}
									onChange={e => setSlopeText(e.target.value)}
									onBlur={() => setTouched(true)}
									disabled={isProposing}
									data-testid="curve-slope-input"
									aria-label="New Slope"
									aria-describedby={
										touched && validationError
											? 'curve-param-error'
											: undefined
									}
									className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15"
								/>
							</div>

							<div className="space-y-1.5">
								<label
									htmlFor="new-intercept"
									className="block font-jakarta text-xs font-semibold text-white/70"
								>
									New Intercept (XLM)
								</label>
								<input
									id="new-intercept"
									name="newIntercept"
									type="number"
									step="any"
									placeholder="e.g. 1.2"
									value={interceptText}
									onChange={e => setInterceptText(e.target.value)}
									onBlur={() => setTouched(true)}
									disabled={isProposing}
									data-testid="curve-intercept-input"
									aria-label="New Intercept"
									aria-describedby={
										touched && validationError
											? 'curve-param-error'
											: undefined
									}
									className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-mono text-sm text-white placeholder-white/30 outline-none transition-colors focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/15"
								/>
							</div>
						</div>

						{touched && validationError && (
							<p
								id="curve-param-error"
								role="alert"
								className="text-xs text-red-400"
							>
								{validationError}
							</p>
						)}

						{/* Impact Preview */}
						<div
							data-testid="curve-impact-preview"
							className="rounded-xl border border-white/10 bg-white/[0.02] p-4 text-sm"
						>
							<div className="font-jakarta text-xs font-bold uppercase tracking-wider text-white/60 mb-2">
								Impact Preview
							</div>
							{impactPreview ? (
								<div className="space-y-2">
									<div className="flex flex-wrap items-center justify-between text-white/80 gap-2">
										<span>Current Price:</span>
										<span className="font-mono font-semibold text-white">
											{formatXlm(impactPreview.currentPrice)}
										</span>
									</div>
									<div className="flex flex-wrap items-center justify-between text-white/80 gap-2">
										<span>Projected Price:</span>
										<span className="font-mono font-semibold text-amber-300">
											{formatXlm(impactPreview.newPrice)}
										</span>
									</div>
									<div className="flex flex-wrap items-center justify-between pt-2 border-t border-white/10 text-white font-medium gap-2">
										<span>
											Estimated price change from new parameters:
										</span>
										<span
											className={cn(
												'font-mono font-bold',
												impactPreview.priceChange >= 0
													? 'text-emerald-400'
													: 'text-rose-400'
											)}
										>
											{impactPreview.priceChange >= 0 ? '+' : ''}
											{impactPreview.priceChange.toFixed(4)} XLM (
											{impactPreview.priceChange >= 0 ? '+' : ''}
											{impactPreview.percentChange.toFixed(2)}%)
										</span>
									</div>
								</div>
							) : (
								<p className="text-xs text-white/40">
									Enter new slope and intercept values above to preview
									the estimated price impact.
								</p>
							)}
						</div>

						<div className="flex justify-end pt-2">
							<Button
								type="submit"
								data-testid="propose-update-button"
								disabled={!isValid || isProposing}
								aria-busy={isProposing || undefined}
								className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-6"
							>
								<StableButtonContent
									isLoading={isProposing}
									loadingLabel="Submitting Proposal…"
								>
									Propose Update
								</StableButtonContent>
							</Button>
						</div>
					</form>
				)}
			</div>
		</section>
	);
}

export default CurveParametersPanel;
