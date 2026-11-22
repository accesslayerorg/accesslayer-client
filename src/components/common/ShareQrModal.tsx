import { useRef, useState } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Check, Copy, Download, QrCode } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import { downloadQrPng } from '@/utils/qrDownload.utils';
import showToast from '@/utils/toast.util';

export interface ShareQrModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	url: string;
	handle: string;
}

export default function ShareQrModal({
	open,
	onOpenChange,
	url,
	handle,
}: ShareQrModalProps) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [copied, setCopied] = useState(false);

	const handleCopy = async () => {
		try {
			await copyTextToClipboard(url);
			setCopied(true);
			showToast.success('Link copied to clipboard!');
			window.setTimeout(() => setCopied(false), 2500);
		} catch {
			showToast.error('Could not copy the link.');
		}
	};

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				data-testid="share-qr-modal"
				className="border-white/10 bg-[#071322] text-white sm:max-w-md"
			>
				<DialogHeader className="text-left">
					<div className="flex items-center gap-2">
						<div className="flex size-8 items-center justify-center rounded-lg bg-amber-400/10 text-amber-400">
							<QrCode className="size-4" />
						</div>
						<DialogTitle className="font-grotesque text-xl font-black">
							QR code
						</DialogTitle>
					</div>
					<DialogDescription className="text-xs text-white/60">
						Scan to open this creator profile.
					</DialogDescription>
				</DialogHeader>

				<div className="flex flex-col items-center gap-4">
					<div className="rounded-2xl bg-white p-4">
						<QRCodeCanvas
							ref={canvasRef}
							value={url}
							size={256}
							level="M"
							marginSize={2}
							data-testid="share-qr-code"
						/>
					</div>
					<p className="font-jakarta text-sm font-semibold text-white/80">
						@{handle}
					</p>
					<div className="flex w-full gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={handleCopy}
							className="flex-1 gap-2 rounded-xl border-white/15 bg-white/[0.05] text-white"
						>
							{copied ? (
								<Check className="size-4 text-emerald-400" />
							) : (
								<Copy className="size-4" />
							)}
							<span>{copied ? 'Copied!' : 'Copy Link'}</span>
						</Button>
						<Button
							type="button"
							onClick={() => downloadQrPng(canvasRef, handle)}
							className="flex-1 gap-2 rounded-xl bg-amber-400 text-slate-950 hover:bg-amber-300"
						>
							<Download className="size-4" />
							Download PNG
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
