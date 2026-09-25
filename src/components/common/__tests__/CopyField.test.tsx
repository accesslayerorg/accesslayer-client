import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import CopyField from '@/components/common/CopyField';
import { copyTextToClipboard } from '@/utils/clipboard.utils';

vi.mock('@/utils/toast.util', () => ({
	default: { success: vi.fn(), error: vi.fn() },
}));

vi.mock('@/utils/clipboard.utils', () => ({
	copyTextToClipboard: vi.fn().mockResolvedValue(undefined),
}));

const mockCopyTextToClipboard = vi.mocked(copyTextToClipboard);

const FULL_ADDRESS =
	'GBUKOFF6RS5OTIHMGMH4MOVKPAS4JJIZGYXS4DOVZDNBH5YXKJXFNEC';

describe('CopyField clipboard integration', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('copies the full unmasked address to clipboard on button click', async () => {
		const user = userEvent.setup();

		render(<CopyField value={FULL_ADDRESS} label="Wallet address" />);

		const copyBtn = screen.getByRole('button', {
			name: /copy wallet address/i,
		});
		await user.click(copyBtn);

		expect(mockCopyTextToClipboard).toHaveBeenCalledOnce();
		expect(mockCopyTextToClipboard).toHaveBeenCalledWith(FULL_ADDRESS);
	});

	it('displays the full address in the input field', () => {
		render(<CopyField value={FULL_ADDRESS} label="Wallet address" />);

		const input = screen.getByRole('textbox', { name: /wallet address/i });
		expect(input).toHaveValue(FULL_ADDRESS);
	});

	it('shows copied state after clicking copy', async () => {
		const user = userEvent.setup();

		render(<CopyField value={FULL_ADDRESS} label="Wallet address" />);

		await user.click(
			screen.getByRole('button', { name: /copy wallet address/i })
		);

		expect(
			screen.getByRole('button', { name: /wallet address copied/i })
		).toBeInTheDocument();
	});
});

describe('CopyField copy confirmation timing (#600)', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it('shows Copied confirmation immediately after click', async () => {
		render(<CopyField value={FULL_ADDRESS} label="Wallet address" />);

		await act(async () => {
			fireEvent.click(
				screen.getByRole('button', { name: /copy wallet address/i })
			);
		});

		expect(
			screen.getByRole('button', { name: /wallet address copied/i })
		).toBeInTheDocument();
	});

	it('keeps Copied confirmation visible at 1999ms', async () => {
		render(<CopyField value={FULL_ADDRESS} label="Wallet address" />);

		await act(async () => {
			fireEvent.click(
				screen.getByRole('button', { name: /copy wallet address/i })
			);
		});

		act(() => {
			vi.advanceTimersByTime(1999);
		});

		expect(
			screen.getByRole('button', { name: /wallet address copied/i })
		).toBeInTheDocument();
	});

	it('reverts button to icon state at 2000ms', async () => {
		render(<CopyField value={FULL_ADDRESS} label="Wallet address" />);

		await act(async () => {
			fireEvent.click(
				screen.getByRole('button', { name: /copy wallet address/i })
			);
		});

		act(() => {
			vi.advanceTimersByTime(2000);
		});

		expect(
			screen.getByRole('button', { name: /copy wallet address/i })
		).toBeInTheDocument();
		expect(
			screen.queryByRole('button', { name: /wallet address copied/i })
		).not.toBeInTheDocument();
	});

	it('resets confirmation on second click after timeout', async () => {
		render(<CopyField value={FULL_ADDRESS} label="Wallet address" />);

		// First click — confirmation appears
		await act(async () => {
			fireEvent.click(
				screen.getByRole('button', { name: /copy wallet address/i })
			);
		});

		expect(
			screen.getByRole('button', { name: /wallet address copied/i })
		).toBeInTheDocument();

		// Advance past the 2000ms timeout so the button reverts
		act(() => {
			vi.advanceTimersByTime(2000);
		});

		expect(
			screen.getByRole('button', { name: /copy wallet address/i })
		).toBeInTheDocument();

		// Second click — confirmation resets and appears again
		await act(async () => {
			fireEvent.click(
				screen.getByRole('button', { name: /copy wallet address/i })
			);
		});

		expect(
			screen.getByRole('button', { name: /wallet address copied/i })
		).toBeInTheDocument();
	});
});
