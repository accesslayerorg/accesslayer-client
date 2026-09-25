import { useCallback, useEffect, useRef } from 'react';
import type { TradeSide } from '@/components/common/TradeDialog';

/** All available global shortcuts and their descriptions. */
export const TRADE_SHORTCUTS = [
	{ keys: ['B'], description: 'Open buy dialog', category: 'Trade' },
	{ keys: ['S'], description: 'Open sell dialog', category: 'Trade' },
	{ keys: ['T'], description: 'Open trade dialog (buy)', category: 'Trade' },
	{ keys: ['Enter'], description: 'Confirm trade (when valid)', category: 'Trade' },
	{ keys: ['P'], description: 'Navigate to portfolio', category: 'Navigation' },
	{ keys: ['/'], description: 'Focus search bar', category: 'Navigation' },
	{ keys: ['1'], description: 'Switch to Overview tab', category: 'Navigation' },
	{ keys: ['2'], description: 'Switch to Creations tab', category: 'Navigation' },
	{ keys: ['3'], description: 'Switch to Collectors tab', category: 'Navigation' },
	{ keys: ['4'], description: 'Switch to Activity tab', category: 'Navigation' },
	{ keys: ['?'], description: 'Show keyboard shortcuts', category: 'Navigation' },
	{ keys: ['Ctrl', 'R'], description: 'Refresh creator list', category: 'Navigation' },
] as const;

/** Amount-specific shortcuts available inside the trade dialog. */
export const TRADE_DIALOG_SHORTCUTS = [
	{ keys: ['+'], description: 'Increase amount by 1', category: 'Amount' },
	{ keys: ['-'], description: 'Decrease amount by 1', category: 'Amount' },
	{ keys: ['1'], description: 'Set amount to 1', category: 'Quick amount' },
	{ keys: ['2'], description: 'Set amount to 2', category: 'Quick amount' },
	{ keys: ['3'], description: 'Set amount to 3', category: 'Quick amount' },
	{ keys: ['4'], description: 'Set amount to 5', category: 'Quick amount' },
	{ keys: ['5'], description: 'Set amount to 10', category: 'Quick amount' },
] as const;

/** Tab key names mapped to their indices. */
const TAB_KEYS: Record<string, string> = {
	'1': 'overview',
	'2': 'creations',
	'3': 'collectors',
	'4': 'activity',
};

/** Check if an element is an editable input where shortcuts should be suppressed. */
const isEditableTarget = (target: EventTarget | null): boolean => {
	if (!(target instanceof Element)) return false;

	let element: Element | null = target;
	while (element) {
		if (
			element.matches('input, textarea, select, [role="textbox"]') ||
			(element instanceof HTMLElement && element.isContentEditable)
		) {
			return true;
		}
		element = element.parentElement;
	}

	return false;
};

interface UseTradeKeyboardShortcutsOptions {
	/** Whether the trade dialog is currently open. */
	tradeDialogOpen: boolean;
	/** Open the trade dialog with the given side. */
	onOpenTradeDialog: (side: TradeSide) => void;
	/** Confirm the trade with the given amount. */
	onConfirmTrade?: () => void;
	/** Whether the trade is currently being submitted. */
	isSubmitting?: boolean;
	/** Whether the trade form is currently valid. */
	isFormValid?: boolean;
	/** Whether the help dialog should be shown. */
	helpOpen: boolean;
	/** Toggle the help dialog. */
	onToggleHelp: () => void;
	/** Callback to refresh the creator list. */
	onRefreshCreators?: () => void;
	/** Callback when a profile tab shortcut is pressed. */
	onTabChange?: (tab: string) => void;
	/** Callback to focus the search input. */
	onFocusSearch?: () => void;
	/** Callback to navigate to the portfolio page. */
	onNavigateToPortfolio?: () => void;
}

/**
 * Centralised keyboard-shortcut manager for the trading interface.
 *
 * Global shortcuts (active when the trade dialog is closed):
 *   B       → open buy dialog
 *   S       → open sell dialog
 *   T       → open trade dialog (buy)
 *   /       → focus search bar
 *   1–4     → switch profile tabs
 *   ?       → show keyboard-shortcuts help
 *   Ctrl+R  → refresh creator list
 *
 * Dialog shortcuts (active when the trade dialog is open):
 *   Enter   → confirm trade (if form is valid & not submitting)
 *   (Escape is handled natively by Radix Dialog)
 *
 * Amount shortcuts are handled internally by TradeDialog when the
 * amount input is focused:
 *   +/-     → adjust amount by 1
 *   1–5     → quick presets (1, 2, 3, 5, 10)
 */
