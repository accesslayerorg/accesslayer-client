import { useCallback, useState } from 'react';
import { Link } from 'react-router';
import {
	AlertCircle,
	BookmarkPlus,
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	ChevronUp,
	Filter,
	FolderOpen,
	PlusCircle,
	Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { useNavigationTiming } from '@/hooks/useNavigationTiming';
import {
	useScreener,
	validateRules,
	type ScreenerMetric,
	type ScreenerOperator,
	type ScreenerRule,
	type ScreenerSortKey,
} from '@/hooks/useScreener';
import { formatNumber } from '@/utils/numberFormat.utils';
import { cn } from '@/lib/utils';

const METRIC_OPTIONS: Array<{ value: ScreenerMetric; label: string }> = [
	{ value: 'price', label: 'Price (stroops)' },
	{ value: 'change_24h', label: '24h Change (%)' },
	{ value: 'volume', label: '24h Volume (XLM)' },
	{ value: 'holder_count', label: 'Holder Count' },
	{ value: 'top10_share', label: 'Top-10 Share (%)' },
	{ value: 'age_days', label: 'Age (days)' },
	{ value: 'royalty_rate', label: 'Royalty Rate (%)' },
];

const OPERATOR_OPTIONS: Array<{ value: ScreenerOperator; label: string }> = [
	{ value: 'gt', label: '>' },
	{ value: 'gte', label: '≥' },
	{ value: 'lt', label: '<' },
	{ value: 'lte', label: '≤' },
	{ value: 'eq', label: '=' },
];

const SORT_OPTIONS: Array<{ value: ScreenerSortKey; label: string }> = [
	{ value: 'volume', label: '24h Volume' },
	{ value: 'price', label: 'Price' },
	{ value: 'change_24h', label: '24h Change' },
	{ value: 'holder_count', label: 'Holders' },
	{ value: 'top10_share', label: 'Top-10 Share' },
	{ value: 'age_days', label: 'Age' },
	{ value: 'royalty_rate', label: 'Royalty Rate' },
	{ value: 'name', label: 'Name' },
];

function newRule(): ScreenerRule {
	return {
		id: `${Date.now()}-${Math.random()}`,
		metric: 'volume',
		operator: 'gt',
		value: '',
	};
}

/**
 * Advanced key screener page (#1454).
 *
 * Lets users build AND-combined filter rules over key metrics, sort and
 * paginate results, and save/load named screens.
 */
export default function ScreenerPage() {
	useNavigationTiming('screener');
	useDocumentTitle('Screener — AccessLayer');

	const [rules, setRules] = useState<ScreenerRule[]>([newRule()]);
	const [sort, setSort] = useState<ScreenerSortKey>('volume');
	const [saveNameInput, setSaveNameInput] = useState('');
	const [showSaved, setShowSaved] = useState(false);
	const [saveError, setSaveError] = useState('');

	const {
		results,
		totalMatchCount,
		isLoading,
		error,
		errors,
		page,
		hasNextPage,
		hasPrevPage,
		nextPage,
		prevPage,
		sortDirection,
		toggleSortDirection,
		savedScreens,
		saveScreen,
		deleteScreen,
	} = useScreener(rules, sort);

	const addRule = () => setRules(prev => [...prev, newRule()]);

	const removeRule = (id: string) =>
		setRules(prev => prev.filter(r => r.id !== id));

	const updateRule = useCallback(
		(id: string, patch: Partial<ScreenerRule>) => {
			setRules(prev =>
				prev.map(r => (r.id === id ? { ...r, ...patch } : r))
			);
		},
		[]
	);

	const handleSave = () => {
		const name = saveNameInput.trim();
		if (!name) {
			setSaveError('Enter a name for this screen.');
			return;
		}
		if (validateRules(rules).size > 0) {
			setSaveError('Fix rule errors before saving.');
			return;
		}
		saveScreen(name);
		setSaveNameInput('');
		setSaveError('');
	};

	const loadScreen = (id: string) => {
		const screen = savedScreens.find(s => s.id === id);
		if (!screen) return;
		setRules(screen.rules);
		setSort(screen.sort);
		setShowSaved(false);
	};

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-6xl space-y-8">
				<header>
					<div className="flex items-center gap-2 mb-1">
						<Filter className="size-5 text-amber-400" aria-hidden="true" />
						<h1 className="font-grotesque text-3xl font-black tracking-tight">
							Key Screener
						</h1>
					</div>
					<p className="text-sm text-white/50">
						Build filter rules with AND logic to find keys that match your exact criteria.
					</p>
				</header>

				<div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
					{/* Rule builder */}
					<section
						aria-label="Filter rules"
						className="rounded-3xl border border-white/10 bg-white/[0.02] p-6"
					>
						<div className="mb-5 flex items-center justify-between gap-4">
							<h2 className="font-grotesque text-lg font-bold">
								Rules
								<span className="ml-2 text-xs font-normal text-white/40">
									(AND combination)
								</span>
							</h2>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onClick={addRule}
								className="gap-1 text-amber-300 hover:text-amber-200"
							>
								<PlusCircle className="size-4" aria-hidden="true" />
								Add rule
							</Button>
						</div>

						<div className="space-y-3">
							{rules.map(rule => (
								<RuleRow
									key={rule.id}
									rule={rule}
									error={errors.get(rule.id)}
									onChange={patch => updateRule(rule.id, patch)}
									onRemove={() => removeRule(rule.id)}
									canRemove={rules.length > 1}
								/>
							))}
						</div>

						{/* Sort */}
						<div className="mt-6 flex flex-wrap items-center gap-3">
							<label
								htmlFor="screener-sort"
								className="text-xs font-bold uppercase tracking-[0.16em] text-white/40"
							>
								Sort by
							</label>
							<select
								id="screener-sort"
								value={sort}
								onChange={e => setSort(e.target.value as ScreenerSortKey)}
								className="h-9 rounded-lg border border-white/15 bg-slate-950/80 px-3 text-sm text-white outline-none focus:border-amber-400/60"
							>
								{SORT_OPTIONS.map(o => (
									<option key={o.value} value={o.value}>
										{o.label}
									</option>
								))}
							</select>
							<button
								type="button"
								aria-label={`Sort direction: ${sortDirection}`}
								onClick={toggleSortDirection}
								className="flex items-center gap-1 text-xs text-white/60 hover:text-white"
							>
								{sortDirection === 'desc' ? (
									<ChevronDown className="size-4" />
								) : (
									<ChevronUp className="size-4" />
								)}
								{sortDirection === 'desc' ? 'Desc' : 'Asc'}
							</button>
						</div>
					</section>

					{/* Save / load panel */}
					<aside className="space-y-4">
						<section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
							<h2 className="mb-3 font-grotesque text-base font-bold">
								Save screen
							</h2>
							<div className="flex gap-2">
								<input
									type="text"
									placeholder="Name this screen"
									value={saveNameInput}
									onChange={e => {
										setSaveNameInput(e.target.value);
										setSaveError('');
									}}
									className="flex-1 h-9 rounded-lg border border-white/15 bg-slate-950/80 px-3 text-sm text-white placeholder-white/30 outline-none focus:border-amber-400/60"
								/>
								<Button
									type="button"
									size="sm"
									onClick={handleSave}
									className="rounded-lg bg-amber-400 font-bold text-slate-950 hover:bg-amber-300"
								>
									<BookmarkPlus className="size-4" aria-hidden="true" />
								</Button>
							</div>
							{saveError && (
								<p role="alert" className="mt-2 text-xs text-red-400">
									{saveError}
								</p>
							)}
						</section>

						{savedScreens.length > 0 && (
							<section className="rounded-3xl border border-white/10 bg-white/[0.02] p-5">
								<button
									type="button"
									className="flex w-full items-center justify-between text-base font-bold"
									onClick={() => setShowSaved(v => !v)}
									aria-expanded={showSaved}
								>
									<span className="flex items-center gap-2">
										<FolderOpen className="size-4 text-amber-400" aria-hidden="true" />
										Saved screens ({savedScreens.length})
									</span>
									{showSaved ? (
										<ChevronUp className="size-4 text-white/40" />
									) : (
										<ChevronDown className="size-4 text-white/40" />
									)}
								</button>
								{showSaved && (
									<ul className="mt-3 space-y-2">
										{savedScreens.map(screen => (
											<li
												key={screen.id}
												className="flex items-center justify-between gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
											>
												<button
													type="button"
													onClick={() => loadScreen(screen.id)}
													className="flex-1 text-left text-sm font-semibold text-white hover:text-amber-300"
												>
													{screen.name}
												</button>
												<button
													type="button"
													aria-label={`Delete ${screen.name}`}
													onClick={() => deleteScreen(screen.id)}
													className="text-white/30 hover:text-red-400"
												>
													<Trash2 className="size-3.5" />
												</button>
											</li>
										))}
									</ul>
								)}
							</section>
						)}
					</aside>
				</div>

				{/* Results */}
				<section aria-label="Screener results">
					<div className="mb-4 flex items-center justify-between gap-4">
						<p className="text-sm text-white/60">
							{isLoading ? (
								'Loading…'
							) : (
								<>
									<span className="font-bold text-white">
										{formatNumber(totalMatchCount)}
									</span>{' '}
									{totalMatchCount === 1 ? 'key' : 'keys'} match your rules
								</>
							)}
						</p>
					</div>

					{error && (
						<div
							role="alert"
							className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-300"
						>
							<AlertCircle className="size-4 shrink-0" aria-hidden="true" />
							Could not load creator data. Please try again.
						</div>
					)}

					{!error && results.length > 0 && (
						<>
							<div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
								<table
									className="w-full min-w-[48rem] text-left text-sm"
									data-testid="screener-results-table"
								>
									<thead>
										<tr className="border-b border-white/10 text-[0.65rem] uppercase tracking-[0.18em] text-white/40">
											<th scope="col" className="py-3 pl-5 pr-4 font-bold">
												Key
											</th>
											{SORT_OPTIONS.filter(o => o.value !== 'name').map(col => (
												<th
													key={col.value}
													scope="col"
													className="py-3 pr-4 text-right font-bold"
												>
													<button
														type="button"
														onClick={() => {
															if (sort === col.value) {
																toggleSortDirection();
															} else {
																setSort(col.value);
															}
														}}
														className={cn(
															'inline-flex items-center gap-1 hover:text-white transition-colors',
															sort === col.value && 'text-amber-300'
														)}
													>
														{col.label}
														{sort === col.value &&
															(sortDirection === 'asc' ? (
																<ChevronUp className="size-3" />
															) : (
																<ChevronDown className="size-3" />
															))}
													</button>
												</th>
											))}
										</tr>
									</thead>
									<tbody>
										{results.map(creator => (
											<tr
												key={creator.id}
												className="border-b border-white/5 transition-colors hover:bg-white/[0.03]"
												data-testid="screener-result-row"
											>
												<td className="py-3 pl-5 pr-4">
													<Link
														to={`/creator/${creator.id}`}
														className="font-semibold text-white hover:text-amber-300"
													>
														{creator.title ?? creator.name ?? creator.id}
													</Link>
												</td>
												<td className="py-3 pr-4 text-right font-mono text-white/80">
													{formatNumber(creator.priceStroops ?? creator.price ?? 0)}
												</td>
												<td className="py-3 pr-4 text-right font-mono">
													<span
														className={cn(
															(creator.priceChange24h ?? 0) >= 0
																? 'text-emerald-400'
																: 'text-red-400'
														)}
													>
														{(creator.priceChange24h ?? 0) >= 0 ? '+' : ''}
														{formatNumber(creator.priceChange24h ?? 0, { maximumFractionDigits: 2 })}%
													</span>
												</td>
												<td className="py-3 pr-4 text-right font-mono text-white/80">
													{formatNumber(creator.volume24h ?? 0)}
												</td>
												<td className="py-3 pr-4 text-right font-mono text-white/80">
													{formatNumber(creator.holderCount ?? 0)}
												</td>
												<td className="py-3 pr-4 text-right font-mono text-white/80">
													{creator.top10HolderShare != null
														? `${formatNumber(creator.top10HolderShare, { maximumFractionDigits: 1 })}%`
														: '—'}
												</td>
												<td className="py-3 pr-4 text-right font-mono text-white/80">
													{creator.createdAt
														? `${Math.floor((Date.now() - new Date(creator.createdAt).getTime()) / 86_400_000)}d`
														: '—'}
												</td>
												<td className="py-3 pr-4 text-right font-mono text-white/80">
													{creator.royaltyBps != null
														? `${creator.royaltyBps / 100}%`
														: '—'}
												</td>
											</tr>
										))}
									</tbody>
								</table>
							</div>

							{/* Pagination */}
							<div className="mt-4 flex items-center justify-between gap-4">
								<Button
									variant="outline"
									size="sm"
									disabled={!hasPrevPage}
									onClick={prevPage}
									className="gap-1 border-white/15 text-white/70 hover:text-white"
								>
									<ChevronLeft className="size-4" aria-hidden="true" />
									Previous
								</Button>
								<span className="text-xs text-white/40">
									Showing {page * 20 + 1}–{Math.min((page + 1) * 20, totalMatchCount)} of{' '}
									{formatNumber(totalMatchCount)}
								</span>
								<Button
									variant="outline"
									size="sm"
									disabled={!hasNextPage}
									onClick={nextPage}
									className="gap-1 border-white/15 text-white/70 hover:text-white"
								>
									Next
									<ChevronRight className="size-4" aria-hidden="true" />
								</Button>
							</div>
						</>
					)}

					{!error && !isLoading && results.length === 0 && (
						<div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 py-16 text-center">
							<Filter className="size-6 text-white/30" aria-hidden="true" />
							<p className="text-sm text-white/50">
								No keys match the current rules.
							</p>
						</div>
					)}
				</section>
			</div>
		</main>
	);
}

