import { useMemo, useState } from 'react';
import {
	ResponsiveContainer,
	LineChart,
	Line,
	XAxis,
	YAxis,
	Tooltip as RechartsTooltip,
	CartesianGrid,
} from 'recharts';
import {
	Calendar,
	Download,
	Layers,
	TrendingUp,
	TrendingDown,
	Info,
	History,
} from 'lucide-react';
import { format } from 'date-fns';
import { useBalanceHistory } from '@/hooks/useBalanceHistory';
import {
	computeHoldingsAsOfDate,
	exportBalanceHistoryToCsv,
	DEFAULT_REFERENCE_TIMESTAMP,
} from '@/utils/balanceHistory.utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import showToast from '@/utils/toast.util';

interface BalanceHistoryChartProps {
	address: string;
	keyNames?: Record<string, string | undefined>;
	className?: string;
}

interface ChartPoint {
	timestamp: number;
	formattedTime: string;
	balance: number;
	ledger: number;
	eventType: 'buy' | 'sell' | 'initial';
	change: number;
	keyId: string;
	keyName: string;
}

// Custom Dot for Buy/Sell Markers
interface CustomizedDotProps {
	cx?: number;
	cy?: number;
	payload?: ChartPoint;
}

function CustomizedDot({ cx, cy, payload }: CustomizedDotProps) {
	if (!payload) return null;

	const isBuy = payload.eventType === 'buy';
	const isSell = payload.eventType === 'sell';

	if (isBuy) {
		return (
			<circle
				cx={cx}
				cy={cy}
				r={5}
				fill="#10b981"
				stroke="#06111f"
				strokeWidth={2}
				data-testid={`marker-buy-${payload.ledger}`}
			/>
		);
	}

	if (isSell) {
		return (
			<circle
				cx={cx}
				cy={cy}
				r={5}
				fill="#f43f5e"
				stroke="#06111f"
				strokeWidth={2}
				data-testid={`marker-sell-${payload.ledger}`}
			/>
		);
	}

	return <circle cx={cx} cy={cy} r={3} fill="#f59e0b" />;
}

