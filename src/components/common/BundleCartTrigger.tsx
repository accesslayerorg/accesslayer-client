import React from 'react';
import { ShoppingBag } from 'lucide-react';
import { useBundleCartStore, selectBundleItemCount } from '@/hooks/useBundleCartStore';
import { cn } from '@/lib/utils';

export default function BundleCartTrigger() {
	const itemCount = useBundleCartStore(selectBundleItemCount);
	const toggleOpen = useBundleCartStore(state => state.toggleOpen);

	if (itemCount === 0) return null;

	return (
		<button
			type="button"
			onClick={toggleOpen}
			data-testid="bundle-cart-trigger"
			aria-label={`Open bundle cart (${itemCount} items)`}
			className={cn(
				'fixed bottom-20 right-6 z-40 flex items-center gap-2.5 rounded-full border border-amber-400/40 bg-slate-900/90 px-4 py-2.5 text-white shadow-2xl backdrop-blur-md transition-all hover:scale-105 hover:border-amber-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/60 md:bottom-8',
				'animate-in fade-in zoom-in-95 duration-200'
			)}
		>
			<ShoppingBag className="size-4 text-amber-400" aria-hidden="true" />
			<span className="font-grotesque text-xs font-bold uppercase tracking-wider">
				Bundle Cart
			</span>
			<span className="flex size-5 items-center justify-center rounded-full bg-amber-400 text-[0.65rem] font-black text-slate-950">
				{itemCount}
			</span>
		</button>
	);
}
