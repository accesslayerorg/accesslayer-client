import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import CopyField from '../CopyField';

const FULL_ADDRESS = 'GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWNA';

describe('CopyField — clipboard integration', () => {
	beforeEach(() => {
		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn().mockResolvedValue(undefined),
			},
		});
	});

	it('copies the full unmasked wallet address to the clipboard', async () => {
		const user = userEvent.setup();
		render(<CopyField value={FULL_ADDRESS} label="Wallet address" />);

		await user.click(screen.getByRole('button', { name: /copy wallet address/i }));

		expect(navigator.clipboard.writeText).toHaveBeenCalledOnce();
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith(FULL_ADDRESS);
	});

	it('does not copy a shortened or ellipsis form of the address', async () => {
		const user = userEvent.setup();
		render(<CopyField value={FULL_ADDRESS} label="Wallet address" />);

		await user.click(screen.getByRole('button', { name: /copy wallet address/i }));

		const copied = (navigator.clipboard.writeText as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
		expect(copied).not.toContain('...');
		expect(copied).toBe(FULL_ADDRESS);
	});

	it('passes the full value through the input display field', () => {
		render(<CopyField value={FULL_ADDRESS} label="Wallet address" />);
		const input = screen.getByRole('textbox', { name: /wallet address/i });
		expect((input as HTMLInputElement).value).toBe(FULL_ADDRESS);
	});
});
