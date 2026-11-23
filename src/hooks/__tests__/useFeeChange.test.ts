import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
	getFeeChangeState,
	getPendingFeeChange,
	queueFeeChange,
	resetFeeChangeStore,
} from '@/services/feeChange.service';
import { useFeeChangeStore, usePendingFeeChange } from '@/hooks/useFeeChange';

const futureEta = () => new Date(Date.now() + 3_600_000).toISOString();

describe('pending fee changes (#1442)', () => {
	beforeEach(() => {
		resetFeeChangeStore();
		useFeeChangeStore.getState().refresh();
	});

	afterEach(() => {
		resetFeeChangeStore();
		useFeeChangeStore.getState().refresh();
	});

	it('starts with no pending change', () => {
		expect(getFeeChangeState().status).toBe('none');
		expect(getPendingFeeChange()).toBeNull();

		const { result } = renderHook(() => usePendingFeeChange());
		expect(result.current).toBeNull();
	});

	it('exposes current value, queued value and ETA while pending', () => {
		const queued = queueFeeChange({
			queuedFeeBps: 725,
			eta: futureEta(),
		});
		act(() => useFeeChangeStore.getState().refresh());

		const { result } = renderHook(() => usePendingFeeChange());
		expect(result.current?.status).toBe('pending');
		expect(result.current?.currentFeeBps).toBe(500);
		expect(result.current?.queuedFeeBps).toBe(725);
		expect(result.current?.eta).toBe(queued.eta);
	});

	it('keeps the history on cancel and clears the pending banner', () => {
		queueFeeChange({ queuedFeeBps: 650, eta: futureEta() });
		act(() => useFeeChangeStore.getState().cancel());

		const state = getFeeChangeState();
		expect(state.status).toBe('cancelled');
		expect(state.currentFeeBps).toBe(500);
		expect(state.cancelledAt).toBeDefined();
		expect(getPendingFeeChange()).toBeNull();

		const { result } = renderHook(() => usePendingFeeChange());
		expect(result.current).toBeNull();
	});

	it('applies the queued value on execution', () => {
		queueFeeChange({ queuedFeeBps: 800, eta: futureEta() });
		act(() => useFeeChangeStore.getState().execute());

		const state = getFeeChangeState();
		expect(state.status).toBe('executed');
		expect(state.currentFeeBps).toBe(800);
		expect(state.executedAt).toBeDefined();
		expect(getPendingFeeChange()).toBeNull();
	});

	it('rejects out-of-bounds fees and past ETAs', () => {
		expect(() =>
			queueFeeChange({
				queuedFeeBps: 2000,
				eta: futureEta(),
			})
		).toThrowError(/between/);
		expect(() =>
			queueFeeChange({
				queuedFeeBps: 600,
				eta: new Date(Date.now() - 60_000).toISOString(),
			})
		).toThrowError(/future/);
		expect(getPendingFeeChange()).toBeNull();
	});
});
