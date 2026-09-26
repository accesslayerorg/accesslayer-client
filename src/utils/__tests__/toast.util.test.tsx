import { render, screen, act } from '@testing-library/react';
import { Toaster } from 'react-hot-toast';
import toast from 'react-hot-toast';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import showToast from '../toast.util';

describe('toast util auto-dismiss and manual close', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		Object.defineProperty(window, 'matchMedia', {
			writable: true,
			value: vi.fn().mockImplementation((query: string) => ({
				matches: false,
				media: query,
				onchange: null,
				addEventListener: vi.fn(),
				removeEventListener: vi.fn(),
				addListener: vi.fn(),
				removeListener: vi.fn(),
				dispatchEvent: vi.fn(),
			})),
		});
	});

	afterEach(() => {
		toast.remove();
		vi.useRealTimers();
	});

	it('toast visible immediately after render', () => {
		render(<Toaster />);

		act(() => {
			showToast.success('Success message');
		});

		expect(screen.getByText('Success message')).toBeInTheDocument();
	});

	it('toast still visible before auto-dismiss fires', () => {
		render(<Toaster />);

		act(() => {
			showToast.success('Success message');
		});

		expect(screen.getByText('Success message')).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(3999);
		});

		expect(screen.getByText('Success message')).toBeInTheDocument();
	});

	it('toast removed after auto-dismiss and remove delay', () => {
		render(<Toaster />);

		act(() => {
			showToast.success('Success message');
		});

		expect(screen.getByText('Success message')).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(4000);
		});

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(screen.queryByText('Success message')).not.toBeInTheDocument();
	});

	it('manual close removes the toast before the auto-dismiss timer fires', () => {
		render(<Toaster />);

		act(() => {
			showToast.success('Success message');
		});

		expect(screen.getByText('Success message')).toBeInTheDocument();

		act(() => {
			toast.dismiss();
		});

		act(() => {
			vi.advanceTimersByTime(1000);
		});

		expect(screen.queryByText('Success message')).not.toBeInTheDocument();
	});
});

/**
 * aria-live coverage for toasts (#876).
 *
 * App.tsx configures `<Toaster toastOptions={{ ariaProps: { role:
 * 'status', 'aria-live': 'polite' } }} />`, which react-hot-toast
 * applies to every toast type — including `toast.custom`, since all
 * toast variants render through the same `ToastBar` wrapper that reads
 * `toast.ariaProps`. These tests render `<Toaster>` with that same
 * config (rather than the library's bare default) so a change to
 * App.tsx's `toastOptions` that drops `ariaProps` would be caught here.
 */
describe('toast util aria-live (#876)', () => {
	const ariaToastOptions = {
		ariaProps: {
			role: 'status' as const,
			'aria-live': 'polite' as const,
		},
	};

	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		toast.remove();
		vi.useRealTimers();
	});

	it('announces a standard success toast via a polite live region', () => {
		render(<Toaster toastOptions={ariaToastOptions} />);

		act(() => {
			showToast.success('Trade confirmed');
		});

		const status = screen.getByRole('status');
		expect(status).toHaveAttribute('aria-live', 'polite');
		expect(status).toHaveTextContent('Trade confirmed');
	});

	it('announces an error toast via a polite live region', () => {
		render(<Toaster toastOptions={ariaToastOptions} />);

		act(() => {
			showToast.error('Trade failed');
		});

		const status = screen.getByRole('status');
		expect(status).toHaveAttribute('aria-live', 'polite');
		expect(status).toHaveTextContent('Trade failed');
	});

	it('announces the custom transactionSuccess toast via a polite live region', () => {
		render(<Toaster toastOptions={ariaToastOptions} />);

		act(() => {
			showToast.transactionSuccess('Purchase complete', 'Bought 10 keys');
		});

		const status = screen.getByRole('status');
		expect(status).toHaveAttribute('aria-live', 'polite');
		expect(status).toHaveTextContent('Purchase complete');
	});
});
