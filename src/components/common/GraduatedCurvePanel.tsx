import React, { useMemo, useState } from 'react';
import { BondingCurveChart, type BondingCurveDataPoint } from '@/components/common/BondingCurveChart';
import { Button } from '@/components/ui/button';

const MAX_MILESTONES = 5;
const MIN_EXPONENT = 1;
const MAX_EXPONENT = 5;
const PREVIEW_BASE_PRICE = 0.01;

export interface GraduatedCurveMilestone {
	supply: number;
	exponent: number;
}

interface MilestoneInput {
	supply: string;
	exponent: string;
}

export interface GraduatedCurvePanelProps {
	onSubmit: (milestones: GraduatedCurveMilestone[]) => void;
	isSubmitting?: boolean;
}

const fieldClass =
	'w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white placeholder:text-white/30 outline-none transition-colors focus:border-amber-400/40 focus:ring-[3px] focus:ring-amber-400/20 disabled:opacity-50';

function getMilestoneError(milestones: MilestoneInput[]): string | null {
	let previousSupply = 0;

	for (let index = 0; index < milestones.length; index += 1) {
		const milestone = milestones[index];
		const supply = Number(milestone.supply);
		const exponent = Number(milestone.exponent);

		if (!milestone.supply.trim() || !Number.isInteger(supply) || supply <= 0) {
			return `Milestone ${index + 1}: enter a positive whole-number supply threshold`;
		}
		if (
			!milestone.exponent.trim() ||
			!Number.isInteger(exponent) ||
			exponent < MIN_EXPONENT ||
			exponent > MAX_EXPONENT
		) {
			return `Milestone ${index + 1}: exponent must be between 1 and 5`;
		}
		if (supply <= previousSupply) {
			return 'Supply thresholds must be in ascending order';
		}
		previousSupply = supply;
	}

	return null;
}

function buildPreviewData(milestones: GraduatedCurveMilestone[]): BondingCurveDataPoint[] {
	if (milestones.length === 0) return [];

	const finalThreshold = milestones[milestones.length - 1].supply;
	const finalSupply = Math.max(finalThreshold + 1, finalThreshold * 2);
	const step = Math.max(1, Math.ceil(finalSupply / 24));
	const supplies = new Set<number>([0, finalSupply]);
	for (let supply = step; supply < finalSupply; supply += step) supplies.add(supply);
	for (const milestone of milestones) supplies.add(milestone.supply);

	return [...supplies].sort((a, b) => a - b).map(supply => {
		const tier = milestones.reduce(
			(currentTier, milestone, index) => (supply >= milestone.supply ? index : currentTier),
			0
		);
		const milestone = milestones[tier];
		const distance = milestone ? Math.max(1, supply / milestone.supply) : 1;
		return {
			supply,
			priceXLM: Number((PREVIEW_BASE_PRICE * (tier + 1) * distance ** (milestone?.exponent ?? 1)).toFixed(4)),
		};
	});
}

const GraduatedCurvePanel: React.FC<GraduatedCurvePanelProps> = ({
	onSubmit,
	isSubmitting = false,
}) => {
	const [milestones, setMilestones] = useState<MilestoneInput[]>([
		{ supply: '', exponent: '1' },
	]);
	const [showError, setShowError] = useState(false);
	const errorMessage = getMilestoneError(milestones);
	const isValid = errorMessage === null;
	const previewData = useMemo(
		() =>
			isValid
				? buildPreviewData(
						milestones.map(milestone => ({
							supply: Number(milestone.supply),
							exponent: Number(milestone.exponent),
						}))
				  )
				: [],
		[milestones, isValid]
	);

	const updateMilestone = (index: number, field: keyof MilestoneInput, value: string) => {
		setMilestones(current =>
			current.map((milestone, milestoneIndex) =>
				milestoneIndex === index ? { ...milestone, [field]: value } : milestone
			)
		);
		setShowError(false);
	};

	const handleSubmit = (event: React.FormEvent) => {
		event.preventDefault();
		if (isSubmitting) return;
		if (!isValid) {
			setShowError(true);
			return;
		}
		onSubmit(
			milestones.map(milestone => ({
				supply: Number(milestone.supply),
				exponent: Number(milestone.exponent),
			}))
		);
	};

	return (
		<form onSubmit={handleSubmit} className="space-y-6" noValidate data-testid="graduated-curve-panel">
			<div className="space-y-3">
				<div className="grid grid-cols-[1fr_1fr_auto] gap-3 text-xs font-bold uppercase tracking-[0.18em] text-white/50">
					<span>Supply threshold</span>
					<span>Exponent</span>
					<span className="sr-only">Milestone actions</span>
				</div>
				{milestones.map((milestone, index) => (
					<div className="grid grid-cols-[1fr_1fr_auto] items-start gap-3" key={index}>
						<input
							aria-label={`Milestone ${index + 1} supply threshold`}
							data-testid={`graduated-supply-${index}`}
							type="number"
							min={1}
							step={1}
							className={fieldClass}
							value={milestone.supply}
							onChange={event => updateMilestone(index, 'supply', event.target.value)}
							disabled={isSubmitting}
							placeholder="e.g. 100"
						/>
						<input
							aria-label={`Milestone ${index + 1} exponent`}
							data-testid={`graduated-exponent-${index}`}
							type="number"
							min={MIN_EXPONENT}
							max={MAX_EXPONENT}
							step={1}
							className={fieldClass}
							value={milestone.exponent}
							onChange={event => updateMilestone(index, 'exponent', event.target.value)}
							disabled={isSubmitting}
						/>
						<Button
							type="button"
							variant="ghost"
							size="icon-sm"
							aria-label={`Remove milestone ${index + 1}`}
							onClick={() => setMilestones(current => current.filter((_, i) => i !== index))}
							disabled={isSubmitting || milestones.length === 1}
						>
							×
						</Button>
					</div>
				))}
			</div>

			<div className="flex flex-wrap items-center gap-3">
				<Button
					type="button"
					variant="outline"
					onClick={() => setMilestones(current => [...current, { supply: '', exponent: '1' }])}
					disabled={isSubmitting || milestones.length >= MAX_MILESTONES}
					data-testid="graduated-add-milestone"
				>
					Add milestone ({milestones.length}/{MAX_MILESTONES})
				</Button>
				<Button
					type="submit"
					data-testid="graduated-curve-submit"
					disabled={isSubmitting || !isValid}
				>
					{isSubmitting ? 'Submitting…' : 'Save graduated curve'}
				</Button>
			</div>

			{(showError || errorMessage === 'Supply thresholds must be in ascending order') &&
				errorMessage && (
				<p role="alert" data-testid="graduated-curve-error" className="text-xs text-red-400">
					{errorMessage}
				</p>
			)}

			<div className="space-y-2" data-testid="graduated-curve-preview">
				<div>
					<h3 className="font-grotesque text-base font-black">Price preview</h3>
					<p className="text-xs text-white/40">Estimated price steps across the configured supply tiers.</p>
				</div>
				<BondingCurveChart data={previewData} height={260} />
			</div>
		</form>
	);
};

export default GraduatedCurvePanel;