import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { LimitOrder } from '@/services/orders';

function remaining(expiresAt: string, now: number) {
	const seconds = Math.max(
		0,
		Math.ceil((new Date(expiresAt).getTime() - now) / 1000)
	);
	if (seconds === 0) return 'Expired';
	const days = Math.floor(seconds / 86400);
	const hours = Math.floor((seconds % 86400) / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	return days
		? `${days}d ${hours}h`
		: hours
			? `${hours}h ${minutes}m`
			: `${minutes}m`;
}

export default function OpenOrdersTable({
	orders,
	onCancel,
	isCancelling,
}: {
	orders: LimitOrder[];
	onCancel: (id: string) => void;
	isCancelling?: boolean;
}) {
	const [now, setNow] = useState(() => Date.now());
	useEffect(() => {
		const timer = window.setInterval(() => setNow(Date.now()), 30_000);
		return () => window.clearInterval(timer);
	}, []);
	const activeOrders = orders.filter(
		order => new Date(order.expiresAt).getTime() > now
	);
	if (!activeOrders.length)
		return <p className="text-sm text-white/55">No open limit orders.</p>;
	return (
		<div className="overflow-x-auto">
			<table className="w-full text-left text-sm">
				<thead className="text-white/50">
					<tr>
						<th className="py-2">Side</th>
						<th>Target</th>
						<th>Quantity</th>
						<th>Expires</th>
						<th />
					</tr>
				</thead>
				<tbody>
					{activeOrders.map(order => (
						<tr key={order.id} className="border-t border-white/10">
							<td className="py-2 capitalize">{order.side}</td>
							<td>{order.targetPrice}</td>
							<td>{order.quantity}</td>
							<td>{remaining(order.expiresAt, now)}</td>
							<td className="text-right">
								<Button
									variant="outline"
									size="sm"
									disabled={isCancelling}
									onClick={() => onCancel(order.id)}
								>
									Cancel
								</Button>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
