import { useEffect, useId, useState, type ChangeEvent } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { REPUTATION_SCORE_MAX } from '@/utils/keyReputation.utils';
import {
	DISCOVERY_FEE_TIER_OPTIONS,
	EMPTY_DISCOVERY_FILTERS,
	type DiscoveryFilters,
} from '@/utils/advancedSearch.utils';

export interface AdvancedSearchDrawerProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	filters: DiscoveryFilters;
	onApply: (filters: DiscoveryFilters) => void;
	onClearAll: () => void;
}

type NumericFilterKey =
	| 'minPrice'
	| 'maxPrice'
	| 'minVolume'
	| 'maxVolume'
	| 'minReputation';

function parseInputValue(raw: string): number | undefined {
	if (raw.trim() === '') return undefined;
	const value = Number(raw);
	if (!Number.isFinite(value) || value < 0) return undefined;
	return value;
}

const INPUT_CLASSNAME =
	'h-9 rounded-lg border-white/10 bg-black/30 text-sm text-white placeholder:text-white/30 focus-visible:ring-amber-400/50';

/**
 * Advanced search drawer for the key discovery page (#1260).
 *
 * Collects price range, 24h volume range, minimum reputation, fee tier and
 * supply-cap status in a single right-side drawer. Edits are kept in local
 * draft state until "Apply filters" is pressed, so a half-finished range
 * never churns the URL or the results behind the drawer.
 */
