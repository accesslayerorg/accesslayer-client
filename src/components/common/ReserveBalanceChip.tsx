import { AlertTriangle, Info } from 'lucide-react';
import { Tooltip } from '@/components/ui/tooltip';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import {
	getKeyReserveStatus,
	RESERVE_TOOLTIP_TEXT,
	type KeyReserve,
} from '@/utils/keyReserve.utils';

interface ReserveBalanceChipProps {
	reserve: KeyReserve;
}

/** Reserve balance value for the key detail stats row, with a low-reserve warning (#1208). */
export default function ReserveBalanceChip({ reserve }: ReserveBalanceChipProps) {
	const { visible, isLow } = getKeyReserveStatus(reserve);
	if (!visible) return null;

	return (
		<div className="flex flex-wrap items-center gap-2">
			<span data-testid="reserve-balance-value">
				{formatDisplayKeyPrice(reserve.reserveStroops)}
			</span>
			<Tooltip content={RESERVE_TOOLTIP_TEXT}>
				<button
					type="button"
					aria-label="What is the reserve balance?"
					data-testid="reserve-balance-info"
					className="inline-flex text-white/45 hover:text-white/80"
				>
					<Info className="size-3.5" aria-hidden="true" />
				</button>
			</Tooltip>
			{isLow && (
				<span
					data-testid="reserve-low-warning"
					className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-400/15 px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide text-amber-300"
				>
					<AlertTriangle className="size-3" aria-hidden="true" />
					Low reserve
				</span>
			)}
		</div>
	);
}
