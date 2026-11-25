import { useState } from 'react';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { STROOPS_PER_XLM } from '@/constants/stellar';
import type { AlertDirection } from '@/types/priceAlert.types';

interface PriceAlertFormProps {
	creatorId: string;
	creatorTitle: string;
	currentPriceStroops: number;
	onClose: () => void;
}

export default function PriceAlertForm({
	creatorId,
	creatorTitle,
	currentPriceStroops,
	onClose,
}: PriceAlertFormProps) {
	const { addAlert } = usePriceAlerts();
	const [threshold, setThreshold] = useState('');
	const [direction, setDirection] = useState<AlertDirection>('above');
	const [error, setError] = useState('');

	const currentPriceXlm = (currentPriceStroops / STROOPS_PER_XLM).toFixed(4);

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		const parsed = parseFloat(threshold);
		if (!threshold || isNaN(parsed) || parsed <= 0) {
			setError('Enter a valid price greater than 0.');
			return;
		}
		addAlert({
			creatorId,
			creatorTitle,
			thresholdStroops: Math.round(parsed * STROOPS_PER_XLM),
			direction,
		});
		onClose();
	};

	return (
		<form
			onSubmit={handleSubmit}
			className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5"
			aria-label="Create price alert"
		>
			<div className="flex items-center gap-2">
				<Bell className="size-4 text-primary" aria-hidden="true" />
				<h3 className="text-sm font-semibold text-foreground">
					Set Price Alert — {creatorTitle}
				</h3>
			</div>

			<p className="text-xs text-muted-foreground">
				Current price:{' '}
				<span className="font-medium text-foreground">{currentPriceXlm} XLM</span>
			</p>

			<div className="flex flex-col gap-1">
				<label
					htmlFor="alert-direction"
					className="text-xs font-medium text-foreground"
				>
					Alert me when price goes
				</label>
				<select
					id="alert-direction"
					value={direction}
					onChange={e => setDirection(e.target.value as AlertDirection)}
					className={cn(
						'rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground',
						'focus:outline-none focus:ring-2 focus:ring-primary/50'
					)}
				>
					<option value="above">Above threshold ↑</option>
					<option value="below">Below threshold ↓</option>
				</select>
			</div>

			<div className="flex flex-col gap-1">
				<label
					htmlFor="alert-threshold"
					className="text-xs font-medium text-foreground"
				>
					Threshold price (XLM)
				</label>
				<input
					id="alert-threshold"
					type="number"
					step="0.0001"
					min="0.0001"
					value={threshold}
					onChange={e => {
						setThreshold(e.target.value);
						setError('');
					}}
					placeholder="e.g. 0.1500"
					className={cn(
						'rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground',
						'placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50',
						error && 'border-destructive'
					)}
				/>
				{error && <p className="text-xs text-destructive">{error}</p>}
			</div>

			<div className="flex gap-2">
				<button
					type="submit"
					className={cn(
						'flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground',
						'hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50'
					)}
				>
					Create Alert
				</button>
				<button
					type="button"
					onClick={onClose}
					className={cn(
						'rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground',
						'hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/50'
					)}
				>
					Cancel
				</button>
			</div>
		</form>
	);
}
