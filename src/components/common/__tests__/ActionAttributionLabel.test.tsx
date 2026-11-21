import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ActionAttributionLabel from '@/components/common/ActionAttributionLabel';
import { copyTextToClipboard } from '@/utils/clipboard.utils';

vi.mock('@/utils/clipboard.utils', () => ({
	copyTextToClipboard: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@/utils/toast.util', () => ({
	default: { success: vi.fn(), error: vi.fn() },
}));

const WALLET = 'GBZXN7PIRZGNMHGA7MUUUF4GWPY5AYPV6LY4UV2GL6VJGIQRXFDNMADI';

describe('ActionAttributionLabel', () => {
	it('shows a Creator label for primary creator actions', () => {
		render(
			<ActionAttributionLabel
				attribution={{ wallet: WALLET, role: 'creator' }}
				prefix="Posted by"
			/>
		);
		expect(screen.getByText('Posted by')).toBeInTheDocument();
		expect(screen.getByTestId('action-attribution-role')).toHaveTextContent('Creator');
		expect(screen.getByTestId('action-attribution-wallet')).toHaveTextContent('GBZX…MADI');
	});

	it('shows the role badge for co-creator actions', () => {
		render(<ActionAttributionLabel attribution={{ wallet: WALLET, role: 'Revenue' }} />);
		expect(screen.getByTestId('action-attribution')).toHaveAttribute('data-role', 'Revenue');
		expect(screen.getByTestId('action-attribution-role')).toHaveTextContent('Revenue');
	});

	it('reveals the full address and copies it', async () => {
		const user = userEvent.setup();
		render(<ActionAttributionLabel attribution={{ wallet: WALLET, role: 'Admin' }} />);

		await user.click(screen.getByTestId('action-attribution-wallet'));
		expect(await screen.findByTestId('action-attribution-full-address')).toHaveTextContent(
			WALLET
		);
		expect(screen.getByText('Admin co-creator wallet')).toBeInTheDocument();

		await user.click(screen.getByTestId('action-attribution-copy'));
		expect(copyTextToClipboard).toHaveBeenCalledWith(WALLET);
		await waitFor(() =>
			expect(screen.getByTestId('action-attribution-copy')).toHaveAttribute(
				'aria-label',
				'Address copied'
			)
		);
	});
});
