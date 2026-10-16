import { ArrowRight, X } from 'lucide-react';
import { Link } from 'react-router';
import CreatorInitialsAvatar from '@/components/common/CreatorInitialsAvatar';
import { MAX_COMPARE_KEYS, useCompareStore } from '@/hooks/useCompareStore';

/**
 * Sticky bottom bar listing the keys queued for comparison (#1086).
 * Hidden until at least one key is selected.
 */
export default function CompareBar() {
	const keys = useCompareStore(state => state.keys);
	const remove = useCompareStore(state => state.remove);
	const clear = useCompareStore(state => state.clear);

	if (keys.length === 0) return null;

	const canCompare = keys.length >= 2;

	return (
		<>
			{/* Reserves space so the fixed bar never covers the page footer. */}
			<div aria-hidden="true" className="h-20" />
			<aside
				aria-label="Key comparison"
				className="fixed inset-x-0 bottom-0 z-40 border-t border-black/8 dark:border-white/10 bg-white/95 dark:bg-[#06111f]/95 backdrop-blur-md"
			>
				<div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-6 py-3">
					<p className="font-mono text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/60">
						Compare {keys.length}/{MAX_COMPARE_KEYS}
					</p>

					<ul className="flex flex-1 flex-wrap items-center gap-2">
						{keys.map(key => (
							<li
								key={key.id}
								className="flex items-center gap-2 rounded-full border border-gray-200 dark:border-white/15 bg-gray-50 dark:bg-white/5 py-1 pr-1 pl-1"
							>
								<span className="size-6 overflow-hidden rounded-full">
									<CreatorInitialsAvatar
										name={key.title}
										creatorId={key.id}
										imageSrc={key.thumbnail}
										className="text-[9px]"
									/>
								</span>
								<span className="max-w-[9rem] truncate font-jakarta text-xs font-medium text-gray-900 dark:text-white">
									{key.title}
								</span>
								<button
									type="button"
									onClick={() => remove(key.id)}
									aria-label={`Remove ${key.title} from compare`}
									className="inline-flex size-6 items-center justify-center rounded-full text-gray-400 dark:text-white/55 transition-colors hover:bg-gray-200 dark:hover:bg-white/10 hover:text-gray-900 dark:hover:text-white"
								>
									<X className="size-3.5" aria-hidden="true" />
								</button>
							</li>
						))}
					</ul>

					<div className="flex items-center gap-2">
						<button
							type="button"
							onClick={clear}
							className="rounded-sm px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-gray-500 dark:text-white/60 transition-colors hover:text-gray-900 dark:hover:text-white"
						>
							Clear all
						</button>
						{canCompare ? (
							<Link
								to="/compare"
								className="inline-flex items-center gap-2 rounded-sm bg-gray-900 dark:bg-white px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-white dark:text-gray-900 transition-colors hover:bg-gray-700 dark:hover:bg-white/85"
							>
								Compare keys
								<ArrowRight className="size-3.5" aria-hidden="true" />
							</Link>
						) : (
							<span className="font-jakarta text-xs text-gray-400 dark:text-white/55">
								Add one more key to compare
							</span>
						)}
					</div>
				</div>
			</aside>
		</>
	);
}
