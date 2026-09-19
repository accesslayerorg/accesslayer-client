import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Copy, Check, Share2, Sparkles } from 'lucide-react';
import { formatPnLDisplay, formatPnLPercentage } from '@/utils/portfolioValue.utils';
import { truncateWallet } from '@/utils/wallet.utils';
import toast from 'react-hot-toast';

export interface TopHoldingItem {
	name: string;
	handle?: string;
	quantity: number;
	valueStroops: number;
}

export interface SharePortfolioModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	walletAddress: string;
	totalInvested: number;
	currentValue: number;
	unrealisedPnL: number;
	pnlPercentage: number;
	topHoldings: TopHoldingItem[];
}

export const SharePortfolioModal: React.FC<SharePortfolioModalProps> = ({
	open,
	onOpenChange,
	walletAddress,
	totalInvested,
	currentValue,
	unrealisedPnL,
	pnlPercentage,
	topHoldings,
}) => {
	const canvasRef = useRef<HTMLCanvasElement | null>(null);
	const [imageSrc, setImageSrc] = useState<string | null>(null);
	const [isCopied, setIsCopied] = useState(false);

	const renderCardToCanvas = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const width = 1200;
		const height = 675;
		canvas.width = width;
		canvas.height = height;

		// Background gradient
		const bgGrad = ctx.createLinearGradient(0, 0, width, height);
		bgGrad.addColorStop(0, '#090d16');
		bgGrad.addColorStop(0.5, '#0b1329');
		bgGrad.addColorStop(1, '#05070e');
		ctx.fillStyle = bgGrad;
		ctx.fillRect(0, 0, width, height);

		// Outer glowing border
		ctx.strokeStyle = 'rgba(59, 130, 246, 0.25)';
		ctx.lineWidth = 4;
		ctx.strokeRect(20, 20, width - 40, height - 40);

		// Decorative gradient blob in top right
		const glow = ctx.createRadialGradient(950, 150, 10, 950, 150, 350);
		glow.addColorStop(0, 'rgba(59, 130, 246, 0.15)');
		glow.addColorStop(1, 'rgba(0, 0, 0, 0)');
		ctx.fillStyle = glow;
		ctx.fillRect(0, 0, width, height);

		// Header: Brand & Logo
		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 38px Inter, system-ui, sans-serif';
		ctx.fillText('AccessLayer', 70, 90);

		ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
		ctx.font = '20px Inter, system-ui, sans-serif';
		ctx.fillText('PORTFOLIO PERFORMANCE', 70, 125);

		// Wallet badge
		const truncated = truncateWallet(walletAddress);
		ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
		ctx.beginPath();
		ctx.roundRect(width - 340, 60, 270, 50, 12);
		ctx.fill();

		ctx.fillStyle = '#94a3b8';
		ctx.font = '16px monospace';
		ctx.fillText(`WALLET: ${truncated}`, width - 320, 92);

		// Metric Cards
		const metrics = [
			{
				label: 'TOTAL INVESTED',
				value: formatPnLDisplay(totalInvested),
				color: '#ffffff',
			},
			{
				label: 'CURRENT VALUE',
				value: formatPnLDisplay(currentValue),
				color: '#ffffff',
			},
			{
				label: 'UNREALISED PnL',
				value: `${formatPnLDisplay(unrealisedPnL)} (${formatPnLPercentage(pnlPercentage)})`,
				color:
					unrealisedPnL > 0
						? '#34d399'
						: unrealisedPnL < 0
							? '#f87171'
							: '#ffffff',
			},
		];

		const cardWidth = 330;
		const cardHeight = 130;
		const cardY = 175;

		metrics.forEach((metric, idx) => {
			const cardX = 70 + idx * 370;

			ctx.fillStyle = 'rgba(255, 255, 255, 0.04)';
			ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.roundRect(cardX, cardY, cardWidth, cardHeight, 16);
			ctx.fill();
			ctx.stroke();

			ctx.fillStyle = '#94a3b8';
			ctx.font = '16px Inter, system-ui, sans-serif';
			ctx.fillText(metric.label, cardX + 24, cardY + 42);

			ctx.fillStyle = metric.color;
			ctx.font = 'bold 26px Inter, system-ui, sans-serif';
			ctx.fillText(metric.value, cardX + 24, cardY + 88);
		});

		// Top Holdings Section
		ctx.fillStyle = '#ffffff';
		ctx.font = 'bold 24px Inter, system-ui, sans-serif';
		ctx.fillText('Top Creator Holdings', 70, 365);

		const holdingsY = 390;
		if (topHoldings.length === 0) {
			ctx.fillStyle = '#64748b';
			ctx.font = '20px Inter, system-ui, sans-serif';
			ctx.fillText('No active key holdings', 70, holdingsY + 50);
		} else {
			topHoldings.slice(0, 3).forEach((holding, idx) => {
				const rowY = holdingsY + idx * 58;

				ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
				ctx.beginPath();
				ctx.roundRect(70, rowY, width - 140, 48, 10);
				ctx.fill();

				// Index & Name
				ctx.fillStyle = '#38bdf8';
				ctx.font = 'bold 18px Inter, system-ui, sans-serif';
				ctx.fillText(`#${idx + 1}`, 90, rowY + 31);

				ctx.fillStyle = '#f8fafc';
				ctx.font = 'bold 18px Inter, system-ui, sans-serif';
				const nameText = holding.name || holding.handle || 'Creator';
				ctx.fillText(nameText, 130, rowY + 31);

				// Quantity
				ctx.fillStyle = '#94a3b8';
				ctx.font = '16px Inter, system-ui, sans-serif';
				ctx.fillText(`${holding.quantity} keys held`, 550, rowY + 31);

				// Holding value
				ctx.fillStyle = '#ffffff';
				ctx.font = 'bold 18px Inter, system-ui, sans-serif';
				const valText = formatPnLDisplay(holding.valueStroops);
				ctx.fillText(valText, width - 260, rowY + 31);
			});
		}

		// Footer bar
		ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
		ctx.font = '16px Inter, system-ui, sans-serif';
		ctx.fillText('Decentralized Creator Key Markets on Stellar • accesslayer.xyz', 70, height - 40);

		// Convert to data URL for preview
		setImageSrc(canvas.toDataURL('image/png'));
	}, [walletAddress, totalInvested, currentValue, unrealisedPnL, pnlPercentage, topHoldings]);

	useEffect(() => {
		if (open) {
			// Delay slightly to ensure canvas ref is mounted
			const timer = setTimeout(renderCardToCanvas, 50);
			return () => clearTimeout(timer);
		} else {
			setIsCopied(false);
		}
	}, [open, renderCardToCanvas]);

	const handleDownload = () => {
		if (!imageSrc) return;
		const a = document.createElement('a');
		a.href = imageSrc;
		a.download = `accesslayer-portfolio-${Date.now()}.png`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		toast.success('Portfolio image downloaded!');
	};

	const handleCopy = async () => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		try {
			canvas.toBlob(async blob => {
				if (!blob) {
					toast.error('Failed to generate image blob');
					return;
				}
				await navigator.clipboard.write([
					new ClipboardItem({ 'image/png': blob }),
				]);
				setIsCopied(true);
				toast.success('Image copied to clipboard!');
				setTimeout(() => setIsCopied(false), 3000);
			}, 'image/png');
		} catch {
			toast.error('Direct clipboard image copy not supported in this browser');
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-w-2xl bg-slate-950 border-white/10 text-white p-6">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2 text-xl font-bold font-grotesque">
						<Share2 className="w-5 h-5 text-sky-400" />
						Share Portfolio Performance
					</DialogTitle>
					<DialogDescription className="text-white/60 text-sm">
						Client-side generated social card preview. No data is sent to external services.
					</DialogDescription>
				</DialogHeader>

				{/* Hidden high-res canvas for rendering */}
				<canvas ref={canvasRef} style={{ display: 'none' }} />

				{/* Preview Image */}
				<div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-slate-900/50 p-2 shadow-2xl">
					{imageSrc ? (
						<img
							src={imageSrc}
							alt="Portfolio Performance Card Preview"
							className="w-full h-auto rounded-lg"
							data-testid="portfolio-card-preview"
						/>
					) : (
						<div className="flex items-center justify-center h-52 text-white/40">
							<Sparkles className="w-6 h-6 animate-pulse mr-2" />
							Generating snapshot...
						</div>
					)}
				</div>

				{/* Actions */}
				<div className="mt-6 flex flex-col sm:flex-row items-center justify-end gap-3">
					<Button
						variant="outline"
						data-testid="share-modal-close-button"
						onClick={() => onOpenChange(false)}
						className="w-full sm:w-auto border-white/10 text-white hover:bg-white/10"
					>
						Close
					</Button>
					<Button
						onClick={handleCopy}
						disabled={!imageSrc}
						data-testid="copy-image-button"
						variant="secondary"
						className="w-full sm:w-auto bg-white/10 text-white hover:bg-white/20"
					>
						{isCopied ? (
							<>
								<Check className="w-4 h-4 mr-2 text-emerald-400" />
								Copied!
							</>
						) : (
							<>
								<Copy className="w-4 h-4 mr-2" />
								Copy Image
							</>
						)}
					</Button>
					<Button
						onClick={handleDownload}
						disabled={!imageSrc}
						data-testid="download-png-button"
						className="w-full sm:w-auto bg-sky-500 hover:bg-sky-600 text-white font-semibold"
					>
						<Download className="w-4 h-4 mr-2" />
						Download PNG
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default SharePortfolioModal;
