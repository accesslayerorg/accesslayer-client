import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddToBundleButton from '../AddToBundleButton';
import { useBundleCartStore } from '@/hooks/useBundleCartStore';

vi.mock('@/utils/toast.util', () => ({
	default: {
		success: vi.fn(),
		error: vi.fn(),
		loading: vi.fn(),
		message: vi.fn(),
	},
}));

describe('AddToBundleButton (#1118)', () => {
	beforeEach(() => {
		window.sessionStorage.clear();
		useBundleCartStore.setState({ items: [] });
	});

	it('adds the key to the bundle cart on click', async () => {
		const user = userEvent.setup();
		render(
			<AddToBundleButton
				keyId="key-1"
				keyName="Alpha Key"
				priceStroops={1_000_000}
			/>
		);

		const button = screen.getByTestId('add-to-bundle-button');
		expect(button).toHaveTextContent('Add to Bundle');
		expect(button).toHaveAttribute('aria-pressed', 'false');

		await user.click(button);

		expect(useBundleCartStore.getState().items).toEqual([
			expect.objectContaining({ keyId: 'key-1', quantity: 1 }),
		]);
		expect(screen.getByTestId('add-to-bundle-button')).toHaveTextContent(
			'In Bundle'
		);
		expect(screen.getByTestId('add-to-bundle-button')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	it('removes the key from the cart when clicked again', async () => {
		const user = userEvent.setup();
		render(
			<AddToBundleButton
				keyId="key-1"
				keyName="Alpha Key"
				priceStroops={1_000_000}
			/>
		);

		await user.click(screen.getByTestId('add-to-bundle-button'));
		await user.click(screen.getByTestId('add-to-bundle-button'));

		expect(useBundleCartStore.getState().items).toEqual([]);
		expect(screen.getByTestId('add-to-bundle-button')).toHaveTextContent(
			'Add to Bundle'
		);
	});

	it('reflects cart state owned elsewhere', () => {
		useBundleCartStore.setState({
			items: [
				{
					keyId: 'key-1',
					keyName: 'Alpha Key',
					priceStroops: 1_000_000,
					quantity: 1,
				},
			],
		});

		render(
			<AddToBundleButton
				keyId="key-1"
				keyName="Alpha Key"
				priceStroops={1_000_000}
			/>
		);

		expect(screen.getByTestId('add-to-bundle-button')).toHaveTextContent(
			'In Bundle'
		);
	});

	it('stays disabled with an explanatory tooltip when disabled', async () => {
		const user = userEvent.setup();
		render(
			<AddToBundleButton
				keyId="key-1"
				keyName="Alpha Key"
				priceStroops={1_000_000}
				disabled
				disabledReason="Trading is frozen for this key"
			/>
		);

		const button = screen.getByTestId('add-to-bundle-button');
		expect(button).toBeDisabled();

		// Clicking must not queue the key.
		await user.click(button);
		expect(useBundleCartStore.getState().items).toEqual([]);

		// The tooltip carries the reason.
		await user.hover(button);
		expect(screen.getByRole('tooltip')).toHaveTextContent(
			'Trading is frozen for this key'
		);
	});
});
