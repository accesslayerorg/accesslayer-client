import { Button } from '@/components/ui/button';
import type { Broadcast } from '@/services/broadcasts.service';

const stat = (n: number | null) => (n === null ? '—' : n.toLocaleString());

interface BroadcastHistoryProps {
	broadcasts: Broadcast[];
	onCancel?: (id: string) => void;
}

/** Past and scheduled broadcasts with delivery statistics (#1476). */
export default function BroadcastHistory({ broadcasts, onCancel }: BroadcastHistoryProps) {
	if (broadcasts.length === 0) return <p className="text-sm text-white/50">No broadcasts yet.</p>;
	return (
		<div className="overflow-x-auto">
			<table className="w-full min-w-[40rem] text-left text-sm">
				<caption className="sr-only">Broadcast history with delivery statistics</caption>
				<thead>
					<tr className="border-b border-white/10 text-[0.65rem] uppercase tracking-[0.18em] text-white/40">
						<th scope="col" className="py-2 pr-4">Subject</th>
						<th scope="col" className="py-2 pr-4">Date</th>
						<th scope="col" className="py-2 pr-4 text-right">Recipients</th>
						<th scope="col" className="py-2 pr-4 text-right">Delivered</th>
						<th scope="col" className="py-2 pr-4 text-right">Bounced</th>
						<th scope="col" className="py-2 pr-4 text-right">Unsubscribed</th>
						<th scope="col" className="py-2"><span className="sr-only">Actions</span></th>
					</tr>
				</thead>
				<tbody>
					{broadcasts.map(b => (
						<tr key={b.id} className="border-b border-white/5" data-testid={`broadcast-row-${b.id}`}>
							<th scope="row" className="py-2 pr-4 font-semibold text-white">{b.subject}</th>
							<td className="py-2 pr-4 text-white/70">
								{b.status === 'scheduled' ? 'Scheduled for ' : ''}
								<time dateTime={b.sendAt}>{new Date(b.sendAt).toLocaleString()}</time>
							</td>
							<td className="py-2 pr-4 text-right font-mono">{b.status === 'scheduled' ? '—' : b.recipients.length}</td>
							<td className="py-2 pr-4 text-right font-mono">{stat(b.delivered)}</td>
							<td className="py-2 pr-4 text-right font-mono">{stat(b.bounced)}</td>
							<td className="py-2 pr-4 text-right font-mono">{b.status === 'scheduled' ? '—' : b.unsubscribed}</td>
							<td className="py-2 text-right">
								{b.status === 'scheduled' && onCancel && (
									<Button type="button" size="sm" variant="ghost" className="text-white/70" onClick={() => onCancel(b.id)}>
										Cancel
									</Button>
								)}
							</td>
						</tr>
					))}
				</tbody>
			</table>
			<p className="mt-2 text-xs text-white/40">
				Delivered and bounced counts appear once the email provider reports them.
			</p>
		</div>
	);
}
