import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { XIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

function Dialog({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
	return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
	return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
	return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({
	...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
	return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

function DialogOverlay({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
	return (
		<DialogPrimitive.Overlay
			data-slot="dialog-overlay"
			className={cn(
				'data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50',
				className
			)}
			{...props}
		/>
	);
}

function DialogContent({
	className,
	children,
	showCloseButton = true,
	showEscapeHint = true,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
	showCloseButton?: boolean;
	showEscapeHint?: boolean;
}) {
	return (
		<DialogPortal data-slot="dialog-portal">
			<DialogOverlay />
			<DialogPrimitive.Content
				data-slot="dialog-content"
				// Radix's Dialog.Content does not stamp aria-modal itself;
				// set it explicitly so every modal built on this shared
				// component is correctly announced as modal to assistive
				// tech (#876). role="dialog" and the focus trap /
				// Escape-to-dismiss / focus-restore behavior are already
				// provided by Radix.
				aria-modal="true"
				className={cn(
					'bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-lg duration-200 outline-none sm:max-w-lg sm:pb-6',
					className
				)}
				{...props}
			>
				{showCloseButton && (
					<DialogPrimitive.Close
						data-slot="dialog-close"
						className="ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4"
					>
						<XIcon />
						<span className="sr-only">Close</span>
					</DialogPrimitive.Close>
				)}
				{children}
				{showEscapeHint && (
					<p
						aria-hidden="true"
						className="pointer-events-none absolute right-4 bottom-3 select-none text-[11px] text-white/45"
					>
						Esc to close
					</p>
				)}
			</DialogPrimitive.Content>
		</DialogPortal>
	);
}

function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
	return (
		<div
			data-slot="dialog-header"
			className={cn(
				'flex flex-col gap-2 text-center sm:text-left',
				className
			)}
			{...props}
		/>
	);
}

function DialogFooter({
	className,
	showCloseButton = false,
	children,
	...props
}: React.ComponentProps<'div'> & {
	showCloseButton?: boolean;
}) {
	return (
		<div
			data-slot="dialog-footer"
			className={cn(
				'flex flex-col-reverse gap-2 sm:flex-row sm:justify-end',
				className
			)}
			{...props}
		>
			{children}
			{showCloseButton && (
				<DialogPrimitive.Close asChild>
					<Button variant="outline">Close</Button>
				</DialogPrimitive.Close>
			)}
		</div>
	);
}

function DialogTitle({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
	return (
		<DialogPrimitive.Title
			data-slot="dialog-title"
			className={cn('text-lg leading-none font-semibold', className)}
			{...props}
		/>
	);
}

function DialogDescription({
	className,
	...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
	return (
		<DialogPrimitive.Description
			data-slot="dialog-description"
			className={cn('text-muted-foreground text-sm', className)}
			{...props}
		/>
	);
}

export interface WalletHelpModalProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

export function WalletHelpModal({ open, onOpenChange }: WalletHelpModalProps) {
	const {
		wallets,
		reason,
		reasonLabel,
		diagnostics,
		recheck,
		isRechecking,
	} = useWalletDetection();
	const [copied, setCopied] = React.useState(false);

	const copyDiagnostics = React.useCallback(async () => {
		try {
			await navigator.clipboard.writeText(diagnostics);
			setCopied(true);
			window.setTimeout(() => setCopied(false), 2000);
		} catch {
			setCopied(false);
		}
	}, [diagnostics]);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent className="max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Wallet help</DialogTitle>
					<DialogDescription>
						{reasonLabel
							? `We detected: ${reasonLabel}. Try the highlighted fix first.`
							: 'Follow the steps below to install or connect a Stellar wallet.'}
					</DialogDescription>
				</DialogHeader>

				<section aria-labelledby="wallet-install-heading" className="space-y-3">
					<h3 id="wallet-install-heading" className="text-sm font-semibold">
						Install a wallet
					</h3>
					<ul className="space-y-2">
						{wallets.map((wallet) => (
							<li
								key={wallet.id}
								className="flex items-center justify-between gap-3 rounded-md border p-3"
							>
								<div>
									<p className="text-sm font-medium">{wallet.name}</p>
									<p className="text-muted-foreground text-xs">
										{wallet.installed ? 'Installed' : 'Not detected'}
									</p>
								</div>
								{!wallet.installed && (
									<a
										href={wallet.downloadUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="text-primary text-sm underline"
									>
										Install {wallet.name}
									</a>
								)}
							</li>
						))}
					</ul>
					<Button
						variant="outline"
						onClick={recheck}
						disabled={isRechecking}
						aria-live="polite"
					>
						{isRechecking ? 'Rechecking…' : 'Recheck'}
					</Button>
				</section>

				<section aria-labelledby="wallet-checklist-heading" className="space-y-2">
					<h3 id="wallet-checklist-heading" className="text-sm font-semibold">
						Troubleshooting checklist
					</h3>
					<ul className="space-y-2">
						{checklistItems.map((item) => {
							const isRelevant = reason === item.reason;
							return (
								<li
									key={item.reason}
									className={cn(
										'rounded-md border p-3 text-sm',
										isRelevant && 'border-primary bg-primary/5'
									)}
								>
									<p className="font-medium">
										{isRelevant && <span aria-hidden="true">★ </span>}
										{item.title}
									</p>
									<p className="text-muted-foreground text-xs">{item.fix}</p>
								</li>
							);
						})}
					</ul>
				</section>

				<DialogFooter>
					<Button variant="outline" onClick={copyDiagnostics}>
						{copied ? 'Copied' : 'Copy diagnostics'}
					</Button>
					<DialogClose asChild>
						<Button>Close</Button>
					</DialogClose>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

const checklistItems: Array<{
	reason: string;
	title: string;
	fix: string;
}> = [
	{
		reason: 'locked',
		title: 'Wallet is locked',
		fix: 'Open your wallet extension and unlock it, then press Recheck.',
	},
	{
		reason: 'wrong-network',
		title: 'Wrong network',
		fix: 'Switch your wallet to the Stellar network this app uses, then press Recheck.',
	},
	{
		reason: 'blocked-popup',
		title: 'Pop-ups blocked',
		fix: 'Allow pop-ups for this site in your browser settings, then try connecting again.',
	},
	{
		reason: 'adblocker',
		title: 'Ad blocker or extension conflict',
		fix: 'Disable ad blockers or conflicting extensions for this site, then press Recheck.',
	},
];

export {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogOverlay,
	DialogPortal,
	DialogTitle,
	DialogTrigger,
};
