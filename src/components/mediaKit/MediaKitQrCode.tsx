import { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { downloadQrPng } from '@/utils/qrDownload.utils';

/** QR code linking to the key page (#1475). */
export default function MediaKitQrCode({ url, handle }: { url: string; handle: string }) {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	return (
		<section aria-labelledby="media-kit-qr-heading" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
			<h2 id="media-kit-qr-heading" className="font-grotesque text-lg font-black tracking-tight">
				QR code
			</h2>
			<p className="mt-1 break-all text-xs text-white/55">
				Opens <a className="text-amber-300 hover:underline" href={url} data-testid="media-kit-qr-url">{url}</a>
			</p>
			<div className="mt-3 inline-block rounded-xl bg-white p-3">
				<QRCodeCanvas ref={canvasRef} value={url} size={160} level="M" data-testid="media-kit-qr" aria-label={`QR code for ${url}`} role="img" />
			</div>
			<div>
				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-3 gap-2 border-white/10 bg-white/[0.03] text-white"
					onClick={() => downloadQrPng(canvasRef, `${handle}-qr`)}
				>
					<Download className="size-4" aria-hidden="true" /> Download QR
				</Button>
			</div>
		</section>
	);
}
