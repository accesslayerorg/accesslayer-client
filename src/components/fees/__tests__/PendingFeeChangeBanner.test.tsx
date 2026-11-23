import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import FeeImpactPreview from '@/components/fees/FeeImpactPreview';
import PendingFeeChangeBanner from '@/components/fees/PendingFeeChangeBanner';
import { useFeeChangeStore } from '@/hooks/useFeeChange';
import {
	queueFeeChange,
	resetFeeChangeStore,
} from '@/services/feeChange.service';

describe('pending fee change UI', () => {
	beforeEach(() => {
		resetFeeChangeStore();
		useFeeChangeStore.getState().refresh();
	});

	afterEach(() => {
		resetFeeChangeStore();
		useFeeChangeStore.getState().refresh();
	});

	it('shows current, queued and ETA to every user while pending', () => {
		act(() => {
			queueFeeChange({
				queuedFeeBps: 750,
				eta: new Date(Date.now() + 3_600_000).toISOString(),
			});
			useFeeChangeStore.getState().refresh();
		});

		render(<PendingFeeChangeBanner />);
		expect(screen.getByTestId('pending-fee-change-banner')).toBeTruthy();
		expect(screen.getByTestId('fee-change-current').textContent).toContain(
			'5%'
		);
		expect(screen.getByTestId('fee-change-queued').textContent).toContain(
			'7.5%'
		);
		expect(screen.getByTestId('fee-change-eta').textContent).toMatch(
			/Executes in/
		);

		act(() => useFeeChangeStore.getState().cancel());
		expect(screen.queryByTestId('pending-fee-change-banner')).toBeNull();
	});

	it('previews the queued fee on a trade confirmation', () => {
		act(() => {
			queueFeeChange({
				queuedFeeBps: 700,
				eta: new Date(Date.now() + 3_600_000).toISOString(),
			});
			useFeeChangeStore.getState().refresh();
		});

		render(
			<FeeImpactPreview
				pending={useFeeChangeStore.getState().state}
				totalStroops={10_000_000}
			/>
		);

		expect(
			screen.getByTestId('fee-impact-current-rate').textContent
		).toContain('5%');
		expect(
			screen.getByTestId('fee-impact-queued-rate').textContent
		).toContain('7%');
		expect(screen.getByTestId('fee-impact-fees').textContent).toContain(
			'0.07 XLM'
		);
		expect(screen.getByTestId('fee-impact-delta').textContent).toContain(
			'0.02 XLM'
		);
	});
});