interface RuleRowProps {
	rule: ScreenerRule;
	error: string | undefined;
	onChange: (patch: Partial<ScreenerRule>) => void;
	onRemove: () => void;
	canRemove: boolean;
}

function RuleRow({ rule, error, onChange, onRemove, canRemove }: RuleRowProps) {
	return (
		<div className="space-y-1">
			<div className="flex items-center gap-2">
				<select
					aria-label="Metric"
					value={rule.metric}
					onChange={e => onChange({ metric: e.target.value as ScreenerMetric })}
					className="flex-1 h-9 rounded-lg border border-white/15 bg-slate-950/80 px-3 text-sm text-white outline-none focus:border-amber-400/60"
				>
					{METRIC_OPTIONS.map(o => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
				<select
					aria-label="Operator"
					value={rule.operator}
					onChange={e => onChange({ operator: e.target.value as ScreenerOperator })}
					className="w-16 h-9 rounded-lg border border-white/15 bg-slate-950/80 px-2 text-sm text-white outline-none focus:border-amber-400/60"
				>
					{OPERATOR_OPTIONS.map(o => (
						<option key={o.value} value={o.value}>
							{o.label}
						</option>
					))}
				</select>
				<input
					type="number"
					aria-label="Value"
					value={rule.value}
					onChange={e =>
						onChange({ value: e.target.value === '' ? '' : Number(e.target.value) })
					}
					placeholder="0"
					className={cn(
						'w-28 h-9 rounded-lg border bg-slate-950/80 px-3 text-sm text-white outline-none',
						error
							? 'border-red-400/60 focus:border-red-400'
							: 'border-white/15 focus:border-amber-400/60'
					)}
				/>
				{canRemove && (
					<button
						type="button"
						aria-label="Remove rule"
						onClick={onRemove}
						className="text-white/30 hover:text-red-400 transition-colors"
					>
						<Trash2 className="size-4" />
					</button>
				)}
			</div>
			{error && (
				<p role="alert" className="text-xs text-red-400 pl-1">
					{error}
				</p>
			)}
		</div>
	);
}
