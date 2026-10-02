import { BellRing, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDeletePriceAlert, usePriceAlerts } from '@/hooks/usePriceAlerts';
import { formatDisplayKeyPrice } from '@/utils/keyPriceDisplay.utils';
import showToast from '@/utils/toast.util';

export default function PriceAlertsSection() {
	const alertsQuery = usePriceAlerts();
	const deleteAlert = useDeletePriceAlert();
	const alerts = (alertsQuery.data ?? []).filter(alert => alert.active);

	const handleDelete = async (alertId: string) => {
		try {
			await deleteAlert.mutateAsync(alertId);
			showToast.success('Price alert deleted.');
		} catch (error) {
			showToast.error(error instanceof Error ? error.message : 'Couldn’t delete this alert.');
		}
	};

	return (
		<section aria-labelledby="my-alerts-heading" data-testid="my-alerts-section">
			<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
				<div className="mb-6 flex items-start gap-3">
					<span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
						<BellRing className="size-5" aria-hidden="true" />
					</span>
					<div>
						<h2 id="my-alerts-heading" className="font-grotesque text-2xl font-bold text-white">
							My Alerts
						</h2>
						<p className="mt-1 text-sm text-white/60">
							Price thresholds we’re watching for you.
						</p>
					</div>
				</div>

				{alertsQuery.isLoading ? (
					<div className="space-y-3" aria-label="Loading alerts" aria-busy="true">
						{Array.from({ length: 2 }, (_, index) => (
							<div key={index} className="h-20 animate-pulse rounded-xl bg-white/[0.05]" />
						))}
					</div>
				) : alertsQuery.isError ? (
					<div role="alert" className="rounded-xl border border-rose-400/20 bg-rose-400/[0.06] p-4 text-sm text-rose-200">
						Couldn’t load your alerts.
						<button type="button" onClick={() => void alertsQuery.refetch()} className="ml-2 font-semibold underline">
							Try again
						</button>
					</div>
				) : alerts.length === 0 ? (
					<div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
						<p className="font-semibold text-white">No active alerts</p>
						<p className="mt-1 text-sm text-white/45">Set one from any key detail page.</p>
					</div>
				) : (
					<ul className="space-y-3" data-testid="my-alerts-list">
						{alerts.map(alert => (
							<li
								key={alert.id}
								className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[0.035] p-4 sm:flex-row sm:items-center sm:justify-between"
							>
								<div className="min-w-0">
									<p className="truncate font-semibold text-white">
										{alert.keyName || `Key ${alert.keyId}`}
									</p>
									<p className="mt-1 text-sm text-white/60">
										Alert when price is{' '}
										<span className={alert.direction === 'above' ? 'text-emerald-300' : 'text-rose-300'}>
											{alert.direction}
										</span>{' '}
										<span className="font-mono text-white">{formatDisplayKeyPrice(alert.targetPrice)}</span>
									</p>
								</div>
								<Button
									type="button"
									variant="ghost"
									disabled={deleteAlert.isPending}
									onClick={() => void handleDelete(alert.id)}
									className="shrink-0 self-start text-rose-300 hover:bg-rose-400/10 hover:text-rose-200 sm:self-auto"
									aria-label={`Delete alert for ${alert.keyName || alert.keyId}`}
									data-testid={`delete-alert-${alert.id}`}
								>
									<Trash2 className="size-4" aria-hidden="true" /> Delete
								</Button>
							</li>
						))}
					</ul>
				)}
			</div>
		</section>
	);
}
