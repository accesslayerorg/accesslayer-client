import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import RecoveryCodesGate from '../RecoveryCodesGate';

vi.mock('@/utils/toast.util', () => ({
	default: { success: vi.fn(), error: vi.fn() },
}));

describe('RecoveryCodesGate', () => {
	it('blocks close actions until copy, download, or confirmation is used', async () => {
		const user = userEvent.setup();
		const onDismiss = vi.fn();
		render(<RecoveryCodesGate codes={['AAAA-BBBB']} onDismiss={onDismiss} />);

		fireEvent.keyDown(document, { key: 'Escape' });
		expect(onDismiss).not.toHaveBeenCalled();
		expect(screen.queryByRole('button', { name: 'I saved these codes' })).toBeDisabled();

		Object.defineProperty(navigator, 'clipboard', {
			configurable: true,
			value: { writeText: vi.fn().mockResolvedValue(undefined) },
		});
		await user.click(screen.getByRole('button', { name: 'Copy codes' }));
		await user.click(screen.getByRole('button', { name: 'I saved these codes' }));
		expect(onDismiss).toHaveBeenCalledOnce();
	});

	it('download counts as saved', async () => {
		const user = userEvent.setup();
		const onDismiss = vi.fn();
		render(<RecoveryCodesGate codes={['AAAA-BBBB']} onDismiss={onDismiss} />);
		URL.createObjectURL = vi.fn(() => 'blob:test');
		URL.revokeObjectURL = vi.fn();
		await user.click(screen.getByRole('button', { name: 'Download' }));
		expect(screen.getByRole('button', { name: 'I saved these codes' })).toBeEnabled();
	});
});
