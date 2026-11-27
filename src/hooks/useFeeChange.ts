import { create } from 'zustand';
import {
	cancelFeeChange,
	executeFeeChange,
	getFeeChangeState,
	queueFeeChange,
	resetFeeChangeStore,
	type FeeChangeState,
	type QueueFeeChangeInput,
} from '@/services/feeChange.service';

interface FeeChangeStore {
	state: FeeChangeState;
	refresh: () => void;
	queue: (input: QueueFeeChangeInput) => FeeChangeState;
	cancel: () => FeeChangeState;
	execute: () => FeeChangeState;
	reset: () => void;
}

export const useFeeChangeStore = create<FeeChangeStore>(set => ({
	state: getFeeChangeState(),
	refresh: () => set({ state: getFeeChangeState() }),
	queue: input => {
		const state = queueFeeChange(input);
		set({ state });
		return state;
	},
	cancel: () => {
		const state = cancelFeeChange();
		set({ state });
		return state;
	},
	execute: () => {
		const state = executeFeeChange();
		set({ state });
		return state;
	},
	reset: () => {
		resetFeeChangeStore();
		set({ state: getFeeChangeState() });
	},
}));

export function usePendingFeeChange(): FeeChangeState | null {
	const state = useFeeChangeStore(store => store.state);
	return state.status === 'pending' ? state : null;
}