export function BalanceHistoryChart({
	address,
	keyNames = {},
	className,
}: BalanceHistoryChartProps) {
	const [selectedKey, setSelectedKey] = useState<string>('all');
	const [asOfDate, setAsOfDate] = useState<string>('2026-01-01');

	const { data: rawCheckpoints = [], isLoading } = useBalanceHistory(
		address,
		selectedKey
	);

	// Extract unique available keys
	const availableKeys = useMemo(() => {
		const map = new Map<string, string>();
		for (const cp of rawCheckpoints) {
			map.set(cp.keyId, keyNames[cp.keyId] || cp.keyName || cp.keyId);
		}
		return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
	}, [rawCheckpoints, keyNames]);

	// Filtered checkpoints according to selected key
	const filteredCheckpoints = useMemo(() => {
		if (selectedKey === 'all') {
			return rawCheckpoints;
		}
		return rawCheckpoints.filter(cp => cp.keyId === selectedKey);
	}, [rawCheckpoints, selectedKey]);

	// Prepare data points for Recharts step-after line
	const chartData = useMemo<ChartPoint[]>(() => {
		const sorted = [...filteredCheckpoints].sort(
			(a, b) => a.timestamp - b.timestamp
		);

		// If combined view, calculate running total across keys
		if (selectedKey === 'all') {
			let runningTotal = 0;
			const keyBalances: Record<string, number> = {};

			return sorted.map(cp => {
				const prevBalance = keyBalances[cp.keyId] || 0;
				keyBalances[cp.keyId] = cp.balance;
				runningTotal += cp.balance - prevBalance;

				return {
					timestamp: cp.timestamp,
					formattedTime: format(new Date(cp.timestamp), 'MMM d, HH:mm'),
					balance: runningTotal,
					ledger: cp.ledger,
					eventType: cp.eventType,
					change: cp.change,
					keyId: cp.keyId,
					keyName: keyNames[cp.keyId] || cp.keyName || cp.keyId,
				};
			});
		}

		// Single key view
		return sorted.map(cp => ({
			timestamp: cp.timestamp,
			formattedTime: format(new Date(cp.timestamp), 'MMM d, HH:mm'),
			balance: cp.balance,
			ledger: cp.ledger,
			eventType: cp.eventType,
			change: cp.change,
			keyId: cp.keyId,
			keyName: keyNames[cp.keyId] || cp.keyName || cp.keyId,
		}));
	}, [filteredCheckpoints, selectedKey, keyNames]);

	// As-of Date calculation
	const asOfResult = useMemo(() => {
		const dateObj = asOfDate
			? new Date(`${asOfDate}T00:00:00Z`)
			: new Date(DEFAULT_REFERENCE_TIMESTAMP);
		return computeHoldingsAsOfDate(rawCheckpoints, dateObj, keyNames);
	}, [rawCheckpoints, asOfDate, keyNames]);

	// CSV Export handler
	const handleExportCsv = () => {
		if (filteredCheckpoints.length === 0) {
			showToast.error('No history available to export.');
			return;
		}

		const csvContent = exportBalanceHistoryToCsv(filteredCheckpoints);
		const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.setAttribute(
			'download',
			`balance-history-${selectedKey}-${new Date().toISOString().split('T')[0]}.csv`
		);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		showToast.success('Balance history exported to CSV.');
	};

	return (
		<section
			data-testid="balance-history-section"
			className={`space-y-6 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-white ${className || ''}`}
		>
			{/* Header with key selector & CSV export */}
			<div className="flex flex-wrap items-center justify-between gap-4">
				<div className="flex items-center gap-2">
					<History className="size-5 text-amber-400" />
					<h3 className="font-grotesque text-lg font-bold">
						Balance Checkpoint History
					</h3>
				</div>

				<div className="flex flex-wrap items-center gap-3">
					{/* Per-key view vs Combined */}
					<div className="flex items-center gap-2">
						<Layers className="size-4 text-white/50" />
						<select
							data-testid="balance-history-key-select"
							value={selectedKey}
							onChange={e => setSelectedKey(e.target.value)}
							className="rounded-lg border border-white/10 bg-[#06111f] px-3 py-1.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
						>
							<option value="all">Combined (All Keys)</option>
							{availableKeys.map(k => (
								<option key={k.id} value={k.id}>
									{k.name}
								</option>
							))}
						</select>
					</div>

					<Button
						type="button"
						size="sm"
						variant="outline"
						data-testid="export-balance-history-csv-btn"
						onClick={handleExportCsv}
						className="gap-1.5 border-white/10 text-xs text-white/80 hover:bg-white/10"
					>
						<Download className="size-3.5" />
						Export CSV
					</Button>
				</div>
			</div>

			{/* Chart Display */}
			<div
				data-testid="balance-history-chart-container"
				className="h-64 w-full rounded-xl border border-white/10 bg-[#06111f]/60 p-4"
			>
				{isLoading ? (
					<div className="flex h-full items-center justify-center text-xs text-white/50">
						Loading checkpoint history...
					</div>
				) : chartData.length === 0 ? (
					<div className="flex h-full items-center justify-center text-xs text-white/40">
						No checkpoints found for this range.
					</div>
				) : (
					<ResponsiveContainer width="100%" height="100%">
						<LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: -20 }}>
							<CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
							<XAxis
								dataKey="formattedTime"
								tick={{ fill: '#ffffff60', fontSize: 10 }}
								stroke="#ffffff20"
							/>
							<YAxis
								tick={{ fill: '#ffffff60', fontSize: 10 }}
								stroke="#ffffff20"
								allowDecimals={false}
							/>
							<RechartsTooltip
								content={({ active, payload }) => {
									if (!active || !payload || !payload.length) return null;
									const data = payload[0].payload as ChartPoint;
									const isBuy = data.eventType === 'buy';
									return (
										<div className="rounded-lg border border-white/15 bg-[#0b1728] p-3 text-xs shadow-xl">
											<p className="font-semibold text-white">{data.keyName}</p>
											<p className="text-[10px] text-white/50">Ledger #{data.ledger}</p>
											<p className="mt-1 font-mono text-amber-300">
												Balance: {data.balance} keys
											</p>
											<div className="mt-1 flex items-center gap-1 text-[11px]">
												{isBuy ? (
													<span className="flex items-center text-emerald-400">
														<TrendingUp className="mr-0.5 size-3" />+{data.change} (Buy)
													</span>
												) : (
													<span className="flex items-center text-rose-400">
														<TrendingDown className="mr-0.5 size-3" />{data.change} (Sell)
													</span>
												)}
											</div>
										</div>
									);
								}}
							/>
							<Line
								type="stepAfter"
								dataKey="balance"
								stroke="#f59e0b"
								strokeWidth={2}
								dot={<CustomizedDot />}
								isAnimationActive={false}
							/>
						</LineChart>
					</ResponsiveContainer>
				)}
			</div>

			{/* Buy / Sell Legend */}
			<div className="flex items-center gap-6 text-xs text-white/60">
				<span className="flex items-center gap-1.5">
					<span className="size-2.5 rounded-full bg-emerald-500" />
					Buy Checkpoint
				</span>
				<span className="flex items-center gap-1.5">
					<span className="size-2.5 rounded-full bg-rose-500" />
					Sell Checkpoint
				</span>
				<span className="flex items-center gap-1.5">
					<span className="h-0.5 w-4 bg-amber-500" />
					Stepped Balance Line
				</span>
			</div>

			{/* As-Of Date Lookup Tool */}
			<div
				data-testid="as-of-date-tool"
				className="rounded-xl border border-white/10 bg-white/[0.02] p-5 space-y-4"
			>
				<div className="flex flex-wrap items-center justify-between gap-4">
					<div>
						<h4 className="flex items-center gap-2 text-sm font-bold text-white">
							<Calendar className="size-4 text-amber-400" />
							As-Of Past Date & Ledger Lookup
						</h4>
						<p className="text-xs text-white/60">
							Inspect holdings exactly as they stood at any historical point in time.
						</p>
					</div>

					<div className="flex items-center gap-2">
						<Label htmlFor="as-of-date-picker" className="text-xs text-white/70">
							Select Date:
						</Label>
						<Input
							id="as-of-date-picker"
							type="date"
							data-testid="as-of-date-picker"
							value={asOfDate}
							onChange={e => setAsOfDate(e.target.value)}
							className="h-8 w-40 border-white/10 bg-[#06111f] text-xs text-white"
						/>
					</div>
				</div>

				{/* Approximation Note */}
				<div
					data-testid="as-of-approximation-note"
					className="flex items-start gap-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-xs text-amber-200/90"
				>
					<Info className="size-4 shrink-0 mt-0.5 text-amber-400" />
					<span>{asOfResult.approximationNote}</span>
				</div>

				{/* Holdings Table as of that date */}
				<div className="overflow-x-auto rounded-lg border border-white/10">
					<table
						data-testid="as-of-holdings-table"
						className="w-full text-left text-xs text-white"
					>
						<thead className="border-b border-white/10 bg-white/[0.02] font-semibold text-white/60">
							<tr>
								<th className="py-2.5 px-3">Key</th>
								<th className="py-2.5 px-3 text-right">Holdings as of Date</th>
								<th className="py-2.5 px-3 text-right">Checkpoint Ledger</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-white/5">
							{asOfResult.holdings.length === 0 ? (
								<tr>
									<td colSpan={3} className="py-4 text-center text-white/40">
										No recorded holdings prior to or as of this date.
									</td>
								</tr>
							) : (
								asOfResult.holdings.map(item => (
									<tr
										key={item.keyId}
										data-testid={`as-of-holding-row-${item.keyId}`}
										className="hover:bg-white/[0.02]"
									>
										<td className="py-2.5 px-3 font-semibold">{item.keyName}</td>
										<td
											data-testid={`as-of-balance-${item.keyId}`}
											className="py-2.5 px-3 text-right font-mono font-bold text-amber-300"
										>
											{item.balance}
										</td>
										<td className="py-2.5 px-3 text-right font-mono text-white/60">
											{item.asOfCheckpointLedger != null
												? `#${item.asOfCheckpointLedger.toLocaleString()}`
												: 'None (Pre-genesis)'}
										</td>
									</tr>
								))
							)}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	);
}

export default BalanceHistoryChart;
