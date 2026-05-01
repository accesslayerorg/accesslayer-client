import { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EmptySearchSuggestionsProps {
	/** Suggested terms — duplicates and falsy values are stripped. */
	suggestions: string[];
	/** Called with the chosen suggestion when a chip is clicked. */
	onSelect: (term: string) => void;
	/** Optional cap so the chip row stays compact on small screens. */
	maxSuggestions?: number;
	/** Heading copy above the chip row. */
	title?: string;
	className?: string;
}

const DEFAULT_TITLE = 'Try one of these searches';
const DEFAULT_MAX = 6;

const EmptySearchSuggestions: React.FC<EmptySearchSuggestionsProps> = ({
	suggestions,
	onSelect,
	maxSuggestions = DEFAULT_MAX,
	title = DEFAULT_TITLE,
	className,
}) => {
	const [dismissed, setDismissed] = useState(false);

	const uniqueSuggestions = useMemo(() => {
		const seen = new Set<string>();
		const result: string[] = [];
		for (const raw of suggestions) {
			const trimmed = raw?.trim();
			if (!trimmed) continue;
			const key = trimmed.toLowerCase();
			if (seen.has(key)) continue;
			seen.add(key);
			result.push(trimmed);
			if (result.length >= maxSuggestions) break;
		}
		return result;
	}, [suggestions, maxSuggestions]);

	if (dismissed || uniqueSuggestions.length === 0) {
		return null;
	}

	return (
		<section
			aria-label="Search suggestions"
			className={cn(
				'rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 backdrop-blur-sm',
				className
			)}
		>
			<div className="flex items-start justify-between gap-3">
				<p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/55">
					{title}
				</p>
				<button
					type="button"
					onClick={() => setDismissed(true)}
					aria-label="Dismiss search suggestions"
					className="-mr-1 -mt-1 inline-flex size-7 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
				>
					<X className="size-3.5" />
				</button>
			</div>
			<ul className="mt-3 flex flex-wrap gap-2">
				{uniqueSuggestions.map(term => (
					<li key={term}>
						<button
							type="button"
							onClick={() => onSelect(term)}
							className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.06] px-3 py-1.5 text-xs font-semibold text-white/85 transition-colors hover:border-amber-400/40 hover:bg-amber-400/10 hover:text-amber-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60"
						>
							<Search className="size-3 opacity-70" />
							<span>{term}</span>
						</button>
					</li>
				))}
			</ul>
		</section>
	);
};

export default EmptySearchSuggestions;
