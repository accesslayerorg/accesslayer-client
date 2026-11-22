import type { AutoInvestHistory } from '@/types/autoInvest';
import { formatNumber } from '@/utils/numberFormat.utils';
import { formatDistanceToNow } from 'date-fns';
import { CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Link } from 'react-router';

interface Props {
	history: AutoInvestHistory[];
}

function getStatusIcon(status: string) {
	switch (status) {
		case 'success':
			return <CheckCircle2 className="size-4 text-emerald-400" />;
		case 'failed':
			return <AlertCircle className="size-4 text-red-400" />;
		case 'pending':
			return <Clock className="size-4 text-amber-400" />;
		default:
			return null;
	}
}

function getStatusBadgeClass(status: string) {
	switch (status) {
		case 'success':
			return 'bg-emerald-400/20 text-emerald-300';
		case 'failed':
			return 'bg-red-400/20 text-red-300';
		case 'pending':
			return 'bg-amber-400/20 text-amber-300';
		default:
			return 'bg-white/10 text-white/50';
	}
}

export default function AutoInvestHistoryTable({ history }: Props) {
	if (history.length === 0) {
		return (
			<div className="rounded-lg border border-white/10 bg-white/5 px-6 py-8 text-center">
				<p className="text-sm text-white/60">
					No auto-invest executions yet. Rules will appear here once they trigger.
				</p>
			</div>
		);
	}

	return (
		<div className="overflow-x-auto">
			<table className="w-full text-sm">
				<thead>
					<tr className="border-b border-white/10">
						<th className="px-4 py-3 text-left font-semibold text-white/70">
							Key
						</th>
						<th className="px-4 py-3 text-left font-semibold text-white/70">
							Rule
						</th>
						<th className="px-4 py-3 text-right font-semibold text-white/70">
							Amount (XLM)
						</th>
						<th className="px-4 py-3 text-left font-semibold text-white/70">
							Status
						</th>
						<th className="px-4 py-3 text-left font-semibold text-white/70">
							Executed
						</th>
					</tr>
				</thead>
				<tbody>
					{history.map((item) => (
						<tr
							key={item.id}
							className="border-b border-white/5 hover:bg-white/[0.02] transition-colors"
						>
							<td className="px-4 py-3">
								<Link
									to={`/creator/${item.creatorKeyId}`}
									className="font-semibold text-amber-400 hover:text-amber-300 underline-offset-2 hover:underline"
								>
									{item.creatorKeyTitle}
								</Link>
							</td>
							<td className="px-4 py-3 text-white/70">
								{item.ruleName}
							</td>
							<td className="px-4 py-3 text-right font-mono text-white">
								{formatNumber(item.amountXlm)}
							</td>
							<td className="px-4 py-3">
								<div className="flex items-center gap-2">
									{getStatusIcon(item.status)}
									<span
										className={`text-xs font-semibold px-2 py-1 rounded-full ${getStatusBadgeClass(item.status)}`}
									>
										{item.status.charAt(0).toUpperCase() + item.status.slice(1)}
									</span>
									{item.errorMessage && (
										<span
											className="text-xs text-red-300 cursor-help"
											title={item.errorMessage}
										>
											ⓘ
										</span>
									)}
								</div>
							</td>
							<td className="px-4 py-3 text-white/60">
								{formatDistanceToNow(new Date(item.executedAt), {
									addSuffix: true,
								})}
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
}
