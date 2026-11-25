import { Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import showToast from '@/utils/toast.util';
import type { CopyBlock } from '@/utils/mediaKitCopy';

/** Copy-ready text blocks (#1475). */
export default function MediaKitCopyBlocks({ blocks }: { blocks: CopyBlock[] }) {
	const copy = async (block: CopyBlock) => {
		try {
			await copyTextToClipboard(block.text);
			showToast.success(`${block.label} copied`);
		} catch {
			showToast.error('Could not copy the text.');
		}
	};
	return (
		<section aria-labelledby="media-kit-copy-heading" className="rounded-2xl border border-white/10 bg-white/[0.02] p-5">
			<h2 id="media-kit-copy-heading" className="font-grotesque text-lg font-black tracking-tight">
				Copy-ready text
			</h2>
			<ul className="mt-3 space-y-3">
				{blocks.map(block => (
					<li key={block.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
						<div className="flex items-center justify-between gap-2">
							<p className="text-xs font-bold uppercase tracking-[0.18em] text-white/50">{block.label}</p>
							<Button
								type="button"
								size="sm"
								variant="ghost"
								className="gap-1 text-white/70"
								aria-label={`Copy ${block.label}`}
								onClick={() => void copy(block)}
							>
								<Copy className="size-3.5" aria-hidden="true" /> Copy
							</Button>
						</div>
						<p className="mt-2 whitespace-pre-line text-sm text-white/80" data-testid={`copy-block-${block.id}`}>
							{block.text}
						</p>
					</li>
				))}
			</ul>
		</section>
	);
}
