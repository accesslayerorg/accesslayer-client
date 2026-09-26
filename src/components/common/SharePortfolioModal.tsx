import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Download, Copy, Check, Loader2, AlertCircle, Share2 } from 'lucide-react';
import toast from 'react-hot-toast';
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogDescription,
	DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { PortfolioPerformanceCard } from '@/components/common/PortfolioPerformanceCard';
import { captureElementToPng } from '@/utils/imageCapture.utils';
import type { PnLSummary, HeldKeyPosition } from '@/utils/portfolioValue.utils';
import type { Course } from '@/services/course.service';

export interface SharePortfolioModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	pnlSummary: PnLSummary;
	walletAddress: string;
	heldPositions: HeldKeyPosition[];
	creators: Course[];
}

export const SharePortfolioModal: React.FC<SharePortfolioModalProps> = ({
	open,
	onOpenChange,
	pnlSummary,
	walletAddress,
	heldPositions,
	creators,
}) => {
	const [isGenerating, setIsGenerating] = useState(false);
	const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
	const [imageBlob, setImageBlob] = useState<Blob | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [copied, setCopied] = useState(false);

	const cardRef = useRef<HTMLDivElement | null>(null);

	const generateImage = useCallback(async () => {
		if (!cardRef.current) return;
		setIsGenerating(true);
		setError(null);

		try {
			// Allow DOM to settle before snapshot
			await new Promise(resolve => setTimeout(resolve, 50));
			if (!cardRef.current) return;

			const result = await captureElementToPng(cardRef.current);
			setImageDataUrl(result.dataUrl);
			setImageBlob(result.blob);
		} catch (err) {
			console.error('Failed to generate portfolio performance image:', err);
			setError(
				err instanceof Error
					? err.message
					: 'An unexpected error occurred while generating the image.'
			);
		} finally {
			setIsGenerating(false);
		}
	}, []);

	useEffect(() => {
		if (open) {
			setCopied(false);
			generateImage();
		} else {
			setImageDataUrl(null);
			setImageBlob(null);
			setError(null);
		}
	}, [open, generateImage]);

	const handleDownload = () => {
		if (!imageDataUrl) return;

		try {
			const link = document.createElement('a');
			link.download = `accesslayer-portfolio-performance.png`;
			link.href = imageDataUrl;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			toast.success('Portfolio card downloaded!');
		} catch (err) {
			console.error('Failed to trigger download:', err);
			toast.error('Failed to download image.');
		}
	};

	const handleCopyImage = async () => {
		if (!imageBlob) {
			toast.error('Image is not ready yet');
			return;
		}

		try {
			if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
				const item = new ClipboardItem({ 'image/png': imageBlob });
				await navigator.clipboard.write([item]);
				setCopied(true);
				toast.success('Image copied to clipboard!');
				setTimeout(() => setCopied(false), 2500);
			} else {
				// Fallback if clipboard.write(image) is not supported
				toast.error('Clipboard image copying is not supported on this browser.');
			}
		} catch (err) {
			console.error('Failed to copy image to clipboard:', err);
			toast.error('Failed to copy image to clipboard');
		}
	};

	return (
		<>
			{/* Off-screen rendered card for html2canvas capture */}
			<div
				aria-hidden="true"
				style={{
					position: 'fixed',
					left: '-9999px',
					top: '-9999px',
					zIndex: -1,
					opacity: 1,
					pointerEvents: 'none',
				}}
			>
				<div ref={cardRef}>
					<PortfolioPerformanceCard
						pnlSummary={pnlSummary}
						walletAddress={walletAddress}
						heldPositions={heldPositions}
						creators={creators}
					/>
				</div>
			</div>

			<Dialog open={open} onOpenChange={onOpenChange}>
				<DialogContent
					data-testid="share-portfolio-modal"
					className="sm:max-w-xl max-h-[90vh] overflow-y-auto border-white/10 bg-[#070e1b] text-white p-6"
				>
					<DialogHeader>
						<div className="flex items-center gap-2">
							<div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400">
								<Share2 className="size-4" />
							</div>
							<div>
								<DialogTitle className="text-xl font-bold font-grotesque">
									Share Portfolio Performance
								</DialogTitle>
								<DialogDescription className="text-xs text-white/60">
									Download or copy a styled summary card of your portfolio to share on social media.
								</DialogDescription>
							</div>
						</div>
					</DialogHeader>

					{/* Modal Body / Image Preview */}
					<div className="my-4 flex flex-col items-center justify-center min-h-[260px] rounded-xl border border-white/10 bg-slate-950/50 p-4">
						{isGenerating ? (
							<div className="flex flex-col items-center gap-3 py-12 text-center text-white/60">
								<Loader2 className="size-8 animate-spin text-amber-400" />
								<p className="text-sm font-medium">Generating performance card…</p>
								<p className="text-xs text-white/40">Rendered securely in your browser</p>
							</div>
						) : error ? (
							<div className="flex flex-col items-center gap-3 py-8 text-center text-red-400">
								<AlertCircle className="size-8" />
								<p className="text-sm font-medium">Generation failed</p>
								<p className="max-w-xs text-xs text-white/50">{error}</p>
								<Button
									variant="outline"
									size="sm"
									onClick={generateImage}
									className="mt-2 text-xs text-white border-white/20 hover:bg-white/10"
								>
									Try Again
								</Button>
							</div>
						) : imageDataUrl ? (
							<div className="w-full flex justify-center">
								<img
									src={imageDataUrl}
									alt="Portfolio Performance Preview"
									data-testid="portfolio-card-preview"
									className="w-full max-w-[500px] rounded-xl border border-white/15 shadow-2xl object-contain"
								/>
							</div>
						) : null}
					</div>

					<DialogFooter className="flex flex-col-reverse sm:flex-row gap-2.5 sm:justify-end pt-2 border-t border-white/10">
						<Button
							type="button"
							variant="outline"
							onClick={() => onOpenChange(false)}
							className="border-white/15 bg-white/5 text-white hover:bg-white/10 text-xs"
						>
							Close
						</Button>

						<Button
							type="button"
							data-testid="copy-image-button"
							onClick={handleCopyImage}
							disabled={isGenerating || !imageBlob}
							className="inline-flex items-center gap-2 border border-white/15 bg-white/10 text-white hover:bg-white/15 text-xs font-semibold"
						>
							{copied ? (
								<>
									<Check className="size-3.5 text-emerald-400" />
									<span>Copied!</span>
								</>
							) : (
								<>
									<Copy className="size-3.5" />
									<span>Copy Image</span>
								</>
							)}
						</Button>

						<Button
							type="button"
							data-testid="download-png-button"
							onClick={handleDownload}
							disabled={isGenerating || !imageDataUrl}
							className="inline-flex items-center gap-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20"
						>
							<Download className="size-3.5" />
							<span>Download PNG</span>
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</>
	);
};

export default SharePortfolioModal;
