import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import TradeDialog, { type TradeDialogProps } from '@/components/common/TradeDialog';

// ---------------------------------------------------------------------------
// Viewport / matchMedia mock helpers
// ---------------------------------------------------------------------------

type MQCallback = (event: Pick<MediaQueryListEvent, 'matches'>) => void;

interface MockMQL {
	matches: boolean;
	addEventListener: (event: string, cb: MQCallback) => void;
	removeEventListener: (event: string, cb: MQCallback) => void;
	_fire: (newMatches: boolean) => void;
}

function mockViewportWidth(widthPx: number): MockMQL {
	const matches = widthPx < 768;
	const listeners: MQCallback[] = [];
	const mql: MockMQL = {
		matches,
		addEventListener: (_event: string, cb: MQCallback) => listeners.push(cb),
		removeEventListener: (_event: string, cb: MQCallback) => {
			const idx = listeners.indexOf(cb);
			if (idx !== -1) listeners.splice(idx, 1);
		},
		_fire: (newMatches: boolean) => {
			mql.matches = newMatches;
			listeners.forEach(cb => cb({ matches: newMatches }));
		},
	};

	Object.defineProperty(window, 'matchMedia', {
		writable: true,
		value: vi.fn().mockReturnValue(mql),
	});

	return mql;
}

function TestTradeDialog(props: Partial<TradeDialogProps> = {}) {
	const [open, setOpen] = useState(props.open ?? true);
	return (
		<TradeDialog
			open={open}
			side="buy"
			creatorName="Alice"
			availableHoldings={10}
			keyPriceStroops={10_000_000}
			currentSupply={5}
			onOpenChange={props.onOpenChange ?? setOpen}
			onConfirm={props.onConfirm ?? vi.fn()}
			{...props}
		/>
	);
}

