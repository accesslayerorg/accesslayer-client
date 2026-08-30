import React, { useEffect, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { useDebounce } from '@/hooks/useDebounce';
import { courseService, type Course } from '@/services/course.service';
import { highlightMatchingSubstring } from '@/utils/substringHighlight.utils';
import { cn } from '@/lib/utils';

interface MarketplaceHeaderSearchProps {
	className?: string;
}

const MarketplaceHeaderSearch: React.FC<MarketplaceHeaderSearchProps> = ({ className }) => {
	const [query, setQuery] = useState('');
	const [results, setResults] = useState<Course[]>([]);
	const [isLoading, setIsLoading] = useState(false);
	const [isOpen, setIsOpen] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const navigate = useNavigate();

	const debouncedQuery = useDebounce(query, 300);

	// Fetch search results on debounced query change
	useEffect(() => {
		const trimmed = debouncedQuery.trim();
		if (!trimmed) {
			setResults([]);
			setIsLoading(false);
			setIsOpen(false);
			return;
		}

		let cancelled = false;
		setIsLoading(true);
		setIsOpen(true);

		courseService
			.searchKeys(trimmed)
			.then(data => {
				if (!cancelled) {
					setResults(data);
					setIsLoading(false);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setResults([]);
					setIsLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [debouncedQuery]);

	// Handle click outside to close dropdown
	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setIsOpen(false);
			}
		};
		document.addEventListener('mousedown', handleClickOutside);
		return () => {
			document.removeEventListener('mousedown', handleClickOutside);
		};
	}, []);

	// Handle Escape key to clear dropdown and reset input
	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
		if (e.key === 'Escape') {
			setQuery('');
			setResults([]);
			setIsOpen(false);
			inputRef.current?.blur();
		}
	};

	const handleSelectResult = (creatorId: string) => {
		setQuery('');
		setResults([]);
		setIsOpen(false);
		navigate(`/creator/${creatorId}`);
	};

	const handleClear = () => {
		setQuery('');
		setResults([]);
		setIsOpen(false);
		inputRef.current?.focus();
	};

	return (
		<div ref={containerRef} className={cn('relative w-full max-w-xs', className)}>
			<div className="relative flex items-center">
				<Search className="pointer-events-none absolute left-3 size-4 text-white/40" />
				<input
					ref={inputRef}
					type="text"
					value={query}
					onChange={e => setQuery(e.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={() => {
						if (query.trim() && results.length > 0) {
							setIsOpen(true);
						}
					}}
					placeholder="Search keys..."
					className="w-full rounded-xl border border-white/10 bg-white/5 py-1.5 pl-9 pr-8 text-xs text-white placeholder:text-white/40 focus:border-amber-500/50 focus:bg-white/10 focus:outline-none focus:ring-1 focus:ring-amber-500/20"
					data-testid="marketplace-search-input"
					aria-label="Search marketplace keys"
				/>
				{isLoading ? (
					<Loader2 className="absolute right-2.5 size-3.5 animate-spin text-amber-400" />
				) : query ? (
					<button
						type="button"
						onClick={handleClear}
						className="absolute right-2.5 text-xs text-white/50 hover:text-white"
						aria-label="Clear search query"
						data-testid="marketplace-search-clear"
					>
						✕
					</button>
				) : null}
			</div>

			{/* Dropdown list */}
			{isOpen && query.trim() !== '' && (
				<div
					className="absolute left-0 right-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-white/10 bg-[#0d1b2a] p-2 shadow-2xl backdrop-blur-lg"
					data-testid="marketplace-search-dropdown"
				>
					{isLoading && results.length === 0 ? (
						<div className="p-3 text-center text-xs text-white/50" data-testid="marketplace-search-loading">
							Searching keys...
						</div>
					) : results.length > 0 ? (
						<ul className="space-y-1">
							{results.map(creator => (
								<li key={creator.id}>
									<button
										type="button"
										onClick={() => handleSelectResult(creator.id)}
										className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-xs hover:bg-white/10 transition-colors"
										data-testid="marketplace-search-item"
									>
										{creator.thumbnail && (
											<img
												src={creator.thumbnail}
												alt={creator.title}
												className="size-6 rounded-full object-cover"
											/>
										)}
										<div className="flex-1 truncate">
											<div className="text-white font-medium truncate">
												{highlightMatchingSubstring(creator.title, query)}
											</div>
											{creator.socialHandle && (
												<div className="text-[11px] text-white/40 truncate">
													@{highlightMatchingSubstring(creator.socialHandle, query)}
												</div>
											)}
										</div>
									</button>
								</li>
							))}
						</ul>
					) : (
						<div className="p-3 text-center text-xs text-white/50" data-testid="marketplace-search-no-results">
							No matching keys found
						</div>
					)}
				</div>
			)}
		</div>
	);
};

export default MarketplaceHeaderSearch;
