import { useEffect, useState } from 'react';
import { Search, Key, User, Hash, ArrowLeft } from 'lucide-react';
import { Link, useSearchParams } from 'react-router';
import { useDebounce } from '@/hooks/useDebounce';
import {
	searchService,
	type GlobalSearchResults,
	type SearchKeyItem,
	type SearchCreatorItem,
	type SearchTransactionItem,
} from '@/services/search.service';
import { highlightMatchingSubstring } from '@/utils/substringHighlight.utils';
import { cn } from '@/lib/utils';
import { formatDisplayKeyPrice, resolveCreatorKeyPriceStroops } from '@/utils/keyPriceDisplay.utils';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

export default function SearchResultsPage() {
	const [searchParams] = useSearchParams();
	const query = searchParams.get('q') || '';
	const typeFilter = searchParams.get('type') || 'all';

	const [results, setResults] = useState<GlobalSearchResults>({
		keys: [],
		creators: [],
		transactions: [],
	});
	const [isLoading, setIsLoading] = useState(false);

	const debouncedQuery = useDebounce(query, 300);

	useDocumentTitle(`Search: ${query} — AccessLayer`);

	useEffect(() => {
		const trimmed = debouncedQuery.trim();
		if (!trimmed) {
			setResults({ keys: [], creators: [], transactions: [] });
			setIsLoading(false);
			return;
		}

		let cancelled = false;
		setIsLoading(true);

		searchService
			.search(trimmed)
			.then(data => {
				if (!cancelled) {
					setResults({
						keys: Array.isArray(data?.keys) ? data.keys : [],
						creators: Array.isArray(data?.creators) ? data.creators : [],
						transactions: Array.isArray(data?.transactions) ? data.transactions : [],
					});
					setIsLoading(false);
				}
			})
			.catch(() => {
				if (!cancelled) {
					setResults({ keys: [], creators: [], transactions: [] });
					setIsLoading(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [debouncedQuery]);

	const totalResultsCount =
		results.keys.length + results.creators.length + results.transactions.length;

	const filteredResults = {
		keys: typeFilter === 'all' || typeFilter === 'keys' ? results.keys : [],
		creators: typeFilter === 'all' || typeFilter === 'creators' ? results.creators : [],
		transactions: typeFilter === 'all' || typeFilter === 'transactions' ? results.transactions : [],
	};

	return (
		<main className="mx-auto max-w-5xl px-6 py-16">
			<Link
				to="/"
				className="mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
			>
				<ArrowLeft className="size-3.5" aria-hidden="true" />
				Back to marketplace
			</Link>

			<header className="mb-8">
				<h1 className="font-grotesque text-3xl font-black tracking-tight text-foreground sm:text-4xl">
					Search results
				</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					Showing results for &ldquo;{query}&rdquo;
				</p>
			</header>

			{/* Filter tabs */}
			<div className="mb-8 flex flex-wrap gap-2">
				<Link
					to={`/search?q=${encodeURIComponent(query)}&type=all`}
					className={cn(
						'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
						typeFilter === 'all'
							? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
							: 'border-border bg-background text-muted-foreground hover:text-foreground'
					)}
				>
					All ({totalResultsCount})
				</Link>
				<Link
					to={`/search?q=${encodeURIComponent(query)}&type=keys`}
					className={cn(
						'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
						typeFilter === 'keys'
							? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
							: 'border-border bg-background text-muted-foreground hover:text-foreground'
					)}
				>
					<Key className="size-3" />
					Keys ({results.keys.length})
				</Link>
				<Link
					to={`/search?q=${encodeURIComponent(query)}&type=creators`}
					className={cn(
						'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
						typeFilter === 'creators'
							? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
							: 'border-border bg-background text-muted-foreground hover:text-foreground'
					)}
				>
					<User className="size-3" />
					Creators ({results.creators.length})
				</Link>
				<Link
					to={`/search?q=${encodeURIComponent(query)}&type=transactions`}
					className={cn(
						'inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold uppercase tracking-wider transition-colors',
						typeFilter === 'transactions'
							? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
							: 'border-border bg-background text-muted-foreground hover:text-foreground'
					)}
				>
					<Hash className="size-3" />
					Transactions ({results.transactions.length})
				</Link>
			</div>

			{isLoading ? (
				<div className="space-y-4">
					<div className="h-2.5 w-32 rounded bg-white/10 animate-pulse" />
					<div className="space-y-2">
						{[1, 2, 3].map(i => (
							<div key={i} className="flex items-center gap-2.5 rounded-lg p-4 bg-white/[0.03] animate-pulse">
								<div className="size-12 rounded-full bg-white/10" />
								<div className="flex-1 space-y-2">
									<div className="h-4 w-48 rounded bg-white/10" />
									<div className="h-3 w-32 rounded bg-white/10" />
								</div>
							</div>
						))}
					</div>
				</div>
			) : totalResultsCount === 0 ? (
				<div className="rounded-2xl border border-white/10 bg-white/[0.02] px-8 py-12 text-center">
					<Search className="mx-auto size-12 text-white/20" />
					<h2 className="mt-4 font-grotesque text-xl font-semibold text-white">
						No results found
					</h2>
					<p className="mt-2 text-sm text-white/50">
						No keys, creators, or transactions matching &ldquo;{query}&rdquo;
					</p>
				</div>
			) : (
				<div className="space-y-8">
					{/* Keys section */}
					{filteredResults.keys.length > 0 && (
						<section>
							<h2 className="mb-4 flex items-center gap-2 font-jakarta text-lg font-semibold text-foreground">
								<Key className="size-5 text-amber-400" />
								Keys ({filteredResults.keys.length})
							</h2>
							<div className="space-y-2">
								{filteredResults.keys.map(key => {
									const priceDisplay = formatDisplayKeyPrice(
										resolveCreatorKeyPriceStroops(key)
									);
									return (
										<Link
											key={key.id}
											to={`/creator/${key.creatorId || key.id}`}
											className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.05] transition-colors"
										>
											{key.thumbnail ? (
												<img
													src={key.thumbnail}
													alt={key.title}
													className="size-12 rounded-lg object-cover border border-white/10"
												/>
											) : (
												<div className="size-12 rounded-lg bg-amber-400/10 border border-amber-400/20 flex items-center justify-center text-amber-400">
													<Key className="size-5" />
												</div>
											)}
											<div className="flex-1 min-w-0">
												<div className="truncate font-medium text-white">
													{highlightMatchingSubstring(key.title, query)}
												</div>
												{key.category && (
													<div className="text-xs text-white/40">{key.category}</div>
												)}
											</div>
											<div className="shrink-0 text-right">
												<div className="text-sm font-mono text-amber-300">
													{priceDisplay !== '—' ? priceDisplay : ''}
												</div>
												{key.change24h != null && (
													<div
														className={cn(
															'text-xs font-mono',
															key.change24h >= 0 ? 'text-emerald-400' : 'text-red-400'
														)}
													>
														{key.change24h >= 0 ? '+' : ''}
														{key.change24h}%
													</div>
												)}
											</div>
										</Link>
									);
								})}
							</div>
						</section>
					)}

					{/* Creators section */}
					{filteredResults.creators.length > 0 && (
						<section>
							<h2 className="mb-4 flex items-center gap-2 font-jakarta text-lg font-semibold text-foreground">
								<User className="size-5 text-blue-400" />
								Creators ({filteredResults.creators.length})
							</h2>
							<div className="space-y-2">
								{filteredResults.creators.map(creator => {
									const displayName = creator.name || creator.title || 'Creator';
									const imageUri = creator.avatarUri || creator.thumbnail;
									return (
										<Link
											key={creator.id}
											to={`/creator/${creator.id}`}
											className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4 hover:bg-white/[0.05] transition-colors"
										>
											{imageUri ? (
												<img
													src={imageUri}
													alt={displayName}
													className="size-12 rounded-full object-cover border border-white/10"
												/>
											) : (
												<div className="size-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
													<User className="size-5" />
												</div>
											)}
											<div className="flex-1 min-w-0">
												<div className="flex items-center gap-2">
													<span className="truncate font-medium text-white">
														{highlightMatchingSubstring(displayName, query)}
													</span>
													{creator.isVerified && (
														<span
															className="size-2 rounded-full bg-amber-400 shrink-0"
															title="Verified creator"
														/>
													)}
												</div>
												{creator.socialHandle && (
													<div className="text-xs text-white/40 font-mono">
														@{highlightMatchingSubstring(creator.socialHandle, query)}
													</div>
												)}
											</div>
										</Link>
									);
								})}
							</div>
						</section>
					)}

					{/* Transactions section */}
					{filteredResults.transactions.length > 0 && (
						<section>
							<h2 className="mb-4 flex items-center gap-2 font-jakarta text-lg font-semibold text-foreground">
								<Hash className="size-5 text-emerald-400" />
								Transactions ({filteredResults.transactions.length})
							</h2>
							<div className="space-y-2">
								{filteredResults.transactions.map(transaction => (
									<div
										key={transaction.id}
										className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.02] p-4"
									>
										<div className="size-12 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
											<Hash className="size-5" />
										</div>
										<div className="flex-1 min-w-0">
											<div className="truncate font-medium text-white">
												{highlightMatchingSubstring(transaction.hash, query)}
											</div>
											{transaction.type && (
												<div className="text-xs text-white/40">{transaction.type}</div>
											)}
										</div>
									</div>
								))}
							</div>
						</section>
					)}
				</div>
			)}
		</main>
	);
}
