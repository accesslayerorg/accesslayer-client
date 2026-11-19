import { useEffect, useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import EmptyState from '@/components/common/EmptyState';
import Skeleton from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useAllTradeHistory } from '@/hooks/useAllTradeHistory';
import { downloadCsv } from '@/utils/transactionHistory.utils';
import {
	calculateRealizedGains,
	exportGainsCsv,
	type RealizedGain,
} from '@/utils/portfolio';

const currentYear = new Date().getUTCFullYear();

function formatXlm(value: number): string {
	return `${value.toFixed(2)} XLM`;
}

export default function GainsReport({ walletAddress }: { walletAddress: string }) {
	const { data: trades, isLoading, isError } = useAllTradeHistory(walletAddress);
	const gains = useMemo(() => calculateRealizedGains(trades ?? []), [trades]);
	const years = useMemo(
		() => [...new Set(gains.map(row => new Date(row.timestamp).getUTCFullYear()))].sort((a, b) => b - a),
		[gains]
	);
	const [year, setYear] = useState(currentYear);

	useEffect(() => {
		if (years.length > 0 && !years.includes(year)) setYear(years[0]);
	}, [year, years]);

	const rows = useMemo(
		() => gains.filter(row => new Date(row.timestamp).getUTCFullYear() === year),
		[gains, year]
	);
	const totals = useMemo(
		() => rows.reduce(
			(sum, row) => ({
				proceeds: sum.proceeds + row.proceeds,
				costBasis: sum.costBasis + row.costBasis,
				gain: sum.gain + row.gain,
			}),
			{ proceeds: 0, costBasis: 0, gain: 0 }
		),
		[rows]
	);

	if (isLoading) return <Skeleton className="h-48 w-full" data-testid="gains-report-loading" />;
	if (isError) {
		return <EmptyState title="Couldn't load realized gains" description="There was a problem fetching your trades." data-testid="gains-report-error" />;
	}

	return (
		<section className="space-y-4" data-testid="gains-report" aria-labelledby="gains-report-title">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<h2 id="gains-report-title" className="text-lg font-bold">Realized gains</h2>
					<p className="text-sm text-white/50">Average-cost accounting for completed sells.</p>
				</div>
				<div className="flex items-center gap-2">
					<label htmlFor="gains-year" className="text-sm text-white/60">Year</label>
					<select id="gains-year" value={year} onChange={event => setYear(Number(event.target.value))} className="rounded-lg border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-white" data-testid="gains-year-filter">
						{(years.length > 0 ? years : [currentYear]).map(value => <option key={value} value={value}>{value}</option>)}
					</select>
					<Button type="button" variant="outline" size="sm" disabled={rows.length === 0} onClick={() => downloadCsv(`realized-gains-${year}.csv`, exportGainsCsv(rows))} data-testid="gains-export">
						<Download className="size-4" aria-hidden="true" /> Export CSV
					</Button>
				</div>
			</div>

			{rows.length === 0 ? (
				<EmptyState title="No sells this year" description={`No realized gains are available for ${year}.`} data-testid="gains-report-empty" />
			) : (
				<div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
					<table className="w-full min-w-[42rem] text-left text-sm" data-testid="gains-report-table">
						<thead className="border-b border-white/10 text-[0.65rem] uppercase tracking-[0.18em] text-white/40"><tr>{['Date', 'Key', 'Quantity', 'Proceeds', 'Cost basis', 'Gain'].map(label => <th key={label} className="px-4 py-3 font-bold">{label}</th>)}</tr></thead>
						<tbody>{rows.map(row => <GainRow key={row.id} row={row} />)}</tbody>
						<tfoot className="border-t border-white/10"><tr data-testid="gains-total-row"><th colSpan={3} className="px-4 py-3 text-left">Total</th><td className="px-4 py-3 font-mono">{formatXlm(totals.proceeds)}</td><td className="px-4 py-3 font-mono">{formatXlm(totals.costBasis)}</td><td className={`px-4 py-3 font-mono font-bold ${totals.gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{totals.gain >= 0 ? '+' : ''}{formatXlm(totals.gain)}</td></tr></tfoot>
					</table>
				</div>
			)}
		</section>
	);
}

function GainRow({ row }: { row: RealizedGain }) {
	return <tr data-testid="gains-report-row" className="border-b border-white/5"><td className="px-4 py-3">{new Date(row.timestamp).toLocaleDateString('en-US', { timeZone: 'UTC' })}</td><td className="px-4 py-3 font-semibold">{row.keyName}</td><td className="px-4 py-3 font-mono">{row.quantity}</td><td className="px-4 py-3 font-mono">{formatXlm(row.proceeds)}</td><td className="px-4 py-3 font-mono">{formatXlm(row.costBasis)}</td><td className={`px-4 py-3 font-mono font-semibold ${row.gain >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{row.gain >= 0 ? '+' : ''}{formatXlm(row.gain)}</td></tr>;
}
