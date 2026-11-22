import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';

import TradeDialog from '@/components/common/TradeDialog';

/**
 * Mobile bottom-sheet tests for the buy/sell flow (#1055).
 *
 * Acceptance criteria covered:
 *  - Buy/sell form renders as a bottom sheet on mobile that opens and closes
 *    correctly.
 *  - Action buttons keep ≥44px tap targets on mobile.
 *  - Desktop keeps the dialog presentation (dialog semantics, no sheet).
 */

const renderBuyDialog = (
	overrides: Partial<React.ComponentProps<typeof TradeDialog>> = {}
) =>
	render(
		<TradeDialog
			open={true}
			side="buy"
			creatorName="TestCreator"
			availableHoldings={100}
			keyPriceStroops={1_000_000}
			protocolFeeBps={250}
			creatorFeeBps={250}
			onOpenChange={vi.fn()}
			onConfirm={vi.fn()}
			{...overrides}
		/>
	);

describe('TradeDialog mobile bottom sheet (#1055)', () => {
	beforeEach(() => {
		// useIsMobile reads matchMedia("(max-width: 767px)") — jsdom doesn't
		// implement it, so default every query to "mobile".
		vi.stubGlobal(
			'matchMedia',
			vi.fn().mockImplementation((query: string) => ({
				matches: query.includes('max-width'),
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}))
		);
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it('renders as a bottom sheet on mobile with dialog semantics', () => {
		renderBuyDialog();

		const sheet = screen.getByRole('dialog');
		expect(sheet).toHaveAttribute('data-slot', 'bottom-sheet-content');
		// Sheet sizing: docked to the bottom edge, scrollable, respecting
		// dynamic viewport height on mobile browsers.
		expect(sheet.className).toContain('max-h-[calc(100dvh-80px)]');
		expect(sheet.className).toContain('overflow-y-auto');
	});

	it('keeps the confirmation button at a ≥44px tap target on mobile', () => {
		renderBuyDialog();

		expect(screen.getByTestId('trade-dialog-confirm')).toHaveClass('min-h-11');
	});

	it('closes via the close button without invoking onConfirm', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		const onConfirm = vi.fn();
		renderBuyDialog({ onOpenChange, onConfirm });

		await user.click(screen.getByRole('button', { name: 'Close panel' }));

		expect(onOpenChange).toHaveBeenCalledWith(false);
		expect(onConfirm).not.toHaveBeenCalled();
	});

	it('closes via cancel and keeps onOpenChange in control', async () => {
		const user = userEvent.setup();
		const onOpenChange = vi.fn();
		renderBuyDialog({ onOpenChange });

		await user.click(screen.getByTestId('trade-dialog-cancel'));

		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it('renders a centered dialog instead of a sheet when not mobile', () => {
		vi.stubGlobal(
			'matchMedia',
			vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addListener: vi.fn(),
				removeListener: vi.fn(),
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				dispatchEvent: vi.fn(),
			}))
		);

		renderBuyDialog();

		const dialog = screen.getByRole('dialog');
		expect(dialog.getAttribute('data-slot')).toBe('dialog-content');
		expect(screen.queryByText('Close panel')).not.toBeInTheDocument();
		// Desktop buttons keep their compact height.
		expect(screen.getByTestId('trade-dialog-confirm')).not.toHaveClass(
			'min-h-11'
		);
	});
});
