import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import BundleCreateForm from '@/components/common/BundleCreateForm';
import type { BundleKeyOption } from '@/utils/bundle.utils';

const DAY_MS = 86_400_000;

const KEYS: BundleKeyOption[] = [
	{ id: 'key-a', title: 'Alpha Key', priceXlm: 10 },
	{ id: 'key-b', title: 'Beta Key', priceXlm: 5 },
];

function setup(
	props: Partial<React.ComponentProps<typeof BundleCreateForm>> = {}
) {
	const onSubmit = vi.fn();
	render(
		<BundleCreateForm availableKeys={KEYS} onSubmit={onSubmit} {...props} />
	);
	return { onSubmit };
}

/** Selects a key in the picker and adds it as a line item. */
function addKey(keyId: string) {
	fireEvent.change(screen.getByTestId('bundle-key-select'), {
		target: { value: keyId },
	});
	fireEvent.click(screen.getByTestId('bundle-add-key'));
}

describe('BundleCreateForm', () => {
	it('adds the selected key with a default quantity of 1', () => {
		setup();
		addKey('key-a');

		expect(screen.getByTestId('bundle-line-key-a')).toBeInTheDocument();
		expect(
			(screen.getByTestId('bundle-line-quantity-key-a') as HTMLInputElement).value
		).toBe('1');
		expect(screen.getByTestId('bundle-list-price')).toHaveTextContent('10.00 XLM');
	});

	it('recomputes the list price from key price and quantity', () => {
		setup();
		addKey('key-a');
		fireEvent.change(screen.getByTestId('bundle-line-quantity-key-a'), {
			target: { value: '2' },
		});
		addKey('key-b');
		fireEvent.change(screen.getByTestId('bundle-line-quantity-key-b'), {
			target: { value: '3' },
		});

		// 2 x 10 XLM + 3 x 5 XLM
		expect(screen.getByTestId('bundle-list-price')).toHaveTextContent('35.00 XLM');
		expect(screen.getByTestId('bundle-price-floor')).toHaveTextContent(
			'Minimum bundle price 28.00 XLM'
		);
	});

	it('never offers a key that is already in the bundle', () => {
		setup();
		addKey('key-a');

		const select = screen.getByTestId(
			'bundle-key-select'
		) as HTMLSelectElement;
		const values = Array.from(select.options).map(option => option.value);
		expect(values).toEqual(['', 'key-b']);
	});

	it('removes a line item', () => {
		setup();
		addKey('key-a');
		fireEvent.click(screen.getByTestId('bundle-line-remove-key-a'));

		expect(screen.queryByTestId('bundle-line-key-a')).not.toBeInTheDocument();
		expect(screen.getByTestId('bundle-list-price')).toHaveTextContent('0.00 XLM');
	});

	it('blocks submission and shows errors when nothing is configured', () => {
		const { onSubmit } = setup();

		fireEvent.click(screen.getByTestId('bundle-submit'));

		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getByTestId('bundle-items-error')).toHaveTextContent(
			'Add at least one key to the bundle'
		);
		expect(screen.getByTestId('bundle-price-error')).toBeInTheDocument();
	});

	it('rejects a bundle price below the price floor', () => {
		const { onSubmit } = setup();
		addKey('key-a'); // list price 10 XLM -> floor 8 XLM

		fireEvent.change(screen.getByTestId('bundle-price-input'), {
			target: { value: '7.99' },
		});
		fireEvent.click(screen.getByTestId('bundle-submit'));

		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getByTestId('bundle-price-error')).toHaveTextContent(
			'Bundle price must be at least 8 XLM (20% off list)'
		);
	});

	it('rejects a bundle price that is not below the list price', () => {
		const { onSubmit } = setup();
		addKey('key-a');

		fireEvent.change(screen.getByTestId('bundle-price-input'), {
			target: { value: '10' },
		});
		fireEvent.click(screen.getByTestId('bundle-submit'));

		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getByTestId('bundle-price-error')).toHaveTextContent(
			'Bundle price must be below the 10 XLM list price'
		);
	});

	it('rejects an expiry outside the supported window', () => {
		const { onSubmit } = setup();
		addKey('key-a');
		fireEvent.change(screen.getByTestId('bundle-price-input'), {
			target: { value: '8' },
		});
		fireEvent.change(screen.getByTestId('bundle-expiry-input'), {
			target: { value: '0' },
		});
		fireEvent.click(screen.getByTestId('bundle-submit'));

		expect(onSubmit).not.toHaveBeenCalled();
		expect(screen.getByTestId('bundle-expiry-error')).toHaveTextContent(
			'Bundle expiry must be at least 1 day'
		);
	});

	it('submits items, discounted price and an absolute expiry when valid', () => {
		const { onSubmit } = setup();
		addKey('key-a');
		fireEvent.change(screen.getByTestId('bundle-line-quantity-key-a'), {
			target: { value: '3' },
		});
		fireEvent.change(screen.getByTestId('bundle-price-input'), {
			target: { value: '24' },
		});
		fireEvent.change(screen.getByTestId('bundle-expiry-input'), {
			target: { value: '14' },
		});

		fireEvent.click(screen.getByTestId('bundle-submit'));

		expect(onSubmit).toHaveBeenCalledTimes(1);
		const request = onSubmit.mock.calls[0][0];
		expect(request.items).toEqual([{ keyId: 'key-a', quantity: 3 }]);
		expect(request.discountPriceXlm).toBe(24);

		const expiryMs = Date.parse(request.expiresAt);
		expect(Number.isNaN(expiryMs)).toBe(false);
		expect(expiryMs - Date.now()).toBeGreaterThan(13 * DAY_MS);
		expect(expiryMs - Date.now()).toBeLessThanOrEqual(14 * DAY_MS);
	});

	it('shows the buyer savings for a valid discount', () => {
		setup();
		addKey('key-a');
		fireEvent.change(screen.getByTestId('bundle-price-input'), {
			target: { value: '7.5' },
		});

		expect(screen.getByTestId('bundle-savings')).toHaveTextContent('25% (2.50 XLM)');
	});

	it('shows no savings before a price is entered', () => {
		setup();
		addKey('key-a');
		expect(screen.getByTestId('bundle-savings')).toHaveTextContent('—');
	});

	it('clears the draft when the parent signals a successful creation', () => {
		const onSubmit = vi.fn();
		const { rerender } = render(
			<BundleCreateForm availableKeys={KEYS} onSubmit={onSubmit} resetSignal={0} />
		);
		addKey('key-a');
		fireEvent.change(screen.getByTestId('bundle-price-input'), {
			target: { value: '8' },
		});

		rerender(
			<BundleCreateForm availableKeys={KEYS} onSubmit={onSubmit} resetSignal={1} />
		);

		expect(screen.queryByTestId('bundle-line-key-a')).not.toBeInTheDocument();
		expect((screen.getByTestId('bundle-price-input') as HTMLInputElement).value).toBe(
			''
		);
	});

	it('disables the picker and the submit button while submitting', () => {
		setup({ isSubmitting: true });

		expect(screen.getByTestId('bundle-key-select')).toBeDisabled();
		expect(screen.getByTestId('bundle-add-key')).toBeDisabled();
		expect(screen.getByTestId('bundle-submit')).toBeDisabled();
	});
});
