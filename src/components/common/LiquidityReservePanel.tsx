export interface BackstopHistoryEntry {
	id: string;
	amount: string | number;
	timestamp: string;
	reason?: string;
}

function formatReserveAmount(amount: string | number, token: string): string {
	const value = Number(amount);
	return Number.isFinite(value)
		? `${value.toLocaleString(undefined, { maximumFractionDigits: 7 })} ${token}`
		: `Unavailable ${token}`;
}

interface LiquidityReservePanelProps {
	balance: string | number;
	token?: string;
	history?: BackstopHistoryEntry[];
}

export default function LiquidityReservePanel({
	balance,
	token = 'XLM',
	history = [],
}: LiquidityReservePanelProps) {
	return (
		<section aria-labelledby="liquidity-reserve-title" className="rounded-xl border border-white/10 bg-white/5 p-5">
			<div className="flex items-start justify-between gap-4">
				<div>
					<h2 id="liquidity-reserve-title" className="text-lg font-semibold text-white">
						Liquidity reserve
					</h2>
					<p className="mt-1 text-sm text-white/60">Protocol balance available as a trading backstop.</p>
				</div>
				<strong data-testid="reserve-balance" className="text-xl text-emerald-300">
					{formatReserveAmount(balance, token)}
				</strong>
			</div>
			<h3 className="mt-6 text-sm font-medium text-white/80">Backstop history</h3>
			{history.length === 0 ? (
				<p className="mt-2 text-sm text-white/50">No backstop activity recorded.</p>
			) : (
				<ul className="mt-2 divide-y divide-white/10" aria-label="Backstop history">
					{history.map(entry => (
						<li key={entry.id} className="flex items-center justify-between gap-4 py-3 text-sm">
							<span className="text-white/70">{entry.reason ?? 'Reserve activity'}</span>
							<span className="text-right text-white">
								{formatReserveAmount(entry.amount, token)}
								<span className="ml-2 text-xs text-white/50">{entry.timestamp}</span>
							</span>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
