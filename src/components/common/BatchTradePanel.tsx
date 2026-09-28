import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBatchTradeMutation, useWalletHoldings, type BatchTradeOrder } from '@/hooks/useWallet';
import { useConnectedWallet } from '@/hooks/useWatchlist';
import { courseService, type Course } from '@/services/course.service';
import { calculateFeeBreakdown } from '@/utils/pricePreview.utils';
import { formatXlm } from '@/hooks/useFormatXlm';

type DraftOrder = { id: number; creatorId: string; side: 'buy' | 'sell'; quantity: number; slippageBps: number };

export default function BatchTradePanel({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
	const wallet = useConnectedWallet(state => state.walletKey);
	const holdingsQuery = useWalletHoldings(wallet === 'guest' ? '' : wallet);
	const coursesQuery = useQuery({ queryKey: ['batch-trade-courses'], queryFn: () => courseService.getCourses(), enabled: open });
	const mutation = useBatchTradeMutation(wallet);
	const [orders, setOrders] = useState<DraftOrder[]>([]);
	const [creatorId, setCreatorId] = useState('');
	const [side, setSide] = useState<'buy' | 'sell'>('buy');
	const [quantity, setQuantity] = useState(1);
	const [slippageBps, setSlippageBps] = useState(500);
	const [results, setResults] = useState<Awaited<ReturnType<typeof mutation.mutateAsync>>['results'] | null>(null);
	const courses = coursesQuery.data ?? [];
	const holdings = holdingsQuery.data ?? [];
	const getCourse = (id: string) => courses.find(course => course.id === id);
	const orderCost = (order: DraftOrder) => {
		const course = getCourse(order.creatorId);
		const price = Number(order.side === 'buy' ? course?.priceStroops : course?.priceStroops) || 0;
		return order.side === 'buy' ? calculateFeeBreakdown({ quantity: order.quantity, keyPriceStroops: price, currentSupply: course?.creatorShareSupply ?? 0, protocolFeeBps: course?.protocolFeeBps ?? 500, creatorFeeBps: course?.creatorFeeBps ?? 500 }).totalCostStroops : 0;
	};
	const totalCost = useMemo(() => orders.reduce((sum, order) => sum + orderCost(order), 0), [orders, courses]);
	const totalFees = useMemo(() => orders.reduce((sum, order) => {
		if (order.side !== 'buy') return sum;
		const course = getCourse(order.creatorId);
		const gross = (Number(course?.priceStroops) || 0) * order.quantity;
		return sum + Math.round(gross * ((course?.protocolFeeBps ?? 500) + (course?.creatorFeeBps ?? 500)) / 10_000);
	}, 0), [orders, courses]);
	const sellExceeded = orders.some(order => order.side === 'sell' && (holdings.find(item => item.creatorId === order.creatorId)?.quantity ?? 0) < order.quantity);
	const addOrder = () => {
		if (!creatorId || quantity < 1 || !Number.isFinite(quantity)) return;
		const held = holdings.find(item => item.creatorId === creatorId)?.quantity ?? 0;
		if (side === 'sell' && quantity > held) return;
		setOrders(current => [...current, { id: Date.now(), creatorId, side, quantity, slippageBps }]);
		setResults(null);
	};
	const execute = async () => {
		if (!orders.length || sellExceeded || mutation.isPending) return;
	const payload: BatchTradeOrder[] = orders.map(order => {
			const course = getCourse(order.creatorId);
			const priceStroops = Number(course?.priceStroops) || 0;
			return { creatorId: order.creatorId, side: order.side, quantity: order.quantity, slippageBps: order.slippageBps, priceStroops };
		});
		const response = await mutation.mutateAsync({ orders: payload });
		setResults(response.results);
	};
	const close = (next: boolean) => { onOpenChange(next); if (!next) { setResults(null); setOrders([]); } };

	return <Dialog open={open} onOpenChange={close}>
		<DialogContent className="max-w-3xl">
			<DialogHeader><DialogTitle>Batch Trade</DialogTitle><DialogDescription>Queue buys and sells across creator keys, then submit them together.</DialogDescription></DialogHeader>
			{results ? <div className="space-y-3" role="status">
				<h3 className="font-semibold">Batch results</h3>
				{results.map((result, index) => <div key={`${result.creatorId}-${index}`} className="rounded-xl border border-white/10 p-3">
					<div className="flex justify-between"><span>{getCourse(result.creatorId)?.title ?? result.creatorId} · {result.side} {result.quantity}</span><span className="text-emerald-400">{result.success ? 'Success' : 'Failed'}</span></div>
					<div className="mt-1 break-all font-mono text-xs text-white/50">{result.success ? result.transactionHash : result.error}</div>
				</div>)}
			</div> : <div className="space-y-4">
				<div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto_auto]">
					<select aria-label="Creator key" value={creatorId} onChange={event => setCreatorId(event.target.value)} className="rounded-xl bg-slate-900 px-3 py-2 text-white">
						<option value="">Choose creator key</option>{courses.map((course: Course) => <option key={course.id} value={course.id}>{course.title}</option>)}
					</select>
					<select aria-label="Trade side" value={side} onChange={event => setSide(event.target.value as 'buy' | 'sell')} className="rounded-xl bg-slate-900 px-3 py-2 text-white"><option value="buy">Buy</option><option value="sell">Sell</option></select>
					<input aria-label="Order amount" type="number" min={1} value={quantity} onChange={event => setQuantity(Number(event.target.value))} className="w-24 rounded-xl bg-white/[0.04] px-3 py-2 text-white" />
					<select aria-label="Slippage tolerance" value={slippageBps} onChange={event => setSlippageBps(Number(event.target.value))} className="rounded-xl bg-slate-900 px-3 py-2 text-white"><option value={100}>1%</option><option value={300}>3%</option><option value={500}>5%</option><option value={1000}>10%</option></select>
					<Button onClick={addOrder} disabled={!creatorId || quantity < 1}>Add order</Button>
				</div>
				{coursesQuery.isLoading && <p className="text-sm text-white/50">Loading creator keys…</p>}
				<div className="max-h-64 space-y-2 overflow-y-auto">{orders.map(order => {
					const course = getCourse(order.creatorId);
					return <div key={order.id} className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 rounded-xl border border-white/10 p-3 text-sm">
						<span className="truncate">{course?.title ?? order.creatorId} <span className="text-white/50">{order.side} · {order.quantity} keys · {order.slippageBps / 100}% slippage</span></span>
						<span>{order.side === 'buy' ? `${formatXlm(orderCost(order))} XLM` : '—'}</span>
						{order.side === 'sell' && <span className="text-xs text-white/50">Available: {holdings.find(item => item.creatorId === order.creatorId)?.quantity ?? 0}</span>}
						<Button variant="ghost" onClick={() => setOrders(current => current.filter(item => item.id !== order.id))}>Remove</Button>
					</div>;
				})}</div>
				{sellExceeded && <p role="alert" className="text-sm text-red-400">A sell order exceeds the available key balance.</p>}
				<div className="flex justify-between border-t border-white/10 pt-3 text-sm"><span>Estimated fees</span><span>{formatXlm(totalFees)} XLM</span></div>
				<div className="flex justify-between font-semibold"><span>Estimated buy cost</span><span>{formatXlm(totalCost)} XLM</span></div>
			</div>}
			<DialogFooter><div className="flex gap-2"><Button variant="ghost" onClick={() => close(false)}>Close</Button>{results ? <Button onClick={() => setResults(null)}>Edit orders</Button> : <Button onClick={() => void execute()} disabled={!orders.length || sellExceeded || mutation.isPending}>{mutation.isPending ? 'Executing batch…' : 'Execute batch'}</Button>}</div></DialogFooter>
		</DialogContent>
	</Dialog>;
}
