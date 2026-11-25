import { useState } from 'react';
import { Copy, Download } from 'lucide-react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { copyTextToClipboard } from '@/utils/clipboard.utils';
import showToast from '@/utils/toast.util';

interface Props {
	codes: string[];
	onDismiss: () => void;
}

export default function RecoveryCodesGate({ codes, onDismiss }: Props) {
	const [saved, setSaved] = useState(false);
	const [copied, setCopied] = useState(false);

	const markSaved = () => setSaved(true);
	const copyCodes = async () => {
		try {
			await copyTextToClipboard(codes.join('\n'));
			setCopied(true);
			markSaved();
			showToast.success('Recovery codes copied');
		} catch {
			showToast.error('Could not copy recovery codes');
		}
	};
	const downloadCodes = () => {
		const blob = new Blob([codes.join('\n')], { type: 'text/plain;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const link = document.createElement('a');
		link.href = url;
		link.download = 'accesslayer-admin-recovery-codes.txt';
		link.click();
		URL.revokeObjectURL(url);
		markSaved();
	};

	return (
		<Dialog open onOpenChange={open => { if (!open && saved) onDismiss(); }}>
			<DialogContent
				showCloseButton={false}
				showEscapeHint={false}
				onEscapeKeyDown={event => event.preventDefault()}
				onPointerDownOutside={event => event.preventDefault()}
				onInteractOutside={event => event.preventDefault()}
				className="border-white/10 bg-[#071322] text-white sm:max-w-lg"
				aria-describedby="recovery-description"
			>
				<DialogHeader className="text-left">
					<DialogTitle>Save your recovery codes</DialogTitle>
					<DialogDescription id="recovery-description" className="text-white/60">
						Each code can be used once. Save or confirm that they are stored
						before continuing.
					</DialogDescription>
				</DialogHeader>
				<ol className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-black/20 p-4">
					{codes.map(code => (
						<li key={code} className="font-mono text-sm">{code}</li>
				 ))}
				</ol>
				<div className="flex flex-wrap gap-2">
					<Button type="button" variant="outline" onClick={copyCodes}>
						<Copy /> {copied ? 'Copied' : 'Copy codes'}
					</Button>
					<Button type="button" variant="outline" onClick={downloadCodes}>
						<Download /> Download
					</Button>
				</div>
				<Button type="button" disabled={!saved} onClick={onDismiss}>
					I saved these codes
				</Button>
			</DialogContent>
		</Dialog>
	);
}
