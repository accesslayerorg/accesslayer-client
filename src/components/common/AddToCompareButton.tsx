import { Check, GitCompareArrows } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import {
	COMPARE_LIMIT_REASON,
	MAX_COMPARE_KEYS,
	useCompareStore,
	type CompareKey,
} from '@/hooks/useCompareStore';

interface AddToCompareButtonProps {
	compareKey: CompareKey;
	className?: string;
}

const BASE_CLASS =
	'inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wider transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gray-400';

export default function AddToCompareButton({
	compareKey,
	className,
}: AddToCompareButtonProps) {
	const isSelected = useCompareStore(state =>
		state.keys.some(key => key.id === compareKey.id)
	);
	const isFull = useCompareStore(
		state => state.keys.length >= MAX_COMPARE_KEYS
	);
	const add = useCompareStore(state => state.add);
	const remove = useCompareStore(state => state.remove);

	if (isSelected) {
		return (
			<button
				type="button"
				aria-pressed="true"
				aria-label={`Remove ${compareKey.title} from compare`}
				onClick={() => remove(compareKey.id)}
				className={cn(
					BASE_CLASS,
					'border-gray-900 bg-gray-900 text-white hover:bg-gray-700',
					className
				)}
			>
				<Check className="size-3" aria-hidden="true" />
				Comparing
			</button>
		);
	}

	if (isFull) {
		// aria-disabled (not `disabled`) keeps the button focusable so
		// keyboard users can still reach the tooltip explaining why.
		return (
			<Tooltip content={COMPARE_LIMIT_REASON}>
				<button
					type="button"
					aria-pressed="false"
					aria-disabled="true"
					aria-label={`Add ${compareKey.title} to compare`}
					onClick={event => event.preventDefault()}
					className={cn(
						BASE_CLASS,
						'cursor-not-allowed border-gray-200 text-gray-300',
						className
					)}
				>
					<GitCompareArrows className="size-3" aria-hidden="true" />
					Compare
				</button>
			</Tooltip>
		);
	}

	return (
		<button
			type="button"
			aria-pressed="false"
			aria-label={`Add ${compareKey.title} to compare`}
			onClick={() => add(compareKey)}
			className={cn(
				BASE_CLASS,
				'border-gray-200 text-gray-600 hover:border-gray-900 hover:text-gray-900',
				className
			)}
		>
			<GitCompareArrows className="size-3" aria-hidden="true" />
			Compare
		</button>
	);
}
