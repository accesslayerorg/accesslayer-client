import { useEffect, useMemo, useState } from 'react';
import { BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { useCreatePriceAlert } from '@/hooks/usePriceAlerts';
import type { PriceAlertDirection } from '@/services/priceAlert.service';
import { cn } from '@/lib/utils';
import { parsePositivePrice } from '@/utils/priceAlert.utils';
import showToast from '@/utils/toast.util';

interface PriceAlertDialogProps {
	keyId: string;
	keyName?: string;
	currentPrice?: number | null;
}

export default function PriceAlertDialog({
	keyId,
	keyName = 'this key',
	currentPrice,
}: PriceAlertDialogProps) {
	const [open, setOpen] = useState(false);
	const [targetText, setTargetText] = useState('');
	const [direction, setDirection] = useState<PriceAlertDirection>('above');
	const createAlert = useCreatePriceAlert();
	const targetPrice = useMemo(() => parsePositivePrice(targetText), [targetText]);
	const invalid = targetText.trim().length > 0 && targetPrice === null;

	useEffect(() => {
		if (!open) return;
		setTargetText(currentPrice != null && currentPrice > 0 ? String(currentPrice) : '');
		setDirection('above');
		createAlert.reset();
	}, [createAlert, currentPrice, open]);

	const handleSave = async () => {
		if (targetPrice === null) return;
		try {
			await createAlert.mutateAsync({ keyId, targetPrice, direction });
			showToast.success(
				`Price alert set for ${keyName}. We’ll notify you when the price moves ${direction} your target.`
			);
			setOpen(false);
		} catch (error) {
			showToast.error(
				error instanceof Error ? error.message : 'Couldn’t save your price alert.'
			);
		}
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button
					type="button"
					variant="outline"
					className="border-white/20 bg-white/[0.04] text-white hover:bg-white/10"
					data-testid="set-alert-button"
				>
					<BellRing className="size-4" aria-hidden="true" />
					Set Alert
				</Button>
			</DialogTrigger>
			<DialogContent className="border-white/10 bg-[#0b1728] text-white">
				<DialogHeader>
					<DialogTitle className="text-white">Set a price alert</DialogTitle>
					<DialogDescription className="text-white/60">
						We’ll check {keyName} every 60 seconds and notify you when it crosses your target.
					</DialogDescription>
				</DialogHeader>

				<form
					className="space-y-5"
					onSubmit={event => {
						event.preventDefault();
						void handleSave();
					}}
				>
					<div className="space-y-2">
						<label htmlFor="price-alert-target" className="text-sm font-medium text-white/80">
							Target price
						</label>
						<input
							id="price-alert-target"
							type="number"
							inputMode="decimal"
							min="0"
							step="any"
							value={targetText}
							onChange={event => setTargetText(event.target.value)}
							aria-invalid={invalid}
							aria-describedby="price-alert-help price-alert-error"
							placeholder="Enter a positive price"
							className={cn(
								'w-full rounded-xl border border-white/15 bg-white/[0.05] px-4 py-3 text-white outline-none transition focus:border-cyan-300 focus:ring-2 focus:ring-cyan-300/20',
								invalid && 'border-rose-400 focus:border-rose-400 focus:ring-rose-400/20'
							)}
						/>
						<p id="price-alert-help" className="text-xs text-white/45">
							Use the key’s quoted unit, XLM.
						</p>
						{invalid ? (
							<p id="price-alert-error" role="alert" className="text-xs text-rose-300">
								Enter a target price greater than zero.
							</p>
						) : null}
					</div>

					<fieldset>
						<legend className="mb-2 text-sm font-medium text-white/80">Notify me when price is</legend>
						<div className="grid grid-cols-2 gap-2 rounded-xl bg-white/[0.04] p-1">
							{(['above', 'below'] as const).map(option => (
								<button
									key={option}
									type="button"
									onClick={() => setDirection(option)}
									aria-pressed={direction === option}
									className={cn(
										'rounded-lg px-4 py-2 text-sm font-semibold capitalize transition',
										direction === option
											? 'bg-cyan-400 text-slate-950 shadow'
											: 'text-white/60 hover:bg-white/5 hover:text-white'
									)}
								>
									{option}
								</button>
							))}
						</div>
					</fieldset>

					{createAlert.isError ? (
						<p role="alert" className="text-sm text-rose-300">
							{createAlert.error instanceof Error
								? createAlert.error.message
								: 'Couldn’t save your price alert.'}
						</p>
					) : null}

					<DialogFooter>
						<Button
							type="button"
							variant="ghost"
							className="text-white/70 hover:text-white"
							onClick={() => setOpen(false)}
						>
							Cancel
						</Button>
						<Button
							type="submit"
							disabled={targetPrice === null || createAlert.isPending}
							className="bg-cyan-400 text-slate-950 hover:bg-cyan-300"
						>
							{createAlert.isPending ? 'Saving…' : 'Save'}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
