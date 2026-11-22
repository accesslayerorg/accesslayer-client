import { useState } from 'react';
import { Calendar, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
	EXPORT_DATE_RANGE_PRESETS,
	type ExportDateRangePreset,
	type CustomDateRange,
	formatPresetLabel,
} from '@/components/common/ExportDateRange.types';

export interface ExportDateRangeSelectorProps {
	/** Current preset value. */
	preset: ExportDateRangePreset | 'custom';
	/** Custom range when preset is 'custom'. */
	customRange: CustomDateRange;
	/** Callback when preset changes. */
	onPresetChange: (preset: ExportDateRangePreset | 'custom') => void;
	/** Callback when custom range changes. */
	onCustomRangeChange: (range: CustomDateRange) => void;
	/** Optional custom class name. */
	className?: string;
}

export const ExportDateRangeSelector: React.FC<ExportDateRangeSelectorProps> = ({
	preset: presetProp,
	customRange: customRangeProp,
	onPresetChange,
	onCustomRangeChange,
	className,
}) => {
	const [isOpen, setIsOpen] = useState(false);
	const [internalPreset, setInternalPreset] = useState<ExportDateRangePreset | 'custom'>(presetProp ?? '30d');
	const [internalCustomRange, setInternalCustomRange] = useState<CustomDateRange>(customRangeProp ?? { start: '', end: '' });
	const preset = presetProp ?? internalPreset;
	const customRange = customRangeProp ?? internalCustomRange;

	const handlePresetChange = (newPreset: ExportDateRangePreset | 'custom') => {
		setInternalPreset(newPreset);
		onPresetChange?.(newPreset);
	};

	const handleCustomRangeChange = (newRange: CustomDateRange) => {
		setInternalCustomRange(newRange);
		onCustomRangeChange?.(newRange);
	};

	return (
		<div className={cn('relative inline-block', className)}>
			<Button
				type="button"
				variant="outline"
				onClick={() => setIsOpen(!isOpen)}
				aria-haspopup="listbox"
				aria-expanded={isOpen}
				className="w-full sm:w-auto justify-start gap-2"
			>
				<Calendar className="size-3.5" aria-hidden="true" />
				<span>{formatPresetLabel(preset)}</span>
				<ChevronDown className="size-3.5" aria-hidden="true" />
			</Button>

			{isOpen && (
				<div
					className="absolute right-0 z-10 mt-1 min-w-[200px] rounded-lg border border-white/10 bg-[#0a1624] p-2 shadow-lg"
					role="listbox"
				>
					{EXPORT_DATE_RANGE_PRESETS.map(option => (
						<button
							key={option.value}
							type="button"
							role="option"
							aria-selected={preset === option.value}
							onClick={() => {
								handlePresetChange(option.value);
								setIsOpen(false);
							}}
							className={cn(
								'w-full px-3 py-2 text-left text-sm transition-colors rounded-md',
								preset === option.value
									? 'bg-amber-500/20 text-amber-200'
									: 'text-white/80 hover:bg-white/10 hover:text-white'
							)}
						>
							<div className="font-medium">{option.label}</div>
							<div className="text-[11px] text-white/50">{option.description}</div>
						</button>
					))}

					<hr className="my-2 border-white/10" />

					<button
						type="button"
						role="option"
						aria-selected={preset === 'custom'}
						onClick={() => {
							handlePresetChange('custom');
						}}
						className={cn(
							'w-full px-3 py-2 text-left text-sm transition-colors rounded-md',
							preset === 'custom'
								? 'bg-amber-500/20 text-amber-200'
								: 'text-white/80 hover:bg-white/10 hover:text-white'
						)}
					>
						<div className="font-medium">Custom range</div>
						<div className="text-[11px] text-white/50">Pick exact start and end dates</div>
					</button>

					{preset === 'custom' && (
						<div className="mt-2 space-y-2 p-2 border-t border-white/10">
							<label className="flex flex-col gap-1 text-[11px] text-white/60">
								<span>From</span>
								<input
									type="date"
									value={customRange.start}
									max={customRange.end || undefined}
									onChange={e =>
										handleCustomRangeChange({ ...customRange, start: e.target.value })
									}
									placeholder="From"
									data-testid="export-date-from"
									className="h-8 rounded-md border border-white/10 bg-white/[0.03] px-2 text-sm text-white placeholder:text-white/40"
								/>
							</label>
							<label className="flex flex-col gap-1 text-[11px] text-white/60">
								<span>To</span>
								<input
									type="date"
									value={customRange.end}
									min={customRange.start || undefined}
									onChange={e =>
										handleCustomRangeChange({ ...customRange, end: e.target.value })
									}
									placeholder="To"
									data-testid="export-date-to"
									className="h-8 rounded-md border border-white/10 bg-white/[0.03] px-2 text-sm text-white placeholder:text-white/40"
								/>
							</label>
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default ExportDateRangeSelector;