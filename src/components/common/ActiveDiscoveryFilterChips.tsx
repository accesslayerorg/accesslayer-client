import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	getActiveDiscoveryFilters,
	type DiscoveryFilters,
} from '@/utils/advancedSearch.utils';

export interface ActiveDiscoveryFilterChipsProps {
	filters: DiscoveryFilters;
	/** Called with the chip's URL params so the page can drop them. */
	onRemove: (params: readonly string[]) => void;
	onClearAll: () => void;
}

/**
 * Removable chips for the discovery page's active advanced search filters
 * (#1260). Renders nothing when no filters are applied so the search bar keeps
 * its original height.
 */
export default function ActiveDiscoveryFilterChips({
	filters,
	onRemove,
	onClearAll,
}: ActiveDiscoveryFilterChipsProps) {
	const activeFilters = getActiveDiscoveryFilters(filters);
	if (activeFilters.length === 0) return null;

	return (
		<div
			role="list"
			aria-label="Active search filters"
			data-testid="active-filter-chips"
			className="flex flex-wrap items-center justify-center gap-2"
		>
			{activeFilters.map(filter => (
				<span
					key={filter.id}
					role="listitem"
					data-testid={`active-filter-chip-${filter.id}`}
					className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 py-1 pl-3 pr-1 text-[0.7rem] font-semibold text-amber-200"
				>
					{filter.label}
					<button
						type="button"
						aria-label={`Remove filter: ${filter.label}`}
						data-testid={`active-filter-remove-${filter.id}`}
						onClick={() => onRemove(filter.params)}
						className="rounded-full p-0.5 text-amber-200/70 transition-colors hover:bg-amber-400/20 hover:text-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
					>
						<X className="size-3" aria-hidden="true" />
					</button>
				</span>
			))}

			<Button
				type="button"
				variant="ghost"
				size="xs"
				data-testid="active-filter-clear-all"
				onClick={onClearAll}
				className="rounded-full text-[0.7rem] font-bold text-white/60 hover:bg-white/5 hover:text-white"
			>
				Clear All
			</Button>
		</div>
	);
}
