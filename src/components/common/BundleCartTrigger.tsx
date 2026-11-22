import { Package } from 'lucide-react';
import {
	useBundleCartStore,
	selectBundleItemCount,
} from '@/hooks/useBundleCartStore';
import { cn } from '@/lib/utils';

export interface BundleCartTriggerProps {
	onClick: () => void;
	className?: string;
}

/**
 * Floating bundle cart entry point (#1118).
 *
 * Mounted once in the root layout so the cart stays reachable (and the
 * queued-item count stays visible) while navigating between pages.
 */
export const BundleCartTrigger: React.FC<BundleCartTriggerProps> = ({
	onClick,
	className,
}) => {
	const itemCount = useBundleCartStore(selectBundleItemCount);

	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={`Open bundle cart (${itemCount} item${itemCount !== 1 ? 's' : ''})`}
			data-testid="bundle-cart-trigger"
			className={cn(
				'fixed bottom-20 right-4 z-40 flex size-12 items-center justify-center rounded-full',
				'bg-amber-400 text-slate-950 shadow-xl shadow-amber-500/20 transition-colors hover:bg-amber-300',
				'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06111f]',
				'md:bottom-6 md:right-6',
				className
			)}
		>
			<Package className="size-5" aria-hidden="true" />
			{itemCount > 0 && (
				<span
					className="absolute -right-1 -top-1 flex size-5 items-center justify-center rounded-full bg-slate-950 font-mono text-[0.65rem] font-bold text-amber-300"
					data-testid="bundle-cart-count"
				>
					{itemCount}
				</span>
			)}
		</button>
	);
};

export default BundleCartTrigger;
