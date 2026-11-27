import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import showToast from '@/utils/toast.util';
import {
	MEDIA_KIT_ASSETS,
	assetFilename,
	downloadBlob,
	renderMediaKitAsset,
	type MediaKitAssetData,
} from '@/utils/mediaKitAssets';

interface MediaKitAssetsProps {
	data: MediaKitAssetData;
}

/** Download buttons for the generated PNG assets (#1475). */
export default function MediaKitAssets({ data }: MediaKitAssetsProps) {
	const [busy, setBusy] = useState<string | null>(null);

	const download = async (id: string) => {
		const spec = MEDIA_KIT_ASSETS.find(a => a.id === id);
		if (!spec) return;
		setBusy(id);
		try {
			const blob = await renderMediaKitAsset(spec, data);
			downloadBlob(blob, assetFilename(data.handle, spec));
		} catch (error) {
			showToast.error(error instanceof Error ? error.message : 'Could not create the image.');
		} finally {
			setBusy(null);
		}
	};

	return (
		<section aria-labelledby="media-kit-assets-heading" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
			<h2 id="media-kit-assets-heading" className="font-grotesque text-lg font-black tracking-tight">
				Downloads
			</h2>
			<p className="mt-1 text-sm text-white/55">PNG images generated from your key&apos;s avatar and stats.</p>
			<ul className="mt-3 grid gap-2 sm:grid-cols-2">
				{MEDIA_KIT_ASSETS.map(spec => (
					<li key={spec.id}>
						<Button
							type="button"
							variant="outline"
							className="w-full justify-between rounded-xl border-white/10 bg-white/[0.03] text-white hover:bg-white/[0.06]"
							disabled={busy !== null}
							onClick={() => void download(spec.id)}
						>
							<span>{spec.label}</span>
							<Download className="size-4" aria-hidden="true" />
						</Button>
					</li>
				))}
			</ul>
		</section>
	);
}
