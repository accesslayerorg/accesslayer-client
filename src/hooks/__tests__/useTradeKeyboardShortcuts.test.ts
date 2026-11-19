import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useTradeKeyboardShortcuts } from '@/hooks/useTradeKeyboardShortcuts';

function fireKeydown(key: string, options: Partial<KeyboardEventInit> = {}) {
	window.dispatchEvent(
		new KeyboardEvent('keydown', {
			key,
			bubbles: true,
			...options,
		})
	);
}

describe('useTradeKeyboardShortcuts', () => {
	const defaults = {
		tradeDialogOpen: false,
		onOpenTradeDialog: vi.fn(),
		onConfirmTrade: vi.fn(),
		helpOpen: false,
		onToggleHelp: vi.fn(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('trade shortcuts', () => {
		it('opens buy dialog when B is pressed', () => {
			const onOpenTradeDialog = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					onOpenTradeDialog,
				})
			);

			fireKeydown('b');

			expect(onOpenTradeDialog).toHaveBeenCalledWith('buy');
		});

		it('opens sell dialog when S is pressed', () => {
			const onOpenTradeDialog = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					onOpenTradeDialog,
				})
			);

			fireKeydown('s');

			expect(onOpenTradeDialog).toHaveBeenCalledWith('sell');
		});

		it('opens trade dialog when T is pressed', () => {
			const onOpenTradeDialog = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					onOpenTradeDialog,
				})
			);

			fireKeydown('t');

			expect(onOpenTradeDialog).toHaveBeenCalledWith('buy');
		});

		it('does not open trade shortcuts when dialog is already open', () => {
			const onOpenTradeDialog = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					tradeDialogOpen: true,
					onOpenTradeDialog,
				})
			);

			fireKeydown('b');
			fireKeydown('s');
			fireKeydown('t');

			expect(onOpenTradeDialog).not.toHaveBeenCalled();
		});
	});

	describe('dialog shortcuts', () => {
		it('confirms trade on Enter when dialog is open and form is valid', () => {
			const onConfirmTrade = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					tradeDialogOpen: true,
					isFormValid: true,
					onConfirmTrade,
				})
			);

			fireKeydown('Enter');

			expect(onConfirmTrade).toHaveBeenCalledTimes(1);
		});

		it('does not confirm trade on Enter when form is invalid', () => {
			const onConfirmTrade = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					tradeDialogOpen: true,
					isFormValid: false,
					onConfirmTrade,
				})
			);

			fireKeydown('Enter');

			expect(onConfirmTrade).not.toHaveBeenCalled();
		});

		it('does not confirm trade on Enter when submitting', () => {
			const onConfirmTrade = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					tradeDialogOpen: true,
					isFormValid: true,
					isSubmitting: true,
					onConfirmTrade,
				})
			);

			fireKeydown('Enter');

			expect(onConfirmTrade).not.toHaveBeenCalled();
		});
	});

	describe('navigation shortcuts', () => {
		it('toggles help when ? is pressed', () => {
			const onToggleHelp = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					onToggleHelp,
				})
			);

			fireKeydown('?');

			expect(onToggleHelp).toHaveBeenCalledTimes(1);
		});

		it('closes help dialog on Escape when help is open', () => {
			const onToggleHelp = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					helpOpen: true,
					onToggleHelp,
				})
			);

			fireKeydown('Escape');

			expect(onToggleHelp).toHaveBeenCalledTimes(1);
		});

		it('focuses search bar when / is pressed', () => {
			const onFocusSearch = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					onFocusSearch,
				})
			);

			fireKeydown('/');

			expect(onFocusSearch).toHaveBeenCalledTimes(1);
		});

		it('switches to overview tab when 1 is pressed', () => {
			const onTabChange = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					onTabChange,
				})
			);

			fireKeydown('1');

			expect(onTabChange).toHaveBeenCalledWith('overview');
		});

		it('switches to creations tab when 2 is pressed', () => {
			const onTabChange = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					onTabChange,
				})
			);

			fireKeydown('2');

			expect(onTabChange).toHaveBeenCalledWith('creations');
		});

		it('switches to collectors tab when 3 is pressed', () => {
			const onTabChange = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					onTabChange,
				})
			);

			fireKeydown('3');

			expect(onTabChange).toHaveBeenCalledWith('collectors');
		});

		it('switches to activity tab when 4 is pressed', () => {
			const onTabChange = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					onTabChange,
				})
			);

			fireKeydown('4');

			expect(onTabChange).toHaveBeenCalledWith('activity');
		});		it('navigates to portfolio when P is pressed', () => {
			const onNavigateToPortfolio = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					onNavigateToPortfolio,
				})
			);

			fireKeydown('p');

			expect(onNavigateToPortfolio).toHaveBeenCalledTimes(1);
		});

		it('refreshes creator list on Ctrl+R', () => {
			const onRefreshCreators = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					onRefreshCreators,
				})
			);

			fireKeydown('r', { ctrlKey: true });

			expect(onRefreshCreators).toHaveBeenCalledTimes(1);
		});
	});

	describe('editable field suppression', () => {
		it('does not open trade shortcuts when in an editable field', () => {
			const onOpenTradeDialog = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					onOpenTradeDialog,
				})
			);

			const input = document.createElement('input');
			document.body.appendChild(input);
			input.focus();

			fireKeydown('b');

			expect(onOpenTradeDialog).not.toHaveBeenCalled();

			document.body.removeChild(input);
		});

		it('does not respond to modifier-key combinations for trade shortcuts', () => {
			const onOpenTradeDialog = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					onOpenTradeDialog,
				})
			);

			fireKeydown('b', { ctrlKey: true });
			fireKeydown('b', { metaKey: true });
			fireKeydown('b', { altKey: true });

			expect(onOpenTradeDialog).not.toHaveBeenCalled();
		});

		it('does not respond to key repeat events', () => {
			const onOpenTradeDialog = vi.fn();
			renderHook(() =>
				useTradeKeyboardShortcuts({
					...defaults,
					onOpenTradeDialog,
				})
			);

			window.dispatchEvent(
				new KeyboardEvent('keydown', {
					key: 'b',
					bubbles: true,
					repeat: true,
				})
			);

			expect(onOpenTradeDialog).not.toHaveBeenCalled();
		});
	});
});
