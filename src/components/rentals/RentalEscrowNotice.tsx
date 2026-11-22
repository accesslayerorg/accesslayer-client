import { Link } from 'react-router';
import { Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { RENTAL_ESCROW_REASON } from '@/utils/keyRental.utils';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface RentalEscrowNoticeProps {
	/** Keys of this creator the wallet has listed or rented out. */
	escrowedQuantity: number;
	className?: string;
}

/**
 * Explains, next to the sell and transfer actions, that keys listed for rent
 * are escrowed and not part of the tradable balance (#1360).
 */
export default function RentalEscrowNotice({
	escrowedQuantity,
	className,
}: RentalEscrowNoticeProps) {
	if (escrowedQuantity <= 0) return null;

	return (
		<div
			className={cn(
				'flex items-start gap-2 rounded-xl border border-sky-400/20 bg-sky-400/5 px-3 py-2 text-xs text-sky-200/90',
				className
			)}
			role="note"
			data-testid="rental-escrow-notice"
		>
			<Lock className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
			<p>
				<span className="font-semibold">
					{formatNumber(escrowedQuantity)} key
					{escrowedQuantity === 1 ? '' : 's'} listed for rent.
				</span>{' '}
				{RENTAL_ESCROW_REASON}{' '}
				<Link
					to="/rentals/mine"
					className="font-semibold text-sky-300 underline-offset-2 hover:underline"
				>
					Manage rentals
				</Link>
			</p>
		</div>
	);
}