describe('TradeDialog mobile slide-up sheet (#865)', () => {
	let mql: MockMQL;

	beforeEach(() => {
		mql = mockViewportWidth(375); // mobile iPhone width by default (< 768px)
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe('Viewport-responsive rendering', () => {
		it('renders as a bottom sheet with drag handle on mobile viewports (< 768px)', () => {
			mockViewportWidth(500);
			render(<TestTradeDialog />);

			// Bottom sheet content slot is rendered
			const sheet = screen.getByTestId('bottom-sheet-handle');
			expect(sheet).toBeInTheDocument();

			const content = document.querySelector('[data-slot="bottom-sheet-content"]');
			expect(content).toBeInTheDocument();
			expect(document.querySelector('[data-slot="dialog-content"]')).not.toBeInTheDocument();

			// Sheet title and description
			expect(screen.getByText('Buy keys')).toBeInTheDocument();
			expect(screen.getByText('Purchase creator keys for Alice.')).toBeInTheDocument();
		});

		it('renders as a centered modal without drag handle on desktop viewports (>= 768px)', () => {
			mockViewportWidth(1024);
			render(<TestTradeDialog />);

			// Centered dialog content slot is rendered
			expect(document.querySelector('[data-slot="dialog-content"]')).toBeInTheDocument();
			expect(document.querySelector('[data-slot="bottom-sheet-content"]')).not.toBeInTheDocument();
			expect(screen.queryByTestId('bottom-sheet-handle')).not.toBeInTheDocument();

			// Dialog title and description
			expect(screen.getByText('Buy keys')).toBeInTheDocument();
			expect(screen.getByText('Purchase creator keys for Alice.')).toBeInTheDocument();
		});

		it('switches between bottom sheet and centered modal dynamically when viewport changes', () => {
			render(<TestTradeDialog />);

			// Initially mobile: bottom sheet
			expect(document.querySelector('[data-slot="bottom-sheet-content"]')).toBeInTheDocument();
			expect(screen.getByTestId('bottom-sheet-handle')).toBeInTheDocument();

			// Resize to desktop
			act(() => {
				mql._fire(false);
			});

			expect(document.querySelector('[data-slot="dialog-content"]')).toBeInTheDocument();
			expect(screen.queryByTestId('bottom-sheet-handle')).not.toBeInTheDocument();

			// Resize back to mobile
			act(() => {
				mql._fire(true);
			});

			expect(document.querySelector('[data-slot="bottom-sheet-content"]')).toBeInTheDocument();
			expect(screen.getByTestId('bottom-sheet-handle')).toBeInTheDocument();
		});
	});

	describe('Height constraint & top margin', () => {
		it('enforces maximum height leaving at least 80px of viewport visible at top on mobile', () => {
			render(<TestTradeDialog />);

			const content = document.querySelector('[data-slot="bottom-sheet-content"]');
			expect(content).toHaveClass('max-h-[calc(100vh-80px)]');
			expect(content).toHaveClass('overflow-y-auto');
		});
	});

	describe('Slide-up animation', () => {
		it('applies slide-up CSS animation classes on the bottom sheet content', () => {
			render(<TestTradeDialog />);

			const content = document.querySelector('[data-slot="bottom-sheet-content"]');
			expect(content).toHaveClass('data-[state=open]:slide-in-from-bottom-8');
			expect(content).toHaveClass('data-[state=closed]:slide-out-to-bottom-8');
		});
	});

	describe('Swipe-down to dismiss gesture', () => {
		it('dismisses the sheet when dragging downward past the threshold', () => {
			const onOpenChange = vi.fn();
			render(<TestTradeDialog onOpenChange={onOpenChange} />);

			const handle = screen.getByTestId('bottom-sheet-handle');

			fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100, button: 0 });
			fireEvent.pointerMove(handle, { pointerId: 1, clientY: 220 }); // 120px > 96px threshold
			fireEvent.pointerUp(handle, { pointerId: 1, clientY: 220 });

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it('does not dismiss when dragging below the threshold', () => {
			const onOpenChange = vi.fn();
			render(<TestTradeDialog onOpenChange={onOpenChange} />);

			const handle = screen.getByTestId('bottom-sheet-handle');

			fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100, button: 0 });
			fireEvent.pointerMove(handle, { pointerId: 1, clientY: 130 }); // 30px < 96px threshold
			fireEvent.pointerUp(handle, { pointerId: 1, clientY: 130 });

			expect(onOpenChange).not.toHaveBeenCalledWith(false);
		});

		it('does not dismiss on upward drag', () => {
			const onOpenChange = vi.fn();
			render(<TestTradeDialog onOpenChange={onOpenChange} />);

			const handle = screen.getByTestId('bottom-sheet-handle');

			fireEvent.pointerDown(handle, { pointerId: 1, clientY: 200, button: 0 });
			fireEvent.pointerMove(handle, { pointerId: 1, clientY: 100 }); // -100px upward
			fireEvent.pointerUp(handle, { pointerId: 1, clientY: 100 });

			expect(onOpenChange).not.toHaveBeenCalledWith(false);
		});
	});

	describe('Sell modal variant on mobile', () => {
		it('renders the sell variant as a bottom sheet with correct titles and sell details', () => {
			render(
				<TestTradeDialog
					side="sell"
					creatorName="Bob"
					availableHoldings={5}
					currentSupply={10}
					keyPriceStroops={5_000_000}
				/>
			);

			expect(document.querySelector('[data-slot="bottom-sheet-content"]')).toBeInTheDocument();
			expect(screen.getByTestId('bottom-sheet-handle')).toBeInTheDocument();
			expect(screen.getByText('Sell keys')).toBeInTheDocument();
			expect(screen.getByText('Sell creator keys for Bob.')).toBeInTheDocument();
			expect(screen.getByTestId('trade-dialog-confirm')).toHaveTextContent('Confirm sell');
		});
	});

	describe('Submitting state on mobile', () => {
		it('disables drag-to-dismiss and hides close button when isSubmitting is true', () => {
			const onOpenChange = vi.fn();
			render(<TestTradeDialog isSubmitting={true} onOpenChange={onOpenChange} />);

			// Close button is hidden
			expect(screen.queryByRole('button', { name: 'Close panel' })).not.toBeInTheDocument();

			// Dragging handle does not dismiss
			const handle = screen.getByTestId('bottom-sheet-handle');
			fireEvent.pointerDown(handle, { pointerId: 1, clientY: 100, button: 0 });
			fireEvent.pointerMove(handle, { pointerId: 1, clientY: 400 });
			fireEvent.pointerUp(handle, { pointerId: 1, clientY: 400 });

			expect(onOpenChange).not.toHaveBeenCalledWith(false);
		});
	});

	describe('Form interactions & accessibility on mobile', () => {
		it('allows changing amount and confirms trade on mobile', async () => {
			const user = userEvent.setup();
			const onConfirm = vi.fn();
			render(<TestTradeDialog onConfirm={onConfirm} />);

			const input = screen.getByTestId('trade-dialog-amount');
			await user.clear(input);
			await user.type(input, '3');

			const confirmBtn = screen.getByTestId('trade-dialog-confirm');
			await user.click(confirmBtn);

			expect(onConfirm).toHaveBeenCalledWith(
				3,
				null,
				expect.objectContaining({ toleranceZPercent: 1 })
			);
		});

		it('allows cancelling trade via cancel button on mobile', async () => {
			const user = userEvent.setup();
			const onOpenChange = vi.fn();
			render(<TestTradeDialog onOpenChange={onOpenChange} />);

			const cancelBtn = screen.getByTestId('trade-dialog-cancel');
			await user.click(cancelBtn);

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it('allows closing via the close button on mobile', () => {
			const onOpenChange = vi.fn();
			render(<TestTradeDialog onOpenChange={onOpenChange} />);

			const closeBtn = screen.getByRole('button', { name: 'Close panel' });
			fireEvent.click(closeBtn);

			expect(onOpenChange).toHaveBeenCalledWith(false);
		});
	});
});
