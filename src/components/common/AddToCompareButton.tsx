import { GitCompareArrows } from 'lucide-react';
import { useKeyComparison } from '@/hooks/useKeyComparison';
import { cn } from '@/lib/utils';

export interface AddToCompareButtonProps {
	keyId: string;
	keyName: string;
	className?: string;
}

/** Toggles a key in the comparison selection (#1247). */
export function AddToCompareButton({
	keyId,
	keyName,
	className,
}: AddToCompareButtonProps) {
	const { selectedKeys, addKey, removeKey } = useKeyComparison();
	const isSelected = selectedKeys.some(k => k.id === keyId);

	return (
		<button
			type="button"
			data-testid="add-to-compare-button"
			aria-pressed={isSelected}
			aria-label={
				isSelected
					? `Remove ${keyName} from comparison`
					: `Add ${keyName} to comparison`
			}
			onClick={() =>
				isSelected ? removeKey(keyId) : addKey({ id: keyId, name: keyName })
			}
			className={cn(
				'inline-flex items-center rounded-md border p-1 transition-colors',
				isSelected
					? 'border-amber-400/50 bg-amber-400/15 text-amber-300'
					: 'border-white/10 text-white/50 hover:text-white/90',
				className
			)}
		>
			<GitCompareArrows className="size-3.5" />
		</button>
	);
}

export default AddToCompareButton;
