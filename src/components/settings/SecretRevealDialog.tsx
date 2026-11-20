import { useEffect, useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { copyTextToClipboard } from '@/utils/clipboard.utils';

export interface SecretRevealDialogProps {
	open: boolean;
	secret: string;
	onClose: () => void;
}

/**
 * One-time reveal of a freshly created API key secret (#1322).
 *
 * The dialog cannot be dismissed (Escape, outside click, close button) until
 * the acknowledgement checkbox is ticked, so the secret is not lost by
 * accident.
 */
export default function SecretRevealDialog({
	open,
	secret,
	onClose,
}: SecretRevealDialogProps) {
	const [acknowledged, setAcknowledged] = useState(false);
	const [copied, setCopied] = useState(false);
	const [copyError, setCopyError] = useState(false);

	useEffect(() => {
		if (open) {
			setAcknowledged(false);
			setCopied(false);
			setCopyError(false);
		}
	}, [open]);

	const handleCopy = async () => {
		try {
			await copyTextToClipboard(secret);
			setCopied(true);
			setCopyError(false);
		} catch {
			setCopied(false);
			setCopyError(true);
		}
	};

	const handleOpenChange = (nextOpen: boolean) => {
		if (nextOpen) return;
		if (acknowledged) onClose();
	};

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogContent
				data-testid="secret-reveal-dialog"
				showCloseButton={false}
				showEscapeHint={false}
				onEscapeKeyDown={event => {
					if (!acknowledged) event.preventDefault();
				}}
				onPointerDownOutside={event => {
					if (!acknowledged) event.preventDefault();
				}}
				onInteractOutside={event => {
					if (!acknowledged) event.preventDefault();
				}}
			>
				<DialogHeader>
					<DialogTitle>Copy your API key now</DialogTitle>
					<DialogDescription>
						This is the only time the full secret is shown. Store it
						somewhere safe — you won't be able to see it again.
					</DialogDescription>
				</DialogHeader>

				<div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3">
					<code
						data-testid="api-key-secret"
						className="min-w-0 flex-1 break-all font-mono text-xs text-foreground"
					>
						{secret}
					</code>
					<Button
						type="button"
						variant="outline"
						size="sm"
						data-testid="copy-api-key-secret"
						aria-label="Copy API key"
						onClick={() => void handleCopy()}
					>
						{copied ? (
							<Check className="size-3.5" aria-hidden="true" />
						) : (
							<Copy className="size-3.5" aria-hidden="true" />
						)}
						{copied ? 'Copied' : 'Copy'}
					</Button>
				</div>

				{copyError && (
					<p role="alert" className="text-xs text-destructive">
						Couldn't copy automatically. Select the key and copy it
						manually.
					</p>
				)}

				<div className="flex items-start gap-2">
					<Checkbox
						id="api-key-secret-acknowledged"
						checked={acknowledged}
						onCheckedChange={setAcknowledged}
						className="mt-1"
					/>
					<Label
						htmlFor="api-key-secret-acknowledged"
						className="font-normal leading-5"
					>
						I've saved this key. I understand it can't be shown again.
					</Label>
				</div>

				<DialogFooter>
					<Button
						type="button"
						data-testid="secret-reveal-done"
						disabled={!acknowledged}
						onClick={onClose}
					>
						Done
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
