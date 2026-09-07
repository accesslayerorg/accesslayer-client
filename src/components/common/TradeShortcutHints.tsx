import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { Kbd } from '@/components/ui/kbd';
import { Zap } from 'lucide-react';

interface TradeShortcutHintsProps {
	/** Whether the trade dialog is open. */
	open: boolean;
	/** The current trade side. */
	side: 'buy' | 'sell';
	/** Whether hints should be visible. Auto-dismisses after a few seconds. */
	visible?: boolean;
}

/**
 * Floating hint bar that briefly appears when the trade dialog opens,
 * showing power-user shortcuts. Auto-dismisses after 4 seconds.
 */
const TradeShortcutHints: React.FC<TradeShortcutHintsProps> = ({
	open,
	side,
	visible: controlledVisible,
}) => {
	const [dismissed, setDismissed] = useState(false);
	const [show, setShow] = useState(false);

	// Reset dismissed state when dialog closes
	useEffect(() => {
		if (!open) {
			setDismissed(false);
			setShow(false);
		}
	}, [open]);

	// Show hints briefly when dialog opens
	useEffect(() => {
		if (open && !dismissed) {
			const timer = window.setTimeout(() => setShow(true), 300);
			const hideTimer = window.setTimeout(() => {
				setShow(false);
				setDismissed(true);
			}, 4000);
			return () => {
				clearTimeout(timer);
				clearTimeout(hideTimer);
			};
		}
	}, [open, dismissed]);

	const isVisible = controlledVisible ?? show;

	if (!isVisible) return null;

	return (
		<div
			role="status"
			aria-live="polite"
			className={cn(
				'pointer-events-none fixed bottom-24 left-1/2 z-[60] -translate-x-1/2',
				'flex items-center gap-3 rounded-full border border-amber-400/20',
				'bg-slate-950/90 px-4 py-2 text-xs text-white/70 shadow-2xl shadow-black/40',
				'backdrop-blur-md transition-all duration-300',
				'sm:bottom-32',
				'motion-reduce:transition-none',
				show ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0'
			)}
			data-testid="trade-shortcut-hints"
		>
			<Zap className="size-3.5 text-amber-400/80" aria-hidden="true" />
			<span className="text-white/50">
				{side === 'buy' ? 'Buy' : 'Sell'} shortcuts:
			</span>
			<span className="flex items-center gap-1.5">
				<Kbd>Enter</Kbd>
				<span className="text-white/40">confirm</span>
			</span>
			<span className="text-white/20">·</span>
			<span className="flex items-center gap-1.5">
				<Kbd>+</Kbd>
				<Kbd>-</Kbd>
				<span className="text-white/40">adjust</span>
			</span>
			<span className="text-white/20">·</span>
			<span className="flex items-center gap-1.5">
				<Kbd>1</Kbd>
				<Kbd>5</Kbd>
				<span className="text-white/40">quick amount</span>
			</span>
		</div>
	);
};

export default TradeShortcutHints;
