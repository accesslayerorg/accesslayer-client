import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import QuickAmountButtons from '../QuickAmountButtons';

describe('QuickAmountButtons', () => {
	it('clicking 50% on a 10-key balance selects 5', () => {
		const onSelect = vi.fn();
		render(
			<QuickAmountButtons
				balance={10}
				mode="sell"
				isConnected
				onSelect={onSelect}
			/>
		);
		fireEvent.click(screen.getByTestId('quick-amount-sell-50'));
		expect(onSelect).toHaveBeenCalledWith(5);
	});

	it('clicking 25% on a 10-key balance selects 2', () => {
		const onSelect = vi.fn();
		render(
			<QuickAmountButtons
				balance={10}
				mode="sell"
				isConnected
				onSelect={onSelect}
			/>
		);
		fireEvent.click(screen.getByTestId('quick-amount-sell-25'));
		expect(onSelect).toHaveBeenCalledWith(2);
	});

	it('clicking 75% on a 10-key balance selects 7', () => {
		const onSelect = vi.fn();
		render(
			<QuickAmountButtons
				balance={10}
				mode="sell"
				isConnected
				onSelect={onSelect}
			/>
		);
		fireEvent.click(screen.getByTestId('quick-amount-sell-75'));
		expect(onSelect).toHaveBeenCalledWith(7);
	});

	it('clicking Max selects the whole balance', () => {
		const onSelect = vi.fn();
		render(
			<QuickAmountButtons
				balance={10}
				mode="sell"
				isConnected
				onSelect={onSelect}
			/>
		);
		fireEvent.click(screen.getByTestId('quick-amount-max'));
		expect(onSelect).toHaveBeenCalledWith(10);
	});

	it('disables all buttons when the balance is zero', () => {
		const onSelect = vi.fn();
		render(
			<QuickAmountButtons
				balance={0}
				mode="sell"
				isConnected
				onSelect={onSelect}
			/>
		);
		expect(screen.getByTestId('quick-amount-sell-25')).toBeDisabled();
		expect(screen.getByTestId('quick-amount-sell-50')).toBeDisabled();
		expect(screen.getByTestId('quick-amount-sell-75')).toBeDisabled();
		expect(screen.getByTestId('quick-amount-max')).toBeDisabled();
		expect(onSelect).not.toHaveBeenCalled();
	});

	it('disables all buttons when the wallet is disconnected', () => {
		const onSelect = vi.fn();
		render(
			<QuickAmountButtons
				balance={10}
				mode="sell"
				isConnected={false}
				onSelect={onSelect}
			/>
		);
		expect(screen.getByTestId('quick-amount-sell-50')).toBeDisabled();
		expect(screen.getByTestId('quick-amount-max')).toBeDisabled();
		fireEvent.click(screen.getByTestId('quick-amount-max'));
		expect(onSelect).not.toHaveBeenCalled();
	});

	it('renders only a Max button in buy mode', () => {
		const onSelect = vi.fn();
		render(
			<QuickAmountButtons
				balance={10}
				mode="buy"
				isConnected
				onSelect={onSelect}
			/>
		);
		expect(
			screen.queryByTestId('quick-amount-sell-25')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('quick-amount-sell-50')
		).not.toBeInTheDocument();
		expect(
			screen.queryByTestId('quick-amount-sell-75')
		).not.toBeInTheDocument();
		expect(screen.getByTestId('quick-amount-max')).toBeInTheDocument();
	});

	it('highlights the button matching the active quantity', () => {
		const onSelect = vi.fn();
		render(
			<QuickAmountButtons
				balance={10}
				mode="sell"
				isConnected
				activeValue={5}
				onSelect={onSelect}
			/>
		);
		expect(screen.getByTestId('quick-amount-sell-50')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(screen.getByTestId('quick-amount-max')).toHaveAttribute(
			'aria-pressed',
			'false'
		);
	});

	it('highlights the percent button whose computed amount matches the active quantity', () => {
		const onSelect = vi.fn();
		render(
			<QuickAmountButtons
				balance={10}
				mode="sell"
				isConnected
				activeValue={2}
				onSelect={onSelect}
			/>
		);
		// 25% of 10 is 2, so the 25% button is active
		expect(screen.getByTestId('quick-amount-sell-25')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		expect(screen.getByTestId('quick-amount-sell-50')).toHaveAttribute(
			'aria-pressed',
			'false'
		);
		expect(screen.getByTestId('quick-amount-max')).toHaveAttribute(
			'aria-pressed',
			'false'
		);
	});

	it('highlights Max when the active quantity equals the whole balance', () => {
		const onSelect = vi.fn();
		render(
			<QuickAmountButtons
				balance={10}
				mode="sell"
				isConnected
				activeValue={10}
				onSelect={onSelect}
			/>
		);
		expect(screen.getByTestId('quick-amount-max')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});

	it('active state follows manual edits via activeValue', () => {
		const onSelect = vi.fn();
		const { rerender } = render(
			<QuickAmountButtons
				balance={10}
				mode="sell"
				isConnected
				activeValue={7}
				onSelect={onSelect}
			/>
		);
		expect(screen.getByTestId('quick-amount-sell-75')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
		rerender(
			<QuickAmountButtons
				balance={10}
				mode="sell"
				isConnected
				activeValue={2}
				onSelect={onSelect}
			/>
		);
		expect(screen.getByTestId('quick-amount-sell-75')).toHaveAttribute(
			'aria-pressed',
			'false'
		);
		expect(screen.getByTestId('quick-amount-sell-25')).toHaveAttribute(
			'aria-pressed',
			'true'
		);
	});
});
