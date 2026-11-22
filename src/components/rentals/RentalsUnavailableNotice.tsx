import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Shown while no rental contract is configured (`VITE_KEY_RENTAL_CONTRACT_ID`),
 * so the pages explain why nothing can be listed or rented yet (#1360).
 */
export default function RentalsUnavailableNotice({
	className,
}: {
	className?: string;
}) {
	return (
		<div
			className={cn(
				'flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 text-sm text-amber-100/90',
				className
			)}
			role="status"
			data-testid="rentals-unavailable"
		>
			<Info
				className="mt-0.5 size-4 shrink-0 text-amber-300"
				aria-hidden="true"
			/>
			<p>
				Key rentals are not live on this network yet. Listing and renting
				will open once the rental contract is deployed.
			</p>
		</div>
	);
}