export function useTradeKeyboardShortcuts({
	tradeDialogOpen,
	onOpenTradeDialog,
	onConfirmTrade,
	isSubmitting = false,
	isFormValid = false,
	helpOpen,
	onToggleHelp,
	onRefreshCreators,
	onTabChange,
	onFocusSearch,
	onNavigateToPortfolio,
}: UseTradeKeyboardShortcutsOptions) {
	const isSubmittingRef = useRef(isSubmitting);
	const isFormValidRef = useRef(isFormValid);
	const tradeDialogOpenRef = useRef(tradeDialogOpen);
	const helpOpenRef = useRef(helpOpen);

	useEffect(() => {
		isSubmittingRef.current = isSubmitting;
	}, [isSubmitting]);
	useEffect(() => {
		isFormValidRef.current = isFormValid;
	}, [isFormValid]);
	useEffect(() => {
		tradeDialogOpenRef.current = tradeDialogOpen;
	}, [tradeDialogOpen]);
	useEffect(() => {
		helpOpenRef.current = helpOpen;
	}, [helpOpen]);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			// Ignore events that have already been handled or are repeats
			if (event.defaultPrevented || event.repeat) return;

			const target = event.target;
			const key = event.key;
			const isEditable = isEditableTarget(target);

			// Help dialog shortcuts (active globally except in editable fields)
			if (!isEditable && key === '?' && !event.ctrlKey && !event.metaKey) {
				event.preventDefault();
				onToggleHelp();
				return;
			}

			// Close help on Escape
			if (helpOpenRef.current && key === 'Escape') {
				event.preventDefault();
				onToggleHelp();
				return;
			}

			// Global shortcuts (only when trade dialog is closed and not in editable field)
			if (!tradeDialogOpenRef.current && !isEditable) {
				const lower = key.toLowerCase();

				// Creator refresh: Ctrl/Cmd+R
				if ((event.ctrlKey || event.metaKey) && lower === 'r') {
					event.preventDefault();
					onRefreshCreators?.();
					return;
				}

				// No-modifier shortcuts
				if (
					!event.ctrlKey &&
					!event.metaKey &&
					!event.altKey &&
					!event.shiftKey
				) {
					// Trade shortcuts: B, S, T
					if (lower === 'b') {
						event.preventDefault();
						onOpenTradeDialog('buy');
						return;
					}
					if (lower === 's') {
						event.preventDefault();
						onOpenTradeDialog('sell');
						return;
					}
					if (lower === 't') {
						event.preventDefault();
						onOpenTradeDialog('buy');
						return;
					}

					// Search: / (slash)
					if (key === '/') {
						event.preventDefault();
						onFocusSearch?.();
						return;
					}

					// Tab navigation: 1–4
					if (TAB_KEYS[key] && onTabChange) {
						event.preventDefault();
						onTabChange(TAB_KEYS[key]);
						return;
					}

					// Portfolio: P
					if (lower === 'p') {
						event.preventDefault();
						onNavigateToPortfolio?.();
						return;
					}
				}
			}

			// Dialog shortcuts (only when trade dialog is open)
			// Note: Escape is handled natively by Radix Dialog, so we only
			// handle Enter to confirm the trade here.
			if (tradeDialogOpenRef.current) {
				// Enter confirms trade (if valid and not submitting)
				if (key === 'Enter' && !event.shiftKey && !event.ctrlKey && !event.metaKey) {
					if (isFormValidRef.current && !isSubmittingRef.current) {
						event.preventDefault();
						onConfirmTrade?.();
						return;
					}
				}
			}
		},
		[
			onOpenTradeDialog,
			onConfirmTrade,
			onToggleHelp,
			onRefreshCreators,
			onTabChange,
			onFocusSearch,
			onNavigateToPortfolio,
		]
	);

	useEffect(() => {
		window.addEventListener('keydown', handleKeyDown);
		return () => window.removeEventListener('keydown', handleKeyDown);
	}, [handleKeyDown]);
}
