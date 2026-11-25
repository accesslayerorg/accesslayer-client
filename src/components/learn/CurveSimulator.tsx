import { useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import {
	computeBondingCurvePriceXLM,
	type BondingCurveParams,
} from '@/utils/bondingCurve.utils';
import {
	calculateCurveQuote,
	compareBuyStrategies,
	type CurveTradeQuote,
} from '@/utils/curveCalculator.utils';
import { formatNumber } from '@/utils/numberFormat.utils';

export interface CurveSimulatorProps {
	params: BondingCurveParams;
	currentSupply: number;
	protocolFeeBps: number;
	creatorFeeBps: number;
	className?: string;
}

const POINT_COUNT = 41;
const CHART_WIDTH = 600;
const CHART_HEIGHT = 240;
const PADDING = 24;

function formatStroops(stroops: number): string {
	return `${formatNumber(stroops / 10_000_000, { maximumFractionDigits: 4 })} XLM`;
}

export default function CurveSimulator({
	params,
	currentSupply,
	protocolFeeBps,
	creatorFeeBps,
	className,
}: CurveSimulatorProps) {
	const [markerSupply, setMarkerSupply] = useState(currentSupply);
	const [side, setSide] = useState<'buy' | 'sell'>('buy');
	const [quantity, setQuantity] = useState(1);
	const [chunkCount, setChunkCount] = useState(1);
	const [dragging, setDragging] = useState(false);
	const svgRef = useRef<SVGSVGElement>(null);

	const maxSupply = useMemo(
		() => Math.max(100, Math.ceil((Math.max(currentSupply, markerSupply) + 10) / 10) * 10),
		[currentSupply, markerSupply]
	);

	const points = useMemo(
		() =>
			Array.from({ length: POINT_COUNT }, (_, index) => {
				const supply = (index / (POINT_COUNT - 1)) * maxSupply;
				return { supply, priceXLM: computeBondingCurvePriceXLM(supply, params) };
			}),
		[maxSupply, params]
	);

	const maxPrice = Math.max(...points.map(point => point.priceXLM), 0.0001);
	const toX = (supply: number) =>
		PADDING + (supply / maxSupply) * (CHART_WIDTH - PADDING * 2);
	const toY = (price: number) =>
		CHART_HEIGHT - PADDING - (price / maxPrice) * (CHART_HEIGHT - PADDING * 2);
	const markerPrice = computeBondingCurvePriceXLM(markerSupply, params);
	const polyline = points
		.map(point => `${toX(point.supply)},${toY(point.priceXLM)}`)
		.join(' ');

	const request = useMemo(
		() => ({
			quantity,
			currentSupply: markerSupply,
			params,
			protocolFeeBps,
			creatorFeeBps,
		}),
		[quantity, markerSupply, params, protocolFeeBps, creatorFeeBps]
	);
	const quote: CurveTradeQuote | null = calculateCurveQuote(side, request);
	const comparison = useMemo(
		() => compareBuyStrategies({ ...request, chunkCount }),
		[request, chunkCount]
	);

	const updateMarkerFromPointer = (clientX: number) => {
		const rect = svgRef.current?.getBoundingClientRect();
		if (!rect || rect.width === 0) return;
		const fraction = (clientX - rect.left) / rect.width;
		const raw =
			((fraction * CHART_WIDTH - PADDING) / (CHART_WIDTH - PADDING * 2)) *
			maxSupply;
		setMarkerSupply(Math.max(0, Math.min(maxSupply, Math.round(raw))));
	};

	return (
		<section
			aria-labelledby="curve-simulator-heading"
			data-testid="curve-simulator"
			className={cn(
				'rounded-2xl border border-white/10 bg-slate-900/60 p-5 backdrop-blur-md',
				className
			)}
		>
			<h2
				id="curve-simulator-heading"
				className="font-grotesque text-xl font-bold text-white"
			>
				Curve simulator
			</h2>

			<div className="mt-4 flex flex-wrap items-center gap-3">
				<label
					htmlFor="curve-marker-slider"
					className="font-jakarta text-xs font-bold text-white/70"
				>
					Supply marker
				</label>
				<input
					id="curve-marker-slider"
					type="range"
					min={0}
					max={maxSupply}
					value={Math.min(markerSupply, maxSupply)}
					onChange={event => setMarkerSupply(Number(event.target.value))}
					data-testid="curve-supply-slider"
					className="min-w-48 flex-1 accent-amber-400"
				/>
				<output
					data-testid="curve-live-price"
					className="font-mono text-sm font-bold text-amber-200"
				>
					{formatStroops(markerPrice * 10_000_000)}
				</output>
			</div>

			<svg
				ref={svgRef}
				viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
				role="img"
				aria-label="Bonding curve price by supply"
				data-testid="curve-chart"
				className="mt-3 w-full touch-none rounded-xl border border-white/10 bg-white/[0.02]"
				onPointerDown={event => {
					setDragging(true);
					event.currentTarget.setPointerCapture(event.pointerId);
					updateMarkerFromPointer(event.clientX);
				}}
				onPointerMove={event => {
					if (dragging) updateMarkerFromPointer(event.clientX);
				}}
				onPointerUp={() => setDragging(false)}
				onPointerCancel={() => setDragging(false)}
			>
				<polyline
					points={polyline}
					fill="none"
					stroke="#fbbf24"
					strokeWidth={3}
					data-testid="curve-price-line"
				/>
				<line
					x1={toX(markerSupply)}
					x2={toX(markerSupply)}
					y1={PADDING}
					y2={CHART_HEIGHT - PADDING}
					stroke="#34d399"
					strokeDasharray="4 4"
					data-testid="curve-marker-line"
				/>
				<circle
					cx={toX(markerSupply)}
					cy={toY(markerPrice)}
					r={7}
					fill="#34d399"
					data-testid="curve-marker"
				/>
			</svg>

			<table className="mt-3 w-full font-jakarta text-xs text-white/70">
				<caption className="sr-only">
					Text alternative for bonding curve values at the selected supply
				</caption>
				<thead>
					<tr className="text-white/40">
						<th scope="col" className="text-left">Supply</th>
						<th scope="col" className="text-left">Price</th>
					</tr>
				</thead>
				<tbody>
					<tr data-testid="curve-marker-values">
						<td>{formatNumber(markerSupply)}</td>
						<td>{formatStroops(markerPrice * 10_000_000)}</td>
					</tr>
				</tbody>
			</table>

			<div className="mt-6 grid gap-5 md:grid-cols-2">
				<div className="space-y-3">
					<div className="flex gap-2" role="group" aria-label="Trade side">
						{(['buy', 'sell'] as const).map(value => (
							<button
								key={value}
								type="button"
								onClick={() => setSide(value)}
								aria-pressed={side === value}
								data-testid={`curve-side-${value}`}
								className={cn(
									'rounded-full border px-4 py-1.5 font-jakarta text-xs font-bold capitalize',
									side === value
										? 'border-amber-400/40 bg-amber-500/15 text-amber-200'
										: 'border-white/15 text-white/60'
								)}
							>
								{value}
							</button>
						))}
					</div>
					<label
						htmlFor="curve-quantity"
						className="block font-jakarta text-xs font-bold text-white/70"
					>
						Quantity
					</label>
					<input
						id="curve-quantity"
						type="number"
						min={1}
						value={quantity}
						onChange={event => setQuantity(Math.max(1, Number(event.target.value)))}
						data-testid="curve-quantity"
						className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-jakarta text-sm text-white"
					/>
					{quote && (
						<dl
							data-testid="curve-quote"
							className="grid grid-cols-2 gap-2 font-jakarta text-xs text-white/60"
						>
							<dt>Total {side === 'buy' ? 'cost' : 'payout'}</dt>
							<dd data-testid="curve-quote-total" className="text-right font-bold text-white">
								{formatStroops(quote.totalStroops)}
							</dd>
							<dt>Average price</dt>
							<dd className="text-right">{formatStroops(quote.averagePriceStroops)}</dd>
							<dt>Fees</dt>
							<dd className="text-right">
								{formatStroops(quote.protocolFeeStroops + quote.creatorFeeStroops)}
							</dd>
							<dt>Price impact</dt>
							<dd data-testid="curve-quote-impact" className="text-right">
								{quote.priceImpactPercent.toFixed(2)}%
							</dd>
						</dl>
					)}
				</div>

				<div className="space-y-3">
					<label
						htmlFor="curve-chunk-count"
						className="block font-jakarta text-xs font-bold text-white/70"
					>
						Split the buy into
					</label>
					<input
						id="curve-chunk-count"
						type="number"
						min={1}
						max={20}
						value={chunkCount}
						onChange={event => setChunkCount(Math.max(1, Number(event.target.value)))}
						data-testid="curve-chunk-count"
						className="w-full rounded-lg border border-white/15 bg-white/5 px-3 py-2 font-jakarta text-sm text-white"
					/>
					{comparison && (
						<p
							data-testid="curve-split-comparison"
							className="rounded-lg border border-white/10 bg-white/[0.03] p-3 font-jakarta text-xs text-white/70"
						>
							One trade costs{' '}
							<strong className="text-white">
								{formatStroops(comparison.lumpSumCostStroops)}
							</strong>
							. {comparison.chunkCount} smaller trades cost{' '}
							<strong className="text-white">
								{formatStroops(comparison.splitCostStroops)}
							</strong>
							. Difference: {formatStroops(Math.abs(comparison.savingsStroops))}
							{comparison.savingsStroops >= 0
								? ' lower cost all at once.'
								: ' lower cost split.'}
						</p>
					)}
				</div>
			</div>
		</section>
	);
}