export default function AdvancedSearchDrawer({
	open,
	onOpenChange,
	filters,
	onApply,
	onClearAll,
}: AdvancedSearchDrawerProps) {
	const idPrefix = useId();
	const [draft, setDraft] = useState<DiscoveryFilters>(filters);

	useEffect(() => {
		if (open) setDraft(filters);
	}, [open, filters]);

	const updateNumericFilter =
		(key: NumericFilterKey) => (event: ChangeEvent<HTMLInputElement>) => {
			const value = parseInputValue(event.target.value);
			setDraft(previous => {
				const next = { ...previous };
				if (value === undefined) {
					delete next[key];
				} else {
					next[key] =
						key === 'minReputation'
							? Math.min(REPUTATION_SCORE_MAX, value)
							: value;
				}
				return next;
			});
		};

	const handleClearAll = () => {
		setDraft(EMPTY_DISCOVERY_FILTERS);
		onClearAll();
		onOpenChange(false);
	};

	const handleApply = () => {
		onApply(draft);
		onOpenChange(false);
	};

	const numberInputProps = (key: NumericFilterKey, testId: string) => ({
		id: `${idPrefix}-${key}`,
		'data-testid': testId,
		type: 'number' as const,
		inputMode: 'decimal' as const,
		min: 0,
		step: 'any',
		value: draft[key] ?? '',
		onChange: updateNumericFilter(key),
		className: INPUT_CLASSNAME,
	});

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				data-testid="advanced-search-drawer"
				className="left-auto right-0 top-0 h-full max-h-none w-full max-w-md translate-x-0 translate-y-0 grid-rows-[auto_1fr_auto] gap-0 overflow-y-auto rounded-none border-l border-white/10 bg-[#08111f] p-0 text-white sm:max-w-md"
			>
				<DialogHeader className="border-b border-white/10 px-6 py-5 text-left">
					<div className="flex items-center gap-2 text-amber-400">
						<SlidersHorizontal className="size-4" aria-hidden="true" />
						<span className="font-mono text-[0.68rem] font-bold uppercase tracking-[0.2em]">
							Advanced Search
						</span>
					</div>
					<DialogTitle className="font-grotesque text-xl font-bold tracking-tight text-white">
						Filter creator keys
					</DialogTitle>
					<DialogDescription className="font-jakarta text-xs text-white/50">
						Combine filters to narrow the trending and new listing results. Applied
						filters are saved in the page URL.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col gap-6 px-6 py-5">
					<section aria-labelledby={`${idPrefix}-price`} className="space-y-3">
						<h3
							id={`${idPrefix}-price`}
							className="text-[0.7rem] font-bold uppercase tracking-wider text-white/60"
						>
							Price range (XLM)
						</h3>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<Label htmlFor={`${idPrefix}-minPrice`} className="text-xs text-white/70">
									Min
								</Label>
								<Input
									{...numberInputProps('minPrice', 'advanced-filter-min-price')}
									placeholder="0"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor={`${idPrefix}-maxPrice`} className="text-xs text-white/70">
									Max
								</Label>
								<Input
									{...numberInputProps('maxPrice', 'advanced-filter-max-price')}
									placeholder="No limit"
								/>
							</div>
						</div>
					</section>

					<section aria-labelledby={`${idPrefix}-volume`} className="space-y-3">
						<h3
							id={`${idPrefix}-volume`}
							className="text-[0.7rem] font-bold uppercase tracking-wider text-white/60"
						>
							24h volume range
						</h3>
						<div className="grid grid-cols-2 gap-3">
							<div className="space-y-1.5">
								<Label htmlFor={`${idPrefix}-minVolume`} className="text-xs text-white/70">
									Min
								</Label>
								<Input
									{...numberInputProps('minVolume', 'advanced-filter-min-volume')}
									placeholder="0"
								/>
							</div>
							<div className="space-y-1.5">
								<Label htmlFor={`${idPrefix}-maxVolume`} className="text-xs text-white/70">
									Max
								</Label>
								<Input
									{...numberInputProps('maxVolume', 'advanced-filter-max-volume')}
									placeholder="No limit"
								/>
							</div>
						</div>
					</section>

					<section className="space-y-1.5">
						<Label
							htmlFor={`${idPrefix}-minReputation`}
							className="text-[0.7rem] font-bold uppercase tracking-wider text-white/60"
						>
							Minimum reputation score
						</Label>
						<Input
							{...numberInputProps('minReputation', 'advanced-filter-min-reputation')}
							max={REPUTATION_SCORE_MAX}
							step={1}
							placeholder={`Any (0–${REPUTATION_SCORE_MAX})`}
						/>
					</section>

					<section className="space-y-1.5">
						<Label
							htmlFor={`${idPrefix}-feeTier`}
							className="text-[0.7rem] font-bold uppercase tracking-wider text-white/60"
						>
							Fee tier
						</Label>
						<select
							id={`${idPrefix}-feeTier`}
							data-testid="advanced-filter-fee-tier"
							value={draft.feeTier ?? ''}
							onChange={event => {
								const value = event.target.value;
								setDraft(previous => {
									const next = { ...previous };
									if (!value) {
										delete next.feeTier;
									} else {
										next.feeTier = value as DiscoveryFilters['feeTier'];
									}
									return next;
								});
							}}
							className="h-9 w-full rounded-lg border border-white/10 bg-black/30 px-3 text-sm font-semibold text-white outline-none focus:border-amber-400/40"
						>
							<option value="">Any fee tier</option>
							{DISCOVERY_FEE_TIER_OPTIONS.map(option => (
								<option key={option.value} value={option.value}>
									{option.label}
								</option>
							))}
						</select>
					</section>

					<section className="flex items-center justify-between gap-4 rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3">
						<div className="space-y-0.5">
							<Label
								htmlFor={`${idPrefix}-supplyCapped`}
								className="text-sm font-semibold text-white"
							>
								Supply capped
							</Label>
							<p className="font-jakarta text-xs text-white/50">
								Only show keys with a configured max supply.
							</p>
						</div>
						<Switch
							id={`${idPrefix}-supplyCapped`}
							data-testid="advanced-filter-supply-capped"
							checked={draft.supplyCappedOnly}
							onCheckedChange={checked =>
								setDraft(previous => ({
									...previous,
									supplyCappedOnly: checked,
								}))
							}
						/>
					</section>
				</div>

				<DialogFooter className="border-t border-white/10 px-6 py-4 sm:flex-row sm:justify-between">
					<Button
						type="button"
						variant="ghost"
						data-testid="advanced-search-clear-all"
						onClick={handleClearAll}
						className="text-white/60 hover:bg-white/5 hover:text-white"
					>
						Clear All
					</Button>
					<Button
						type="button"
						data-testid="advanced-search-apply"
						onClick={handleApply}
						className="rounded-xl bg-amber-400 font-bold text-slate-950 hover:bg-amber-300"
					>
						Apply filters
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
