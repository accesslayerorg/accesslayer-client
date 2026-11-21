import { ShoppingBag, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnavailableAction } from '@/components/ui/unavailable-action';
import { useBundleCartStore } from '@/hooks/useBundleCartStore';
import { cn } from '@/lib/utils';
import showToast from '@/utils/toast.util';

export interface AddToBundleButtonProps {
	/** Creator / course ID of the key to queue. */
	keyId: string;
	/** Display name shown in toasts and the cart. */
	keyName: string;
	/** Current on-chain key price in stroops. */
	priceStroops: number;
	/** Current circulating supply, used for price impact estimates. */
	currentSupply?: number | null;
	/** Optional thumbnail URL carried into the cart. */
	thumbnail?: string;
	/** Renders the button disabled (e.g. while the key is frozen). */
	disabled?: boolean;
	/** Tooltip explaining why the button is disabled. */
	disabledReason?: string;
	className?: string;
}

/**
 * "Add to Bundle" action (#1118).
 *
 * Queues a creator key into the bundle cart so several keys can be purchased
 * in one atomic `bundle_buy` transaction. Toggles membership: clicking again
 * removes the key from the cart.
 */
export const AddToBundleButton: React.FC<AddToBundleButtonProps> = ({
	keyId,
	keyName,
	priceStroops,
	currentSupply,
	thumbnail,
	disabled = false,
	disabledReason,
	className,
}) => {
	const isInCart = useBundleCartStore(state =>
		state.items.some(item => item.keyId === keyId)
	);
	const addItem = useBundleCartStore(state => state.addItem);
	const removeItem = useBundleCartStore(state => state.removeItem);

	const handleClick = () => {
		if (disabled) return;
		if (isInCart) {
			removeItem(keyId);
			showToast.success(`${keyName} removed from bundle`);
			return;
		}
		addItem({ keyId, keyName, priceStroops, currentSupply, thumbnail });
		showToast.success(`${keyName} added to bundle`);
	};

	const button = (
		<Button
			type="button"
			variant="outline"
			onClick={handleClick}
			aria-pressed={isInCart}
			data-testid="add-to-bundle-button"
			data-in-cart={isInCart}
			className={cn(
				'gap-1.5 rounded-xl border-white/15 bg-white/[0.04] font-bold text-white/85 hover:border-amber-400/50 hover:text-amber-300',
				isInCart &&
					'border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:border-emerald-400/60 hover:bg-emerald-400/20 hover:text-emerald-200',
				className
			)}
		>
			{isInCart ? (
				<>
					<Check className="size-4" aria-hidden="true" />
					In Bundle
				</>
			) : (
				<>
					<ShoppingBag className="size-4" aria-hidden="true" />
					Add to Bundle
				</>
			)}
		</Button>
	);

	if (disabled) {
		return (
			<UnavailableAction disabled reason={disabledReason}>
				{button}
			</UnavailableAction>
		);
	}

	return button;
};

export default AddToBundleButton;
