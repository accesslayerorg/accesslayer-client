import { useCallback, useState } from 'react';
import { BarChart2, Clock, Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ReferralLinkPanel from '@/components/common/ReferralLinkPanel';
import TradeHistoryTable from '@/components/common/TradeHistoryTable';
import { ProfileTabPillGroup } from '@/components/common/ProfileTabPill';
import { useProfileStore } from '@/hooks/useProfileStore';
import { fetchAllTrades } from '@/services/tradeHistory.service';
import type { Trade } from '@/services/tradeHistory.service';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const TABS = [
	{ label: 'Holdings', value: 'holdings', icon: <BarChart2 /> },
	{ label: 'Trade History', value: 'trade-history', icon: <Clock /> },
];

// Mock wallet address – in a real app this would come from the wallet provider.
const DEMO_WALLET =
	'GDEMOWALLET0000000000000000000000000000000000000000000000001';

// For demo purposes, generate some mock keys. In a real app these would
// come from the backend (the user's keys / most traded key etc.).
const keys = [
	{ id: 'alpha', label: 'Alpha Key' },
	{ id: 'beta', label: 'Beta Key' },
	{ id: 'gamma', label: 'Gamma Key' },
];

function escapeCsvField(value: string | number): string {
	const str = String(value);
	if (str.includes(',') || str.includes('"') || str.includes('\n')) {
		return `"${str.replace(/"/g, '""')}"`;
	}
	return str;
}

function tradesToCsv(trades: Trade[]): string {
	const header = 'Date,Key Name,Type,Quantity,Price per Key,Total,Fee';
	const rows = trades.map(trade => {
		const date = new Date(trade.timestamp).toISOString();
		const total = (trade.quantity * trade.pricePerKey).toFixed(4);
		return [
			escapeCsvField(date),
			escapeCsvField(trade.keyName),
			escapeCsvField(trade.tradeType),
			trade.quantity,
			trade.pricePerKey.toFixed(4),
			total,
			trade.fee.toFixed(4),
		].join(',');
	});
	return [header, ...rows].join('\n');
}

function downloadCsv(csvContent: string, filename: string): void {
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
	const url = URL.createObjectURL(blob);
	const link = document.createElement('a');
	link.href = url;
	link.download = filename;
	link.style.display = 'none';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
	URL.revokeObjectURL(url);
}

export default function ProfilePage() {
	const profile = useProfileStore(state => state.profile);
	const [activeTab, setActiveTab] = useState('holdings');
	const [isExporting, setIsExporting] = useState(false);

	const handleExportCsv = useCallback(async () => {
		setIsExporting(true);
		try {
			const trades = await fetchAllTrades(DEMO_WALLET);
			const csv = tradesToCsv(trades);
			const truncated = DEMO_WALLET.slice(0, 6);
			const date = new Date().toISOString().split('T')[0];
			const filename = `trades-${truncated}-${date}.csv`;
			downloadCsv(csv, filename);
		} catch (error) {
			console.error('[csv-export]', error);
		} finally {
			setIsExporting(false);
		}
	}, []);
	useDocumentTitle('My Portfolio — AccessLayer');

	return (
		<main className="min-h-screen bg-[#06111f] px-6 py-16 text-white md:px-12">
			<div className="mx-auto max-w-7xl space-y-6">
				<div>
					<h1 className="text-2xl font-black">My Portfolio</h1>
					<p className="text-sm text-white/60">
						{profile?.firstName} {profile?.lastName}
					</p>
				</div>

				{/* Tab navigation */}
				<ProfileTabPillGroup
					tabs={TABS}
					activeTab={activeTab}
					onTabChange={setActiveTab}
					enableHashRouting
				/>

				{/* Holdings panel */}
				{activeTab === 'holdings' && (
					<section
						id="profile-panel-holdings"
						role="tabpanel"
						aria-labelledby="profile-tab-holdings"
						data-testid="portfolio-holdings-panel"
					>
						<ReferralLinkPanel initialKeyId={keys[0].id} keys={keys} />
					</section>
				)}

				{/* Trade history panel */}
				{activeTab === 'trade-history' && (
					<section
						id="profile-panel-trade-history"
						role="tabpanel"
						aria-labelledby="profile-tab-trade-history"
						data-testid="portfolio-trade-history-panel"
					>
						<div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6 md:p-8">
							<div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
								<div>
									<h2 className="font-grotesque text-2xl font-bold text-white">
										Trade History
									</h2>
									<p className="mt-1 text-sm text-white/65">
										A full audit trail of your past buys and sells
									</p>
								</div>
								<Button
									variant="outline"
									onClick={() => void handleExportCsv()}
									disabled={isExporting}
									data-testid="export-csv-button"
									className="shrink-0 rounded-xl border-white/15 bg-white/5 px-4 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white"
								>
									{isExporting ? (
										<>
											<Loader2
												className="mr-2 size-4 animate-spin"
												aria-hidden="true"
											/>
											Exporting…
										</>
									) : (
										<>
											<Download
												className="mr-2 size-4"
												aria-hidden="true"
											/>
											Export CSV
										</>
									)}
								</Button>
							</div>

							<TradeHistoryTable walletAddress={DEMO_WALLET} />
						</div>
					</section>
				)}
			</div>
		</main>
	);
}
