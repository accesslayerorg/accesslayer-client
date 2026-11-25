import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import RetirementExitPanel from '@/components/common/RetirementExitPanel';

describe('RetirementExitPanel', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	it('estimates market proceeds and passes the selected amount to the sell flow', () => {
		const onReviewSell = vi.fn();

		render(
			<RetirementExitPanel
				holdingsCount={5}
				marketPriceStroops={2_500_000}
				currentSupply={100}
				onReviewSell={onReviewSell}
			/>
		);

		const amountInput = screen.getByTestId('retirement-sell-quantity');
		fireEvent.change(amountInput, { target: { value: '2' } });

		expect(screen.getByTestId('retirement-sell-estimate')).toHaveTextContent(
			'0.50 XLM'
		);
		fireEvent.click(screen.getByTestId('retirement-review-sell-button'));
		expect(onReviewSell).toHaveBeenCalledWith(2);
	});

	it('disables review when the requested amount exceeds the holder balance', () => {
		render(
			<RetirementExitPanel
				holdingsCount={2}
				marketPriceStroops={2_500_000}
				currentSupply={100}
				onReviewSell={vi.fn()}
			/>
		);

		fireEvent.change(screen.getByTestId('retirement-sell-quantity'), {
			target: { value: '3' },
		});

		expect(
			screen.getByTestId('retirement-review-sell-button')
		).toBeDisabled();
	});

	it('removes the sell panel when the notice deadline passes', () => {
		vi.useFakeTimers();
		const noticeExpiresAt = new Date(Date.now() + 1_000).toISOString();

		render(
			<RetirementExitPanel
				holdingsCount={2}
				marketPriceStroops={2_500_000}
				currentSupply={100}
				noticeExpiresAt={noticeExpiresAt}
				onReviewSell={vi.fn()}
			/>
		);

		expect(
			screen.getByTestId('retirement-voluntary-exit-panel')
		).toBeInTheDocument();

		act(() => {
			vi.advanceTimersByTime(1_100);
		});

		expect(
			screen.queryByTestId('retirement-voluntary-exit-panel')
		).not.toBeInTheDocument();
	});
});
