import { useEffect, useState } from 'react';
import { Download, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BeforeInstallPromptEvent extends Event {
	prompt: () => Promise<void>;
	userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

const DISMISS_KEY = 'al:install-prompt-dismissed';

export default function InstallPrompt() {
	const [deferredPrompt, setDeferredPrompt] =
		useState<BeforeInstallPromptEvent | null>(null);
	const [isDismissed, setIsDismissed] = useState(false);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		if (sessionStorage.getItem(DISMISS_KEY) === 'true') {
			setIsDismissed(true);
		}

		const handleBeforeInstallPrompt = (e: Event) => {
			e.preventDefault();
			setDeferredPrompt(e as BeforeInstallPromptEvent);
		};

		window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

		return () => {
			window.removeEventListener(
				'beforeinstallprompt',
				handleBeforeInstallPrompt
			);
		};
	}, []);

	const handleInstall = async () => {
		if (!deferredPrompt) return;
		await deferredPrompt.prompt();
		const choice = await deferredPrompt.userChoice;
		if (choice.outcome === 'accepted') {
			setDeferredPrompt(null);
		}
	};

	const handleDismiss = () => {
		setIsDismissed(true);
		try {
			sessionStorage.setItem(DISMISS_KEY, 'true');
		} catch {
			// ignore storage errors
		}
	};

	if (!deferredPrompt || isDismissed) {
		return null;
	}

	return (
		<aside
			role="region"
			aria-label="Install application"
			data-testid="install-prompt-banner"
			className="fixed bottom-4 right-4 z-50 flex max-w-md items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md"
		>
			<div className="flex items-center gap-3">
				<div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400">
					<Download className="size-5" aria-hidden="true" />
				</div>
				<div>
					<h3 className="text-sm font-bold text-white">Install Access Layer</h3>
					<p className="text-xs text-white/60">
						Install for instant access and seamless offline experience.
					</p>
				</div>
			</div>
			<div className="flex items-center gap-2">
				<Button
					size="sm"
					onClick={handleInstall}
					className="bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400"
					data-testid="install-prompt-button"
				>
					Install
				</Button>
				<button
					type="button"
					onClick={handleDismiss}
					aria-label="Dismiss install prompt"
					data-testid="install-prompt-dismiss"
					className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
				>
					<X className="size-4" aria-hidden="true" />
				</button>
			</div>
		</aside>
	);
}
