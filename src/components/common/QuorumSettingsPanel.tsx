import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const MIN_QUORUM_PCT = 1;
const MAX_QUORUM_PCT = 50;
/** Slider position used before the key detail API supplies a stored value. */
const DEFAULT_QUORUM_PCT = 10;

export interface QuorumSettingsPanelProps {
	/** Current proposal quorum in basis points (100–5000 = 1%–50%). */
	quorumBps?: number;
	/** Called with the new quorum threshold in basis points. */
	onSubmit: (quorumBps: number) => void;
	isSubmitting?: boolean;
}

const clampPct = (pct: number): number =>
	Math.min(MAX_QUORUM_PCT, Math.max(MIN_QUORUM_PCT, pct));

const bpsToPct = (bps: number | undefined): number =>
	bps != null ? clampPct(bps / 100) : DEFAULT_QUORUM_PCT;

/**
 * Quorum Settings panel for the creator dashboard governance tab (#828).
 *
 * Shows the current proposal quorum (derived from `quorumBps` fetched from
 * the key detail API), lets the creator pick a new minimum participation
 * percentage on a 1%–50% slider, and submits via the `set_quorum_bps`
 * contract function. The selected value is shown as both a percentage and
 * in basis points below the slider.
 */
const QuorumSettingsPanel: React.FC<QuorumSettingsPanelProps> = ({
	quorumBps,
	onSubmit,
	isSubmitting = false,
}) => {
	const [quorumPct, setQuorumPct] = useState(() => bpsToPct(quorumBps));

	// Keep the slider aligned with the stored value after a successful save
	// refetches it (acceptance: updated quorum reflected without reload).
	useEffect(() => {
		setQuorumPct(bpsToPct(quorumBps));
	}, [quorumBps]);

	const quorumBpsValue = quorumPct * 100;
	const isUnchanged =
		quorumBps != null && quorumBps === quorumBpsValue;
	const fillPercent =
		((quorumPct - MIN_QUORUM_PCT) / (MAX_QUORUM_PCT - MIN_QUORUM_PCT)) *
		100;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;
		onSubmit(quorumBpsValue);
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="space-y-4"
			noValidate
			data-testid="quorum-settings-panel"
		>
			<div className="space-y-3">
				<label
					htmlFor="quorum-threshold"
					className="text-xs font-bold uppercase tracking-[0.18em] text-white/50"
				>
					Quorum threshold (%)
				</label>
				<input
					id="quorum-threshold"
					data-testid="quorum-slider"
					type="range"
					min={MIN_QUORUM_PCT}
					max={MAX_QUORUM_PCT}
					step={1}
					className="quorum-slider w-full"
					value={quorumPct}
					onChange={e => setQuorumPct(Number(e.target.value))}
					disabled={isSubmitting}
					aria-describedby="quorum-hint"
					aria-valuetext={`${quorumPct} percent, ${quorumBpsValue} basis points`}
					style={{
						background: `linear-gradient(to right, rgba(251, 191, 36, 0.85) 0%, rgba(251, 191, 36, 0.85) ${fillPercent}%, rgba(255, 255, 255, 0.12) ${fillPercent}%, rgba(255, 255, 255, 0.12) 100%)`,
					}}
				/>
				<div className="flex items-end justify-between gap-4">
					<div>
						<p
							className="font-grotesque text-3xl font-black tracking-tight"
							data-testid="quorum-value-percent"
						>
							{quorumPct}%
						</p>
						<p
							className="text-xs text-white/50"
							data-testid="quorum-value-bps"
						>
							{quorumBpsValue.toLocaleString()} bps
						</p>
					</div>
					<p className="pb-1 text-right text-xs text-white/40">
						Min 1% — Max 50%
					</p>
				</div>
				<p
					id="quorum-hint"
					className="text-xs text-white/40"
					data-testid="quorum-hint"
				>
					Minimum percentage of holders that must vote for a proposal to
					pass
				</p>
			</div>

			<Button
				type="submit"
				data-testid="quorum-submit"
				disabled={isSubmitting || isUnchanged}
			>
				{isSubmitting ? 'Submitting…' : 'Save quorum'}
			</Button>
		</form>
	);
};

export default QuorumSettingsPanel;