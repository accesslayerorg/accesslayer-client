import { Bell, ArrowLeft, Wifi, WifiOff } from 'lucide-react';
import { useNavigate } from 'react-router';
import { cn } from '@/lib/utils';
import { usePriceAlerts } from '@/hooks/usePriceAlerts';
import { usePriceAlertMonitor } from '@/hooks/usePriceAlertMonitor';
import PriceAlertRow from '@/components/common/PriceAlertRow';
import PriceChart from '@/components/charts/PriceChart';

export default function PriceAlertsSettingsPage() {
	const navigate = useNavigate();
	const { alerts, removeAlert } = usePriceAlerts();
	const { isConnected } = usePriceAlertMonitor();

	const selectedKey =
		alerts.length > 0 ? alerts[alerts.length - 1].creatorId : null;

	return (
		<main className="mx-auto max-w-2xl px-6 py-16">
			{/* Header */}
			<div className="mb-8 flex items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<button
						type="button"
						onClick={() => void navigate('/')}
						aria-label="Go back"
						className={cn(
							'rounded-lg p-1.5 text-muted-foreground',
							'hover:bg-muted hover:text-foreground',
							'focus:outline-none focus:ring-2 focus:ring-primary/50'
						)}
					>
						<ArrowLeft className="size-5" aria-hidden="true" />
					</button>
					<Bell className="size-6 text-foreground" aria-hidden="true" />
					<h1 className="text-2xl font-bold text-foreground">Price Alerts</h1>
				</div>

				{/* WebSocket connection indicator */}
				<div
					className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium"
					aria-label={
						isConnected ? 'Price monitor connected' : 'Price monitor disconnected'
					}
				>
					{isConnected ? (
						<>
							<Wifi className="size-3.5 text-emerald-500" aria-hidden="true" />
							<span className="text-emerald-600 dark:text-emerald-400">Live</span>
						</>
					) : (
						<>
							<WifiOff className="size-3.5 text-muted-foreground" aria-hidden="true" />
							<span className="text-muted-foreground">Offline</span>
						</>
					)}
				</div>
			</div>

			{/* Price chart with zoom, crosshair, export and annotations */}
			{selectedKey && (
				<section className="mb-8" aria-label="Price chart">
					<PriceChart data={[]} chartKey={selectedKey} symbol={selectedKey} />
				</section>
			)}

			{/* Alert list */}
			{alerts.length === 0 ? (
				<div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-16 text-center">
					<Bell className="size-8 text-muted-foreground" aria-hidden="true" />
					<p className="text-sm font-medium text-foreground">
						No alerts configured
					</p>
					<p className="max-w-xs text-xs text-muted-foreground">
						Set a price alert from any creator's profile to be notified when
						their key price crosses your threshold.
					</p>
				</div>
			) : (
				<ul className="flex flex-col gap-2" aria-label="Configured price alerts">
					{alerts.map(alert => (
						<PriceAlertRow
							key={alert.id}
							alert={alert}
							onDelete={removeAlert}
						/>
					))}
				</ul>
			)}

			<p className="mt-6 text-xs text-muted-foreground">
				{alerts.length} alert{alerts.length !== 1 ? 's' : ''} configured.
				Alerts are stored locally and checked in real-time via WebSocket.
			</p>
		</main>
	);
}
