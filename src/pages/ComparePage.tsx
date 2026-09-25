import { useSearchParams, Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';

interface KeyStats {
	id: string;
	name: string;
	price: string;
	volume: string;
	holders: string;
	supply: string;
	change24h: string;
}

const DEMO_KEYS: KeyStats[] = [
	{
		id: '1',
		name: 'Creator Alpha',
		price: '1.25 XLM',
		volume: '5,000 XLM',
		holders: '150',
		supply: '10,000',
		change24h: '+5.2%',
	},
	{
		id: '2',
		name: 'Creator Beta',
		price: '0.85 XLM',
		volume: '3,200 XLM',
		holders: '89',
		supply: '8,000',
		change24h: '-2.1%',
	},
	{
		id: '3',
		name: 'Creator Gamma',
		price: '2.10 XLM',
		volume: '8,500 XLM',
		holders: '312',
		supply: '15,000',
		change24h: '+12.8%',
	},
];

export default function ComparePage() {
	const [searchParams] = useSearchParams();
	const keyIds = searchParams.get('keys')?.split(',') ?? [];

	const keysToShow = keyIds
		.map(id => DEMO_KEYS.find(k => k.id === id))
		.filter((k): k is KeyStats => k != null);

	if (keysToShow.length === 0) {
		return (
			<div className="min-h-screen bg-black text-white">
				<div className="mx-auto max-w-5xl px-6 py-12">
					<Link
						to="/"
						className="mb-8 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white/90"
					>
						<ArrowLeft className="size-4" />
						Back to Marketplace
					</Link>
					<h1 className="font-grotesque text-3xl font-black">Compare Keys</h1>
					<p className="mt-4 text-white/60">
						No keys selected for comparison. Go back to the marketplace and add
						keys to compare.
					</p>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black text-white">
			<div className="mx-auto max-w-5xl px-6 py-12">
				<Link
					to="/"
					className="mb-8 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white/90"
				>
					<ArrowLeft className="size-4" />
					Back to Marketplace
				</Link>
				<h1 className="font-grotesque text-3xl font-black">Compare Keys</h1>
				<p className="mt-2 text-white/60">
					Comparing {keysToShow.length} creator {keysToShow.length === 1 ? 'key' : 'keys'}
				</p>

				<div className="mt-8 overflow-x-auto">
					<table className="w-full border-collapse">
						<thead>
							<tr>
								<th className="border-b border-white/10 py-4 pr-8 text-left text-sm font-medium text-white/50">
									Stat
								</th>
								{keysToShow.map(key => (
									<th
										key={key.id}
										className="border-b border-white/10 py-4 px-4 text-left text-sm font-medium text-white"
									>
										{key.name}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							<tr className="border-b border-white/5">
								<td className="py-4 pr-8 text-sm text-white/50">Price</td>
								{keysToShow.map(key => (
									<td key={key.id} className="py-4 px-4 text-sm font-medium">
										{key.price}
									</td>
								))}
							</tr>
							<tr className="border-b border-white/5">
								<td className="py-4 pr-8 text-sm text-white/50">Volume</td>
								{keysToShow.map(key => (
									<td key={key.id} className="py-4 px-4 text-sm">
										{key.volume}
									</td>
								))}
							</tr>
							<tr className="border-b border-white/5">
								<td className="py-4 pr-8 text-sm text-white/50">Holders</td>
								{keysToShow.map(key => (
									<td key={key.id} className="py-4 px-4 text-sm">
										{key.holders}
									</td>
								))}
							</tr>
							<tr className="border-b border-white/5">
								<td className="py-4 pr-8 text-sm text-white/50">Supply</td>
								{keysToShow.map(key => (
									<td key={key.id} className="py-4 px-4 text-sm">
										{key.supply}
									</td>
								))}
							</tr>
							<tr>
								<td className="py-4 pr-8 text-sm text-white/50">24h Change</td>
								{keysToShow.map(key => (
									<td
										key={key.id}
										className={`py-4 px-4 text-sm font-medium ${
											key.change24h.startsWith('+')
												? 'text-emerald-400'
												: key.change24h.startsWith('-')
													? 'text-red-400'
													: ''
										}`}
									>
										{key.change24h}
									</td>
								))}
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
