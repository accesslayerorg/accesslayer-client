import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFeeChangeStore } from '@/hooks/useFeeChange';
import { FEE_BOUNDS } from '@/constants/fees';
import { bpsToPercent } from '@/utils/numberFormat.utils';

function defaultEta(): string {
	const date = new Date(Date.now() + 24 * 3_600_000);
	const pad = (value: number) => String(value).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
		date.getDate()
	)}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function FeeChangeAdminPanel() {
	const state = useFeeChangeStore(store => store.state);
	const queue = useFeeChangeStore(store => store.queue);
	const cancel = useFeeChangeStore(store => store.cancel);
	const execute = useFeeChangeStore(store => store.execute);
	const [newFeeBps, setNewFeeBps] = useState(
		String(FEE_BOUNDS.DEFAULT_FEE_BPS)
	);
	const [eta, setEta] = useState(defaultEta);
	const [error, setError] = useState<string | null>(null);

	const handleQueue = () => {
		try {
			queue({
				queuedFeeBps: Number(newFeeBps),
				eta: new Date(eta).toISOString(),
			});
			setError(null);
		} catch (err) {
			setError(
				err instanceof Error ? err.message : 'Could not queue fee change.'
			);
		}
	};

	return (
		<section
			className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-white"
			data-testid="fee-change-admin-panel"
		>
			<h2 className="font-grotesque text-xl font-bold">Fee changes</h2>
			<p className="mt-1 text-sm text-white/50">
				Current fee: {bpsToPercent(state.currentFeeBps)} · Status:{' '}
				{state.status}
			</p>

			{state.status === 'pending' && (
				<div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[0.06] p-3 text-sm text-amber-100/85">
					<p data-testid="admin-fee-queued">
						Queued {bpsToPercent(state.queuedFeeBps ?? 0)} for{' '}
						{state.eta
							? new Date(state.eta).toLocaleString()
							: 'an unset time'}
						.
					</p>
					<div className="mt-3 flex gap-2">
						<Button
							size="sm"
							variant="outline"
							onClick={() => cancel()}
							data-testid="fee-change-cancel"
							className="border-rose-500/30 text-rose-200 hover:bg-rose-500/10"
						>
							Cancel change
						</Button>
						<Button
							size="sm"
							onClick={() => execute()}
							data-testid="fee-change-execute"
							className="bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300"
						>
							Execute now
						</Button>
					</div>
				</div>
			)}

			{state.status !== 'pending' && (
				<div className="mt-5 grid gap-4 sm:grid-cols-2">
					<div className="space-y-1.5">
						<Label htmlFor="fee-change-bps">New fee (bps)</Label>
						<Input
							id="fee-change-bps"
							type="number"
							min={FEE_BOUNDS.MIN_FEE_BPS}
							max={FEE_BOUNDS.MAX_FEE_BPS}
							value={newFeeBps}
							onChange={event => setNewFeeBps(event.target.value)}
							data-testid="fee-change-bps"
						/>
					</div>
					<div className="space-y-1.5">
						<Label htmlFor="fee-change-eta">Execution ETA</Label>
						<Input
							id="fee-change-eta"
							type="datetime-local"
							value={eta}
							onChange={event => setEta(event.target.value)}
							data-testid="fee-change-eta-input"
						/>
					</div>
					<div className="sm:col-span-2">
						<Button onClick={handleQueue} data-testid="fee-change-queue">
							Queue fee change
						</Button>
					</div>
				</div>
			)}

			{error && (
				<p role="alert" className="mt-3 text-sm text-rose-300">
					{error}
				</p>
			)}
		</section>
	);
}
