import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Kbd } from '@/components/ui/kbd';
import { TRADE_SHORTCUTS, TRADE_DIALOG_SHORTCUTS } from '@/hooks/useTradeKeyboardShortcuts';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcutsHelpProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
}

/**
 * Group shortcuts by category for display.
 */
function groupByCategory(
	shortcuts: readonly TradeShortcut[]
): Map<string, TradeShortcut[]> {
	const groups = new Map<string, TradeShortcut[]>();
	for (const shortcut of shortcuts) {
		const existing = groups.get(shortcut.category);
		if (existing) {
			existing.push(shortcut);
		} else {
			groups.set(shortcut.category, [shortcut]);
		}
	}
	return groups;
}

type TradeShortcut = {
	readonly keys: readonly string[];
	readonly description: string;
	readonly category: string;
};

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
	open,
	onOpenChange,
}) => {
	const allShortcuts = [...TRADE_SHORTCUTS, ...TRADE_DIALOG_SHORTCUTS];
	const groups = groupByCategory(allShortcuts);

	return (
		<Dialog open={open} onOpenChange={onOpenChange}>
			<DialogContent
				className="max-w-md"
				showCloseButton
				showEscapeHint={false}
				data-testid="keyboard-shortcuts-help"
			>
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Keyboard className="size-5 text-amber-400" aria-hidden="true" />
						Keyboard shortcuts
					</DialogTitle>
					<DialogDescription>
						Keyboard shortcuts for power users. Press{' '}
						<Kbd className="mx-0.5">?</Kbd> anytime to toggle this panel.
					</DialogDescription>
				</DialogHeader>

				<div className="max-h-[60vh] space-y-5 overflow-y-auto pr-1">
					{Array.from(groups.entries()).map(([category, shortcuts]) => (
						<div key={category}>
							<h3 className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-white/45">
								{category}
							</h3>
							<ul className="space-y-1.5">
								{shortcuts.map(shortcut => (
									<li
										key={shortcut.description}
										className="flex items-center justify-between gap-4 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-white/[0.04]"
									>
										<span className="text-white/75">
											{shortcut.description}
										</span>
										<span className="flex shrink-0 items-center gap-1">
											{shortcut.keys.map((key, i) => (
												<span key={`${key}-${i}`} className="flex items-center gap-1">
													{i > 0 && (
														<span className="text-[10px] text-white/30">+</span>
													)}
													<Kbd>{key}</Kbd>
												</span>
											))}
										</span>
									</li>
								))}
							</ul>
						</div>
					))}
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default KeyboardShortcutsHelp;
